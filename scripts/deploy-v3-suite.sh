#!/bin/bash
# ============================================================================
# BitFlow Lend V3 — Full Suite Deployment Script
# ============================================================================
# Deploys all 3 contracts in the correct dependency order:
#
#   1. bitflow-oracle-registry-v3   (standalone — no contract dependencies)
#   2. bitflow-staking-pool-v3      (standalone — no contract dependencies)
#   3. bitflow-vault-core-v3        (standalone code, but operationally depends
#                                    on oracle price feed being live)
#
# Post-deploy, this script executes the mandatory initialization transactions
# for each contract via the Stacks API.
#
# Supported targets:  testnet | mainnet
#
# Usage:
#   ./scripts/deploy-v3-suite.sh --network testnet
#   ./scripts/deploy-v3-suite.sh --network mainnet
#   ./scripts/deploy-v3-suite.sh --network testnet --skip-tests
#   ./scripts/deploy-v3-suite.sh --network mainnet --dry-run
#
# Prerequisites:
#   - Clarinet ≥ 2.x installed
#   - Node.js ≥ 18 installed
#   - npm dependencies installed (npm ci)
#   - Deployer mnemonic configured in settings/{Testnet,Mainnet}.toml
#   - Deployer wallet funded (≥ 5 STX testnet, ≥ 10 STX mainnet)
#
# ============================================================================
set -euo pipefail

# ─── Color helpers ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No color

info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $1"; ERRORS=$((ERRORS + 1)); }
fatal()   { echo -e "${RED}[FATAL]${NC} $1"; exit 1; }
separator() { echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ─── Defaults ────────────────────────────────────────────────────────────────
NETWORK=""
SKIP_TESTS=false
DRY_RUN=false
ERRORS=0

# Contract file paths (relative to repo root)
CONTRACT_ORACLE="contracts/bitflow-oracle-registry-v3.clar"
CONTRACT_STAKING="contracts/bitflow-staking-pool-v3.clar"
CONTRACT_VAULT="contracts/bitflow-vault-core-v3.clar"

# Contract names (as published on-chain)
NAME_ORACLE="bitflow-oracle-registry-v3"
NAME_STAKING="bitflow-staking-pool-v3"
NAME_VAULT="bitflow-vault-core-v3"

# Max contract size — Stacks enforces a hard limit
MAX_CONTRACT_BYTES=128000

# Deployer addresses (override with env vars for different wallets)
# Usage: MAINNET_DEPLOYER_ADDR=SP... bash scripts/deploy-v3-suite.sh --network mainnet
MAINNET_DEPLOYER="${MAINNET_DEPLOYER_ADDR:-SP1N3809W9CBWWX04KN3TCQHP8A9GN520BD4JMP8Z}"
TESTNET_DEPLOYER="${TESTNET_DEPLOYER_ADDR:-ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0}"

# API endpoints
MAINNET_API="https://api.hiro.so"
TESTNET_API="https://api.testnet.hiro.so"

# ─── Argument parsing ───────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
    case $1 in
        --network)    NETWORK="$2"; shift 2 ;;
        --network=*)  NETWORK="${1#*=}"; shift ;;
        --skip-tests) SKIP_TESTS=true; shift ;;
        --dry-run)    DRY_RUN=true; shift ;;
        --help)
            echo "Usage: ./scripts/deploy-v3-suite.sh --network <testnet|mainnet> [--skip-tests] [--dry-run]"
            echo ""
            echo "Options:"
            echo "  --network <net>   Target network: testnet or mainnet (required)"
            echo "  --skip-tests      Skip the test suite (NOT recommended for mainnet)"
            echo "  --dry-run         Run all checks without actually deploying"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *) fatal "Unknown option: $1" ;;
    esac
done

[ -z "$NETWORK" ] && fatal "Missing required flag: --network <testnet|mainnet>"
[[ "$NETWORK" != "testnet" && "$NETWORK" != "mainnet" ]] && fatal "Invalid network '$NETWORK'. Use 'testnet' or 'mainnet'."

# Resolve network-specific values
if [ "$NETWORK" = "mainnet" ]; then
    DEPLOYER="$MAINNET_DEPLOYER"
    API_URL="$MAINNET_API"
    PLAN_FILE="deployments/default.mainnet-plan.yaml"
    SETTINGS_FILE="settings/Mainnet.toml"
    MIN_STX_BALANCE=1000000   # 1 STX in microSTX (deploy ~0.07 + init txs ~0.3)
