#!/bin/bash
set -euo pipefail

# Pre-deployment gate for BitFlow Lend.
# Every check either passes or exits non-zero — no warnings that scroll by.
# Called by deploy-mainnet-safe.sh before any on-chain transaction.

MAX_CONTRACT_BYTES=40000
ERRORS=0

fail() {
    echo "  FAIL: $1"
    ERRORS=$((ERRORS + 1))
}

echo "BitFlow Lend - Pre-Deployment Checks"
echo "======================================"
echo ""

# ── 1. Clean working tree ────────────────────────────────────────────
echo "[1/6] Checking git working tree..."
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    fail "Working tree is dirty — commit or stash changes before deploying"
else
    echo "  OK: working tree clean"
fi

# ── 2. Contract syntax ───────────────────────────────────────────────
echo "[2/6] Checking contract syntax..."
if ! clarinet check 2>/dev/null; then
    fail "clarinet check reported syntax errors"
else
    echo "  OK: contract syntax valid"
fi

# ── 3. Test suite ────────────────────────────────────────────────────
echo "[3/6] Running test suite..."
if ! npm test 2>/dev/null; then
    fail "test suite has failures"
else
    echo "  OK: all tests pass"
fi

# ── 4. Contract size ─────────────────────────────────────────────────
echo "[4/6] Checking contract size..."
CONTRACT_SIZE=$(wc -c < contracts/bitflow-vault-core.clar | tr -d ' ')
echo "  Size: $CONTRACT_SIZE bytes (limit: $MAX_CONTRACT_BYTES)"
if [ "$CONTRACT_SIZE" -gt "$MAX_CONTRACT_BYTES" ]; then
    fail "contract exceeds ${MAX_CONTRACT_BYTES} byte limit"
else
    echo "  OK: within size budget"
fi

# ── 5. Network connectivity ──────────────────────────────────────────
echo "[5/6] Checking network connectivity..."
if ! curl -sf --max-time 10 https://api.mainnet.hiro.so/v2/info > /dev/null 2>&1; then
    fail "cannot reach Stacks mainnet API"
else
    echo "  OK: mainnet API reachable"
fi

# ── 6. Contract hash verification ────────────────────────────────────
echo "[6/6] Generating contract hash..."
CONTRACT_HASH=$(sha256sum contracts/bitflow-vault-core.clar | cut -d' ' -f1)
echo "  SHA-256: $CONTRACT_HASH"
echo "  Verify this matches the audited contract before proceeding."

# ── Summary ──────────────────────────────────────────────────────────
echo ""
if [ "$ERRORS" -gt 0 ]; then
    echo "BLOCKED: $ERRORS check(s) failed — fix the issues above before deploying."
    exit 1
fi

echo "All pre-deployment checks passed."
echo ""
echo "Reminder before you continue:"
echo "  - Deployer wallet has at least 5 STX"
echo "  - Private key is stored securely (not in repo)"
echo "  - Contract has been reviewed / audited"
echo ""
read -p "Proceed with deployment? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled."
    exit 1
fi

echo "Ready for deployment."
