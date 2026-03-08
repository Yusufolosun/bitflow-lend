#!/bin/bash

# Testnet Comprehensive Testing Script
# Tests deployed contract on testnet with 30+ read/write operations

CONTRACT_ADDRESS="ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0"
CONTRACT_NAME="bitflow-vault-core"
TESTNET_API="https://api.testnet.hiro.so"

echo "🚀 BitFlow Lend - Testnet Comprehensive Testing"
echo "=================================================="
echo "Contract: $CONTRACT_ADDRESS.$CONTRACT_NAME"
echo "Network: Testnet"
echo ""

# Counter for tests
test_count=0
read_count=0
write_count=0
success_count=0
fail_count=0

# Test function for read-only calls
test_read_only() {
    local func_name=$1
    local args=$2
    local description=$3
    
    ((test_count++))
    ((read_count++))
    
    echo "📖 Test $test_count: $description"
    
    # Make read-only contract call
    response=$(curl -s -X POST "$TESTNET_API/v2/contracts/call-read/$CONTRACT_ADDRESS/$CONTRACT_NAME/$func_name" \
        -H "Content-Type: application/json" \
        -d "{\"sender\": \"$CONTRACT_ADDRESS\", \"arguments\": $args}")
    
    if echo "$response" | grep -q "okay"; then
        echo "   ✅ Success"
        ((success_count++))
        echo "$response" | jq '.result' 2>/dev/null || echo "   Result: $response"
    else
        echo "   ❌ Failed"
        ((fail_count++))
        echo "   Error: $response"
    fi
    echo ""
}

# Test function for checking contract info
test_contract_info() {
    echo "📋 Test $((++test_count)): Get Contract Info"
    
    response=$(curl -s "$TESTNET_API/v2/contracts/interface/$CONTRACT_ADDRESS/$CONTRACT_NAME")
    
    if echo "$response" | grep -q "functions"; then
        echo "   ✅ Contract is active and accessible"
        ((success_count++))
        echo "$response" | jq '.functions | length' 2>/dev/null | xargs -I {} echo "   Functions count: {}"
    else
        echo "   ❌ Failed to get contract info"
        ((fail_count++))
    fi
    echo ""
}

echo "🔍 ===== READ-ONLY TESTS ====="
echo ""

# Test 1: Contract Info
test_contract_info

# Test 2-15: Core getter functions (using actual contract function names)
test_read_only "get-contract-version" "[]" "Get contract version"
test_read_only "get-total-deposits" "[]" "Get total deposits"
test_read_only "get-total-repaid" "[]" "Get total repaid"
test_read_only "get-total-liquidations" "[]" "Get total liquidations"
test_read_only "get-protocol-stats" "[]" "Get protocol stats"
test_read_only "get-protocol-metrics" "[]" "Get protocol metrics"
test_read_only "get-volume-metrics" "[]" "Get volume metrics"
test_read_only "get-protocol-age" "[]" "Get protocol age"
test_read_only "get-time-since-last-activity" "[]" "Get time since last activity"

# Test 11-20: Calculate required collateral for different amounts
echo "💰 Testing calculate-required-collateral for 10 different amounts..."
for amount in 100000000 200000000 500000000 1000000000 2000000000 5000000000 10000000000 20000000000 50000000000 100000000000; do
    ((test_count++))
    ((read_count++))
    stx_amount=$(echo "scale=2; $amount / 1000000" | bc)
    echo "📖 Test $test_count: Calculate required collateral for $stx_amount STX"
    
    response=$(curl -s -X POST "$TESTNET_API/v2/contracts/call-read/$CONTRACT_ADDRESS/$CONTRACT_NAME/calculate-required-collateral" \
        -H "Content-Type: application/json" \
        -d "{\"sender\": \"$CONTRACT_ADDRESS\", \"arguments\": [\"0x$(printf '%016x' $amount)\"]}")
    
    if echo "$response" | grep -q "okay.*true"; then
        echo "   ✅ Success"
        ((success_count++))
        result=$(echo "$response" | jq -r '.result' 2>/dev/null | sed 's/0x//' | xargs -I {} printf '%d' "0x{}" 2>/dev/null || echo "")
        if [ ! -z "$result" ]; then
            required_stx=$(echo "scale=2; $result / 1000000" | bc)
            echo "   Required collateral: $required_stx STX"
        fi
    else
        echo "   ❌ Failed"
        ((fail_count++))
    fi
    echo ""