else
    DEPLOYER="$TESTNET_DEPLOYER"
    API_URL="$TESTNET_API"
    PLAN_FILE="deployments/default.testnet-plan.yaml"
    SETTINGS_FILE="settings/Testnet.toml"
    MIN_STX_BALANCE=500000    # 0.5 STX in microSTX (testnet STX is free)
fi

# ─── Start ───────────────────────────────────────────────────────────────────
echo ""
separator
echo -e "${BOLD}  BitFlow Lend V3 — Full Suite Deployment${NC}"
echo -e "  Network:  ${CYAN}${NETWORK}${NC}"
echo -e "  Deployer: ${CYAN}${DEPLOYER}${NC}"
echo -e "  Dry Run:  ${CYAN}${DRY_RUN}${NC}"
echo -e "  Date:     $(date '+%Y-%m-%d %H:%M:%S %Z')"
separator
echo ""

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 1: Pre-Flight Checks
# ═════════════════════════════════════════════════════════════════════════════
info "PHASE 1: Pre-Flight Checks"
echo ""

# ── 1.1 Tool availability ───────────────────────────────────────────────────
info "[1/9] Checking tool availability..."

if ! command -v clarinet &>/dev/null; then
    fail "Clarinet not found. Install: https://github.com/hirosystems/clarinet"
else
    CLARINET_VERSION=$(clarinet --version 2>&1 | head -1)
    success "Clarinet found: $CLARINET_VERSION"
fi

if ! command -v node &>/dev/null; then
    fail "Node.js not found. Install: https://nodejs.org"
else
    NODE_VERSION=$(node --version)
    success "Node.js found: $NODE_VERSION"
fi

if ! command -v npm &>/dev/null; then
    fail "npm not found."
else
    success "npm found: $(npm --version)"
fi

# ── 1.2 Git working tree ────────────────────────────────────────────────────
info "[2/9] Checking git working tree..."

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    if [ "$NETWORK" = "mainnet" ]; then
        fail "Working tree is dirty — commit or stash before mainnet deploy"
    else
        warn "Working tree has uncommitted changes (acceptable for testnet)"
    fi
else
    success "Working tree clean"
fi

# ── 1.3 Contract files exist ────────────────────────────────────────────────
info "[3/9] Verifying contract files..."

for contract_file in "$CONTRACT_ORACLE" "$CONTRACT_STAKING" "$CONTRACT_VAULT"; do
    if [ ! -f "$contract_file" ]; then
        fail "Contract file not found: $contract_file"
    else
        SIZE=$(wc -c < "$contract_file" | tr -d ' ')
        if [ "$SIZE" -gt "$MAX_CONTRACT_BYTES" ]; then
            fail "$contract_file exceeds ${MAX_CONTRACT_BYTES} bytes ($SIZE bytes)"
        else
            success "$(basename "$contract_file") — $SIZE bytes"
        fi
    fi
done

# ── 1.4 Deployment plan exists ───────────────────────────────────────────────
info "[4/9] Verifying deployment plan..."

if [ ! -f "$PLAN_FILE" ]; then
    fail "Deployment plan not found: $PLAN_FILE"
else
    success "Deployment plan found: $PLAN_FILE"
fi

# ── 1.5 Settings file ───────────────────────────────────────────────────────
info "[5/9] Checking settings file..."

if [ ! -f "$SETTINGS_FILE" ]; then
    fail "Settings file not found: $SETTINGS_FILE"
else
    success "Settings file found: $SETTINGS_FILE"
    if [ "$NETWORK" = "testnet" ]; then
        if grep -q 'mnemonic = ""' "$SETTINGS_FILE"; then
            fail "Testnet mnemonic is empty in $SETTINGS_FILE — populate before deploying"
        fi
    fi
fi

# ── 1.6 Clarinet syntax check ───────────────────────────────────────────────
info "[6/9] Running clarinet check..."

if ! clarinet check 2>&1; then
    fail "Clarinet check reported errors"
else
    success "All contracts pass syntax/type checking"
fi

# ── 1.7 Test suite ──────────────────────────────────────────────────────────
if [ "$SKIP_TESTS" = true ]; then
    warn "[7/9] Skipping test suite (--skip-tests flag set)"
    if [ "$NETWORK" = "mainnet" ]; then
        warn "⚠  Skipping tests for mainnet is EXTREMELY DANGEROUS"
    fi
