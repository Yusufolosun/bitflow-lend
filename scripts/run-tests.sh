#!/bin/bash
set -e

echo "🧪 Running BitFlow Lend test suite..."
echo ""

# Check if clarinet is installed
if ! command -v clarinet &> /dev/null; then
    echo "❌ Clarinet not found. Install from: https://github.com/hirosystems/clarinet"
    exit 1
fi

# Backend tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Running Clarity contract tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$(dirname "$0")/.."
clarinet test

# Frontend tests (if they exist)
if [ -d "frontend" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎨 Running frontend tests..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd frontend
    
    # Check if test script exists in package.json
    if grep -q '"test"' package.json 2>/dev/null; then
        npm test
    else
        echo "⚠️  No test script found in frontend/package.json"
        echo "💡 Add a test script to package.json to enable frontend tests"
    fi
    
    cd ..
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All tests passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Test Summary:"
echo "  ✓ Contract tests completed"
if [ -d "frontend" ]; then
    echo "  ✓ Frontend tests completed"
fi
echo ""
echo "💡 Run './scripts/check-coverage.sh' for detailed coverage report"