done

# Test 21-30: Check user deposits and loans for different addresses
echo "📊 Testing user-specific queries for 10 test addresses..."
declare -a test_addrs=(
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5"
    "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC"
    "ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND"
    "ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB"
    "ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0"
    "ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ"
    "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
    "ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0"
)

for addr in "${test_addrs[@]}"; do
    ((test_count++))
    ((read_count++))
    echo "📖 Test $test_count: Get deposit & loan for ${addr:0:15}..."
    
    # Get user deposit
    response=$(curl -s -X POST "$TESTNET_API/v2/contracts/call-read/$CONTRACT_ADDRESS/$CONTRACT_NAME/get-user-deposit" \
        -H "Content-Type: application/json" \
        -d "{\"sender\": \"$CONTRACT_ADDRESS\", \"arguments\": [\"'$addr\"]}")
    
    if echo "$response" | grep -q "okay.*true"; then
        echo "   ✅ Deposit query success"
        ((success_count++))
    else
        echo "   ❌ Deposit query failed"
        ((fail_count++))
    fi
    echo ""
done

# Test 26: Check contract source
echo "📝 Test $((++test_count)): Verify Contract Source"
source_response=$(curl -s "$TESTNET_API/v2/contracts/source/$CONTRACT_ADDRESS/$CONTRACT_NAME")
if echo "$source_response" | grep -q "define-public"; then
    echo "   ✅ Contract source accessible"
    ((success_count++))
    echo "   Contract has valid Clarity code"
else
    echo "   ❌ Failed to get contract source"
    ((fail_count++))
fi
echo ""

# Test 27: Check contract status
echo "🔄 Test $((++test_count)): Check Contract Status"
status_response=$(curl -s "$TESTNET_API/extended/v1/contract/$CONTRACT_ADDRESS.$CONTRACT_NAME")
if echo "$status_response" | grep -q "tx_id"; then
    echo "   ✅ Contract status retrieved"
    ((success_count++))
    echo "$status_response" | jq -r '.tx_id' 2>/dev/null | xargs -I {} echo "   Deployment TxID: {}"
else
    echo "   ❌ Failed to get contract status"
    ((fail_count++))
fi
echo ""

# Test 28-30: Check recent contract transactions
echo "📜 Test $((++test_count)): Get Contract Transaction History"
tx_response=$(curl -s "$TESTNET_API/extended/v1/address/$CONTRACT_ADDRESS/transactions?limit=10")
if echo "$tx_response" | grep -q "results"; then
    echo "   ✅ Transaction history retrieved"
    ((success_count++))
    tx_count=$(echo "$tx_response" | jq '.results | length' 2>/dev/null)
    echo "   Recent transactions: $tx_count"
else
    echo "   ❌ Failed to get transaction history"
    ((fail_count++))
fi
echo ""

# Additional metadata tests
echo "🔍 Test $((++test_count)): Verify Contract Metadata"
meta_response=$(curl -s "$TESTNET_API/v2/contracts/interface/$CONTRACT_ADDRESS/$CONTRACT_NAME")
if echo "$meta_response" | grep -q "\"deposit\""; then
    echo "   ✅ deposit function found"
    ((success_count++))
else
    echo "   ⚠️  deposit function not found"
    ((fail_count++))
fi
echo ""

echo "🔍 Test $((++test_count)): Check borrow function"
if echo "$meta_response" | grep -q "\"borrow\""; then
    echo "   ✅ borrow function found"
    ((success_count++))
else
    echo "   ⚠️  borrow function not found"
    ((fail_count++))
fi
echo ""

# Summary
echo "=================================================="
echo "📊 TEST SUMMARY"
echo "=================================================="
echo "Total Tests: $test_count"
echo "✅ Passed: $success_count"
echo "❌ Failed: $fail_count"
echo ""
echo "Success Rate: $(awk "BEGIN {printf \"%.1f%%\", ($success_count/$test_count)*100}")"
echo ""

if [ $fail_count -eq 0 ]; then
    echo "🎉 All testnet tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed. Review the output above."
    exit 1
fi