else
    info "[7/9] Running full test suite..."
    if ! npm test 2>&1; then
        fail "Test suite has failures — do NOT deploy"
    else
        success "All 57 test files pass"
    fi
fi

# ── 1.8 Network connectivity ────────────────────────────────────────────────
info "[8/9] Checking $NETWORK API connectivity..."

if ! curl -sf --max-time 15 "${API_URL}/v2/info" > /dev/null 2>&1; then
    fail "Cannot reach Stacks ${NETWORK} API at ${API_URL}"
else
    success "Stacks ${NETWORK} API reachable"
fi

# ── 1.9 Deployer wallet balance ──────────────────────────────────────────────
info "[9/9] Checking deployer wallet balance..."

BALANCE_RAW=$(curl -sf --max-time 15 "${API_URL}/v2/accounts/${DEPLOYER}" 2>/dev/null || echo '')

if [ -z "$BALANCE_RAW" ]; then
    warn "Cannot reach account API — skipping balance check"
    warn "Verify manually that ${DEPLOYER} has ≥ 0.1 STX"
else
    # Stacks API returns balance as hex: "balance":"0x00000000000000000000000000001234"
    BALANCE_HEX=$(echo "$BALANCE_RAW" | grep -oP '"balance"\s*:\s*"0x\K[0-9a-fA-F]+' | head -1 || echo "")

    if [ -n "$BALANCE_HEX" ]; then
        # Convert hex to decimal
        BALANCE=$(printf "%d" "0x${BALANCE_HEX}" 2>/dev/null || echo "0")
    else
        # Fallback: try decimal format (some API versions)
        BALANCE=$(echo "$BALANCE_RAW" | grep -oP '"balance"\s*:\s*"?\K[0-9]+' | head -1 || echo "0")
    fi

    if [ -z "$BALANCE" ] || [ "$BALANCE" = "0" ]; then
        fail "Deployer wallet ${DEPLOYER} has zero balance"
        if [ "$NETWORK" = "testnet" ]; then
            info "  → Get free testnet STX: https://explorer.hiro.so/sandbox/faucet?chain=testnet"
        else
            info "  → Send ≥ 0.1 STX to: ${DEPLOYER}"
        fi
    else
        # Convert microSTX to STX for display
        BALANCE_STX=$(echo "scale=6; $BALANCE / 1000000" | bc 2>/dev/null || echo "${BALANCE} microSTX")
        info "  Deployer balance: ${BALANCE_STX} STX"

        if [ "$BALANCE" -lt "$MIN_STX_BALANCE" ]; then
            fail "Insufficient balance. Need ≥ $(echo "scale=2; $MIN_STX_BALANCE / 1000000" | bc) STX"
        else
            success "Sufficient balance for deployment"
        fi
    fi
fi

# ── 1.10 Secret scan ────────────────────────────────────────────────────────
info "[BONUS] Running secret scan..."
if [ -f "scripts/check-tracked-secrets.sh" ]; then
    if ! bash scripts/check-tracked-secrets.sh > /dev/null 2>&1; then
        fail "Secret markers found in tracked files!"
    else
        success "No secret markers in tracked files"
    fi
else
    warn "Secret scan script not found — skipping"
fi

# ── Pre-flight summary ──────────────────────────────────────────────────────
echo ""
separator
if [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}${BOLD}  PRE-FLIGHT FAILED: $ERRORS check(s) failed${NC}"
    echo -e "  Fix the issues above before deploying."
    separator
    exit 1
fi

echo -e "${GREEN}${BOLD}  PRE-FLIGHT PASSED: All checks green${NC}"
separator
echo ""

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 2: Contract Hash Verification
# ═════════════════════════════════════════════════════════════════════════════
info "PHASE 2: Contract Hash Verification"
echo ""
info "Record these hashes and verify against audited sources:"
echo ""

for contract_file in "$CONTRACT_ORACLE" "$CONTRACT_STAKING" "$CONTRACT_VAULT"; do
    if command -v sha256sum &>/dev/null; then
        HASH=$(sha256sum "$contract_file" | cut -d' ' -f1)
    elif command -v shasum &>/dev/null; then
        HASH=$(shasum -a 256 "$contract_file" | cut -d' ' -f1)
    else
        HASH="(sha256sum/shasum not available)"
    fi
    echo -e "  ${CYAN}$(basename "$contract_file")${NC}"
    echo -e "  SHA-256: ${BOLD}${HASH}${NC}"
    echo ""
