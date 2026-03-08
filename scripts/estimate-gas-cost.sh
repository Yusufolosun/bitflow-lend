#!/bin/bash

echo "💰 BitFlow Lend - Gas Cost Estimator"
echo "======================================"
echo ""

# Get contract size
CONTRACT_SIZE=$(wc -c < contracts/bitflow-vault-core.clar)
echo "Contract size: ${CONTRACT_SIZE} bytes"

# Estimate gas (rough formula: ~0.000005 STX per byte)
GAS_STX=$(echo "scale=6; $CONTRACT_SIZE * 0.000005" | bc)
echo "Estimated gas: ${GAS_STX} STX"

# Get current STX price (you'll need to update this manually)
STX_PRICE=0.80  # Update this with current price
GAS_USD=$(echo "scale=2; $GAS_STX * $STX_PRICE" | bc)

echo ""
echo "💵 Cost Breakdown:"
echo "   Contract deployment: ${GAS_STX} STX"
echo "   Transaction fee: ~0.001 STX"
echo "   Total STX: $(echo "$GAS_STX + 0.001" | bc) STX"
echo "   Total USD: ~$${GAS_USD} (at \$${STX_PRICE} per STX)"
echo ""

if (( $(echo "$GAS_USD > 0.20" | bc -l) )); then
    echo "⚠️  Cost exceeds target of \$0.20"
    echo "   Consider further contract optimization"
else
    echo "✅ Cost is within target (\$0.20 or less)"
fi
