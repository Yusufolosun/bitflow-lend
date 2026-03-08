#!/bin/bash
# Contract Monitoring Script for BitFlow Lend
# Monitors on-chain contract state and alerts on anomalies
#
# Usage: ./scripts/monitor-contract.sh [--network mainnet|testnet] [--watch] [--interval 60]
#
# Requires: curl
# Optional: jq (for JSON parsing)

set -e

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
NETWORK="mainnet"
WATCH_MODE=false
INTERVAL=60
CONTRACT_NAME="bitflow-vault-core"
DEPLOYER_ADDRESS=""  # Set after deployment
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/monitor-$(date +%Y%m%d).log"

# Stacks API endpoints
MAINNET_API="https://api.hiro.so"
TESTNET_API="https://api.testnet.hiro.so"

# Alert thresholds
MAX_PENDING_TX=10
BLOCK_STALENESS_MINUTES=30

# Parse arguments
while [ $# -gt 0 ]; do
    case $1 in
        --network)
            NETWORK="$2"
            shift 2
            ;;
        --network=*)
            NETWORK="${1#*=}"
            shift
            ;;
        --watch)
            WATCH_MODE=true
            shift
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        --interval=*)
            INTERVAL="${1#*=}"
            shift
            ;;
        --help)
            echo "Usage: ./scripts/monitor-contract.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --network <net>    Network: mainnet, testnet (default: mainnet)"
            echo "  --watch            Continuous monitoring mode"
            echo "  --interval <sec>   Polling interval in seconds (default: 60)"
            echo "  --help             Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Set API URL
case $NETWORK in
    mainnet) API_URL="$MAINNET_API" ;;
    testnet) API_URL="$TESTNET_API" ;;
    *) echo "❌ Unknown network: $NETWORK"; exit 1 ;;
esac

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# ──────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log() {
    local msg="[$(timestamp)] $1"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
}

alert() {
    local msg="[$(timestamp)] 🚨 ALERT: $1"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
    # Add additional alert mechanisms here:
    # - Send webhook notification
    # - Email alert
    # - Slack/Discord message
}

api_get() {
    curl -s --max-time 15 "$API_URL$1" 2>/dev/null || echo '{"error": "request_failed"}'
}

# ──────────────────────────────────────────────
# Monitoring functions
# ──────────────────────────────────────────────

check_chain_status() {
    log "📡 Checking chain status..."

    local info
    info=$(api_get "/v2/info")

    if echo "$info" | grep -q "error"; then
        alert "Cannot reach Stacks API at $API_URL"
        return 1
    fi

    # Extract block height
    local block_height
    block_height=$(echo "$info" | grep -o '"stacks_tip_height":[0-9]*' | grep -o '[0-9]*' || echo "0")

    log "  Block height: $block_height"

    # Check if chain is progressing (compare with last known height)
    local last_height_file="$LOG_DIR/.last_block_height_$NETWORK"
    if [ -f "$last_height_file" ]; then
        local last_height
        last_height=$(cat "$last_height_file")
        if [ "$block_height" = "$last_height" ]; then
            log "  ⚠️  Block height unchanged since last check ($block_height)"
        else
            local diff=$((block_height - last_height))
            log "  ✅ Chain progressed +$diff blocks"
        fi
    fi
    echo "$block_height" > "$last_height_file"

    return 0
}

check_contract_status() {
    log "📜 Checking contract status..."

    if [ -z "$DEPLOYER_ADDRESS" ]; then
        log "  ⚠️  Deployer address not set — skipping contract checks"
        log "  ℹ️  Set DEPLOYER_ADDRESS in the script after deployment"
        return 0
    fi

    local contract_id="$DEPLOYER_ADDRESS.$CONTRACT_NAME"

    # Check contract exists
    local source_response
    source_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/v2/contracts/source/$DEPLOYER_ADDRESS/$CONTRACT_NAME" 2>/dev/null || echo "000")

    if [ "$source_response" = "200" ]; then
        log "  ✅ Contract accessible: $contract_id"
    else
        alert "Contract not accessible: $contract_id (HTTP $source_response)"
        return 1
    fi

    # Check read-only function: get-protocol-stats
    local stats
    stats=$(curl -s --max-time 10 \
        -X POST "$API_URL/v2/contracts/call-read/$DEPLOYER_ADDRESS/$CONTRACT_NAME/get-protocol-stats" \
        -H "Content-Type: application/json" \
        -d '{"sender":"'$DEPLOYER_ADDRESS'","arguments":[]}' 2>/dev/null || echo '{"error":"failed"}')

    if echo "$stats" | grep -q "error"; then
        log "  ⚠️  Could not read protocol stats"
    else
        log "  ✅ Protocol stats readable"
    fi

    # Check recent transactions
    local txs
    txs=$(api_get "/extended/v1/address/$DEPLOYER_ADDRESS.$CONTRACT_NAME/transactions?limit=5")

    if echo "$txs" | grep -q '"total"'; then
        local total_tx
        total_tx=$(echo "$txs" | grep -o '"total":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
        log "  📊 Total contract transactions: $total_tx"
    fi

    return 0
}

check_mempool() {
    log "📬 Checking mempool..."

    if [ -z "$DEPLOYER_ADDRESS" ]; then
        log "  ⚠️  Deployer address not set — skipping mempool checks"
        return 0
    fi

    local mempool
    mempool=$(api_get "/extended/v1/tx/mempool?sender_address=$DEPLOYER_ADDRESS&limit=50")

    if echo "$mempool" | grep -q '"total"'; then
        local pending
        pending=$(echo "$mempool" | grep -o '"total":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
        log "  Pending transactions: $pending"

        if [ "$pending" -gt "$MAX_PENDING_TX" ]; then
            alert "High number of pending transactions: $pending (threshold: $MAX_PENDING_TX)"
        fi
    fi

    return 0
}

check_local_repo() {
    log "🔧 Checking local repository..."

    # Uncommitted changes
    local changes
    changes=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [ "$changes" -gt 0 ]; then
        log "  ⚠️  $changes uncommitted changes in repository"
    else
        log "  ✅ Working directory clean"
    fi

    # Check if ahead/behind origin
    local ahead behind
    ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
    behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")

    if [ "$ahead" -gt 0 ]; then
        log "  ℹ️  $ahead commits ahead of origin/main"
    fi
    if [ "$behind" -gt 0 ]; then
        log "  ⚠️  $behind commits behind origin/main"
    fi

    return 0
}

# ──────────────────────────────────────────────
# Main execution
# ──────────────────────────────────────────────

run_checks() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "🔍 BitFlow Lend Contract Monitor"
    log "   Network: $NETWORK | API: $API_URL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    check_chain_status
    echo ""
    check_contract_status
    echo ""
    check_mempool
    echo ""
    check_local_repo

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "✅ Monitoring cycle complete"
    log "   Log: $LOG_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

if [ "$WATCH_MODE" = true ]; then
    log "👀 Starting continuous monitoring (interval: ${INTERVAL}s)"
    log "   Press Ctrl+C to stop"
    echo ""

    trap 'echo ""; log "Monitoring stopped"; exit 0' INT TERM

    while true; do
        run_checks
        echo ""
        log "⏳ Next check in ${INTERVAL}s..."
        sleep "$INTERVAL"
    done
else
    run_checks
fi