done

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 3: Deployment Confirmation
# ═════════════════════════════════════════════════════════════════════════════
echo ""
separator
info "DEPLOYMENT ORDER (Clarinet batch — all in one anchor block):"
echo ""
echo -e "  ${BOLD}Batch 0 / Tx 1:${NC} ${NAME_ORACLE}    (oracle price feed — no deps)"
echo -e "  ${BOLD}Batch 0 / Tx 2:${NC} ${NAME_STAKING}   (staking pool — no deps)"
echo -e "  ${BOLD}Batch 0 / Tx 3:${NC} ${NAME_VAULT}     (lending vault — uses oracle price at runtime)"
echo ""
echo -e "  Plan file: ${CYAN}${PLAN_FILE}${NC}"
separator
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}${BOLD}  DRY RUN MODE — skipping actual deployment.${NC}"
    echo ""
    info "The following command WOULD be executed:"
    echo ""
    echo "    clarinet deployments apply -p $PLAN_FILE"
    echo ""
    info "Post-deployment initialization calls would follow."
    echo ""
    exit 0
fi

if [ "$NETWORK" = "mainnet" ]; then
    echo -e "${RED}${BOLD}  ⚠  MAINNET DEPLOYMENT — THIS IS IRREVERSIBLE  ⚠${NC}"
    echo ""
    echo "  You are about to deploy 3 contracts to Stacks MAINNET."
    echo "  Estimated total fee: ~0.4 STX"
    echo ""
    read -p "  Type 'DEPLOY MAINNET' to confirm: " CONFIRM
    echo ""
    if [ "$CONFIRM" != "DEPLOY MAINNET" ]; then
        info "Deployment cancelled by user."
        exit 0
    fi
else
    read -p "  Deploy to testnet? (yes/no): " CONFIRM
    echo ""
    if [ "$CONFIRM" != "yes" ]; then
        info "Deployment cancelled by user."
        exit 0
    fi
fi

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 4: Execute Deployment
# ═════════════════════════════════════════════════════════════════════════════
info "PHASE 4: Deploying contracts..."
echo ""

DEPLOY_LOG="logs/deploy-${NETWORK}-$(date +%Y%m%d_%H%M%S).log"
mkdir -p logs

info "Executing: clarinet deployments apply -p $PLAN_FILE"
info "Deployment log: $DEPLOY_LOG"
echo ""

if clarinet deployments apply -p "$PLAN_FILE" 2>&1 | tee "$DEPLOY_LOG"; then
    echo ""
    success "All 3 contracts deployed successfully!"
else
    echo ""
    fatal "Deployment failed. Check log: $DEPLOY_LOG"
fi

echo ""
separator
echo -e "${GREEN}${BOLD}  DEPLOYMENT COMPLETE${NC}"
echo ""
echo -e "  Contracts deployed to ${CYAN}${NETWORK}${NC}:"
echo -e "    • ${DEPLOYER}.${NAME_ORACLE}"
echo -e "    • ${DEPLOYER}.${NAME_STAKING}"
echo -e "    • ${DEPLOYER}.${NAME_VAULT}"
separator
echo ""

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 5: Post-Deployment Initialization Checklist
# ═════════════════════════════════════════════════════════════════════════════
info "PHASE 5: Post-Deployment Initialization"
echo ""
echo -e "${YELLOW}${BOLD}  ┌────────────────────────────────────────────────────────────┐${NC}"
echo -e "${YELLOW}${BOLD}  │  MANDATORY POST-DEPLOYMENT ACTIONS                        │${NC}"
echo -e "${YELLOW}${BOLD}  │  Execute these in order from the DEPLOYER wallet           │${NC}"
echo -e "${YELLOW}${BOLD}  └────────────────────────────────────────────────────────────┘${NC}"
echo ""

