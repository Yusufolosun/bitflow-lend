#!/bin/bash
set -e

echo "🧪 BitFlow Lend - Testnet Practice Deployment"
echo "=============================================="
echo ""
echo "This will deploy to TESTNET (free, no real STX needed)"
echo ""

# Run checks
clarinet check || exit 1
npm test || exit 1

# Deploy to testnet
echo "🚀 Deploying to testnet..."
clarinet deployments generate --testnet --low-cost
clarinet deployments apply --testnet

echo ""
echo "✅ Testnet deployment complete!"
echo ""
echo "📋 What to test:"
echo "   1. Call deposit function"
echo "   2. Call withdraw function"
echo "   3. Call borrow function"
echo "   4. Verify all functions work correctly"
echo ""
echo "Once testnet works perfectly, you're ready for mainnet!"
