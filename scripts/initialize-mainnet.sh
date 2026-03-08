#!/bin/bash

echo "🔧 Initializing BitFlow Lend Contract"
echo "========================================"
echo ""
echo "Contract: SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.vault-core"
echo ""
echo "⚠️  IMPORTANT: This can only be called ONCE by the contract owner!"
echo ""
read -p "Proceed with initialization? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Initialization cancelled"
    exit 1
fi

echo ""
echo "📝 To initialize, you need to call the initialize function"
echo ""
echo "Option 1 - Using Stacks Explorer (Recommended):"
echo "  1. Visit: https://explorer.hiro.so/address/SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193?chain=mainnet"
echo "  2. Click 'vault-core' contract"
echo "  3. Go to 'Functions' tab"
echo "  4. Find 'initialize' function"
echo "  5. Connect your wallet"
echo "  6. Call the function"
echo ""
echo "Option 2 - Using @stacks/transactions (Advanced):"
echo "  See: scripts/initialize-contract.js"
echo ""