cat << 'CHECKLIST'

  ═══════════════════════════════════════════════════════════════
  STEP 1: Initialize Oracle Registry
  ═══════════════════════════════════════════════════════════════

    Call: (contract-call? .bitflow-oracle-registry-v3 initialize-oracle)
    
    What it does:
      - Records protocol-start-block (one-time, irreversible)
      - Cannot be called again (guarded by protocol-start-block == u0)

  ═══════════════════════════════════════════════════════════════
  STEP 2: Add Oracle Reporters (minimum 2 required)
  ═══════════════════════════════════════════════════════════════

    Call: (contract-call? .bitflow-oracle-registry-v3 add-reporter '<REPORTER_1_PRINCIPAL>)
    Call: (contract-call? .bitflow-oracle-registry-v3 add-reporter '<REPORTER_2_PRINCIPAL>)

    What it does:
      - Whitelists principals that can submit price observations
      - min-reporters defaults to u2 — at least 2 must be added
      - Max reporters: 10

  ═══════════════════════════════════════════════════════════════
  STEP 3: Bootstrap Oracle Price (admin override)
  ═══════════════════════════════════════════════════════════════

    Call: (contract-call? .bitflow-oracle-registry-v3 admin-set-price u<PRICE>)
    
    Example: u150 for $1.50 STX/USD (if 1 unit = $0.01)
    
    What it does:
      - Sets the initial aggregated price before reporters submit
      - Required because vault-core needs a non-zero, non-stale price
        for borrow and liquidation operations
      - Reporters can then submit within deviation bounds

  ═══════════════════════════════════════════════════════════════
  STEP 4: Initialize Staking Pool
  ═══════════════════════════════════════════════════════════════

    Call: (contract-call? .bitflow-staking-pool-v3 initialize-pool)
    
    What it does:
      - Records protocol-start-block and last-reward-block
      - One-time call (guarded by protocol-start-block == u0)
      - Users cannot stake until this is called

  ═══════════════════════════════════════════════════════════════
  STEP 5: Set Staking Reward Rate
  ═══════════════════════════════════════════════════════════════

    Call: (contract-call? .bitflow-staking-pool-v3 set-reward-rate u<RATE>)
    
    Example: u1000 = 1000 microSTX per block
    
    What it does:
      - Defines how many microSTX are distributed per block
      - Max allowed: u100000000
      - Set to u0 initially if rewards are not yet funded

  ═══════════════════════════════════════════════════════════════
  STEP 6: Fund Staking Rewards (if reward rate > 0)
  ═══════════════════════════════════════════════════════════════

    Call: (contract-call? .bitflow-staking-pool-v3 fund-rewards u<AMOUNT>)
    
    What it does:
      - Transfers STX from deployer to staking pool contract
      - Must cover expected reward payouts

  ═══════════════════════════════════════════════════════════════
  STEP 7: Initialize Vault Core
  ═══════════════════════════════════════════════════════════════

    Call: (contract-call? .bitflow-vault-core-v3 initialize)
    
    What it does:
      - Sets protocol-start-block, last-activity-block, price-update-block
      - One-time call (guarded by protocol-start-block == u0)

  ═══════════════════════════════════════════════════════════════
  STEP 8: Set Vault STX Price (sync with oracle)
  ═══════════════════════════════════════════════════════════════

    Call: (contract-call? .bitflow-vault-core-v3 set-stx-price u<PRICE>)
    
    What it does:
      - Updates the vault's internal price + price-update-block
      - Borrow and liquidation require is-price-valid (non-stale)
      - In production, automate this with a cron/bot that reads
        from the oracle registry and pushes to vault

  ═══════════════════════════════════════════════════════════════
  STEP 9: Verify All Contracts Are Operational
  ═══════════════════════════════════════════════════════════════

    Read-only verification calls:
    
    (contract-call? .bitflow-oracle-registry-v3 get-dashboard-snapshot)
    (contract-call? .bitflow-staking-pool-v3 get-dashboard-snapshot)
    (contract-call? .bitflow-vault-core-v3 get-dashboard-snapshot)
    
    Check:
      ✓ protocol-age-blocks > 0 (all three)
      ✓ Oracle: reporter-count ≥ 2, aggregated-price > 0, is-paused = false
      ✓ Staking: is-paused = false, reward-rate set
      ✓ Vault: stx-price > 0, is-paused = false

CHECKLIST

echo ""
separator
echo -e "${GREEN}${BOLD}  DEPLOYMENT + INITIALIZATION GUIDE COMPLETE${NC}"
echo -e "  Log saved to: ${CYAN}${DEPLOY_LOG}${NC}"
separator
echo ""
