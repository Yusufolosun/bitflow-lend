#!/bin/bash
# Protocol Health Check Script for BitFlow Lend
# Checks contract deployment status, API availability, and protocol metrics
#
# Usage: ./scripts/health-check.sh [--network mainnet|testnet|devnet] [--verbose] [--json]
#
# Requires: curl, jq (optional for JSON parsing)

set -e

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
NETWORK="mainnet"
VERBOSE=false
JSON_OUTPUT=false
CONTRACT_NAME="bitflow-vault-core"
DEPLOYER_ADDRESS=""

# Stacks API endpoints
MAINNET_API="https://api.hiro.so"
TESTNET_API="https://api.testnet.hiro.so"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --network)
            shift
            NETWORK="$1"
            shift
            ;;
        --network=*)
            NETWORK="${arg#*=}"
            ;;
        --verbose)
            VERBOSE=true
            ;;
        --json)
            JSON_OUTPUT=true
            ;;
        --help)
            echo "Usage: ./scripts/health-check.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --network <net>  Network to check: mainnet, testnet, devnet (default: mainnet)"
            echo "  --verbose        Show detailed output"
            echo "  --json           Output results in JSON format"
            echo "  --help           Show this help"
            exit 0
            ;;
    esac
done

# Set API URL based on network
case $NETWORK in
    mainnet)
        API_URL="$MAINNET_API"
        ;;
    testnet)
        API_URL="$TESTNET_API"
        ;;
    devnet)
        API_URL="http://localhost:3999"
        ;;
    *)
        echo "❌ Unknown network: $NETWORK"
        exit 1
        ;;
esac

CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0

# ──────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────
pass() {
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    if [ "$JSON_OUTPUT" = false ]; then
        echo "  ✅ $1"
    fi
}

fail() {
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    if [ "$JSON_OUTPUT" = false ]; then
        echo "  ❌ $1"
    fi
}

warn() {
    CHECKS_WARNED=$((CHECKS_WARNED + 1))
    if [ "$JSON_OUTPUT" = false ]; then
        echo "  ⚠️  $1"
    fi
}

info() {
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
        echo "  ℹ️  $1"
    fi
}

# ──────────────────────────────────────────────
# Checks
# ──────────────────────────────────────────────

