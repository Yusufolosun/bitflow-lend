#!/bin/bash
set -e

echo "🔍 Running BitFlow Lend linters..."
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Track if any linting failed
LINT_FAILED=0

# Clarity linting
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Linting Clarity contracts..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command_exists clarinet; then
    if clarinet check; then
        echo "✅ Clarity contracts look good!"
    else
        echo "❌ Clarity linting failed"
        LINT_FAILED=1
    fi
else
    echo "⚠️  Clarinet not found - skipping Clarity linting"
fi

# Frontend linting
if [ -d "frontend" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎨 Linting frontend code..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd frontend
    
    # Check if lint script exists
    if grep -q '"lint"' package.json 2>/dev/null; then
        if npm run lint; then
            echo "✅ Frontend code looks good!"
        else
            echo "❌ Frontend linting failed"
            LINT_FAILED=1
        fi
    else
        echo "⚠️  No lint script found in package.json"
        echo "💡 Add ESLint to your project for better code quality"
    fi
    
    # Check Prettier if available
    if grep -q '"format:check"' package.json 2>/dev/null; then
        echo ""
        echo "📐 Checking code formatting..."
        if npm run format:check; then
            echo "✅ Code formatting is correct!"
        else
            echo "⚠️  Code formatting issues found"
            echo "💡 Run 'npm run format' to auto-fix formatting"
        fi
    fi
    
    cd ..
fi

# TypeScript type checking (if frontend exists)
if [ -d "frontend" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔷 TypeScript type checking..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd frontend
    
    if command_exists tsc; then
        if npm run type-check 2>/dev/null || tsc --noEmit; then
            echo "✅ TypeScript types are valid!"
        else
            echo "❌ TypeScript type errors found"
            LINT_FAILED=1
        fi
    else
        echo "⚠️  TypeScript not found - skipping type check"
    fi
    
    cd ..
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Final summary
if [ $LINT_FAILED -eq 0 ]; then
    echo "✅ All linting checks passed!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
else
    echo "❌ Some linting checks failed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💡 Fix the issues above and run './scripts/lint.sh' again"
    exit 1
fi