if [ "$JSON_OUTPUT" = false ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🏥 BitFlow Lend Health Check"
    echo "   Network: $NETWORK"
    echo "   API:     $API_URL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi

# 1. API Connectivity
if [ "$JSON_OUTPUT" = false ]; then
    echo "📡 API Connectivity"
fi

API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/v2/info" 2>/dev/null || echo "000")

if [ "$API_RESPONSE" = "200" ]; then
    pass "Stacks API reachable ($API_URL)"

    # Get chain info
    if [ "$VERBOSE" = true ]; then
        CHAIN_INFO=$(curl -s --max-time 10 "$API_URL/v2/info" 2>/dev/null || echo "{}")
        BLOCK_HEIGHT=$(echo "$CHAIN_INFO" | grep -o '"stacks_tip_height":[0-9]*' | grep -o '[0-9]*' || echo "unknown")
        info "Current block height: $BLOCK_HEIGHT"
    fi
else
    fail "Stacks API unreachable (HTTP $API_RESPONSE)"
fi

echo ""

# 2. Contract Deployment Status
if [ "$JSON_OUTPUT" = false ]; then
    echo "📜 Contract Status"
fi

if [ -n "$DEPLOYER_ADDRESS" ]; then
    CONTRACT_URL="$API_URL/v2/contracts/source/$DEPLOYER_ADDRESS/$CONTRACT_NAME"
    CONTRACT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$CONTRACT_URL" 2>/dev/null || echo "000")

    if [ "$CONTRACT_RESPONSE" = "200" ]; then
        pass "Contract deployed: $CONTRACT_NAME"
    else
        fail "Contract not found: $CONTRACT_NAME (HTTP $CONTRACT_RESPONSE)"
    fi
else
    warn "Deployer address not configured — set DEPLOYER_ADDRESS to check contract"
    info "Update the script with your deployer address after deployment"
fi

echo ""

# 3. Local Development Environment
if [ "$JSON_OUTPUT" = false ]; then
    echo "🔧 Development Environment"
fi

# Node.js
if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        pass "Node.js $NODE_VERSION (>= v18 required)"
    else
        warn "Node.js $NODE_VERSION (v18+ recommended)"
    fi
else
    fail "Node.js not installed"
fi

# npm
if command -v npm &>/dev/null; then
    pass "npm $(npm --version)"
else
    fail "npm not installed"
fi

# Clarinet
if command -v clarinet &>/dev/null; then
    pass "Clarinet $(clarinet --version 2>/dev/null || echo 'installed')"
else
    warn "Clarinet not installed (needed for contract development)"
fi

# Git hooks
if [ -d ".husky" ]; then
    HOOKS_CONFIGURED=$(git config core.hooksPath 2>/dev/null || echo "")
    if [ "$HOOKS_CONFIGURED" = ".husky" ]; then
        pass "Git hooks configured (core.hooksPath = .husky)"
    else
        warn "Git hooks directory exists but not configured (run: git config core.hooksPath .husky)"
    fi
else
    warn "No .husky directory — git hooks not set up"
fi

echo ""

# 4. Dependencies
if [ "$JSON_OUTPUT" = false ]; then
    echo "📦 Dependencies"
fi

# Root node_modules
if [ -d "node_modules" ]; then
    pass "Root dependencies installed"
else
    fail "Root dependencies missing (run: npm install)"
fi

# Frontend node_modules
if [ -d "frontend/node_modules" ]; then
    pass "Frontend dependencies installed"
else
    fail "Frontend dependencies missing (run: cd frontend && npm install)"
fi

# Check for known vulnerabilities
if [ "$VERBOSE" = true ]; then
    AUDIT_RESULT=$(npm audit --json 2>/dev/null | grep -o '"total":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "unknown")
    if [ "$AUDIT_RESULT" = "0" ]; then
        pass "No known vulnerabilities (root)"
    elif [ "$AUDIT_RESULT" != "unknown" ]; then
        warn "$AUDIT_RESULT known vulnerabilities (root) — run: npm audit"
    fi
fi

echo ""

# 5. Test Suite
if [ "$JSON_OUTPUT" = false ]; then
    echo "🧪 Test Suite"
fi

CONTRACT_TESTS=$(find tests -name '*.test.ts' 2>/dev/null | wc -l | tr -d ' ')
FRONTEND_TESTS=$(find frontend/src -name '*.test.ts' -o -name '*.test.tsx' 2>/dev/null | wc -l | tr -d ' ')

if [ "$CONTRACT_TESTS" -gt 0 ]; then
    pass "Contract test files: $CONTRACT_TESTS"
else
    fail "No contract test files found"
fi

if [ "$FRONTEND_TESTS" -gt 0 ]; then
    pass "Frontend test files: $FRONTEND_TESTS"
else
    warn "No frontend test files found"
fi

echo ""

# 6. Documentation
if [ "$JSON_OUTPUT" = false ]; then
    echo "📚 Documentation"
fi

DOC_COUNT=$(find docs -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
if [ "$DOC_COUNT" -gt 10 ]; then
    pass "Documentation: $DOC_COUNT files"
elif [ "$DOC_COUNT" -gt 0 ]; then
    warn "Documentation: $DOC_COUNT files (consider adding more)"
else
    fail "No documentation found"
fi

# Check for required docs
for doc in README.md SECURITY.md LICENSE; do
    if [ -f "$doc" ]; then
        pass "$doc exists"
    else
        warn "$doc missing"
    fi
done

echo ""

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
TOTAL=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNED))

if [ "$JSON_OUTPUT" = true ]; then
    echo "{\"network\":\"$NETWORK\",\"passed\":$CHECKS_PASSED,\"failed\":$CHECKS_FAILED,\"warnings\":$CHECKS_WARNED,\"total\":$TOTAL}"
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Summary: $CHECKS_PASSED passed, $CHECKS_FAILED failed, $CHECKS_WARNED warnings / $TOTAL checks"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ "$CHECKS_FAILED" -gt 0 ]; then
        echo ""
        echo "❌ Health check FAILED — $CHECKS_FAILED issue(s) need attention"
        exit 1
    elif [ "$CHECKS_WARNED" -gt 0 ]; then
        echo ""
        echo "⚠️  Health check PASSED with $CHECKS_WARNED warning(s)"
    else
        echo ""
        echo "✅ All health checks passed!"
    fi
fi
