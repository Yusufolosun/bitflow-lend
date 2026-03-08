#!/bin/bash
set -e

echo "🔧 Setting up BitFlow Lend development environment..."
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check for Node.js
if ! command_exists node; then
    echo "❌ Node.js not found"
    echo "📦 Please install Node.js from: https://nodejs.org/"
    exit 1
else
    echo "✅ Node.js found: $(node --version)"
fi

# Check for npm
if ! command_exists npm; then
    echo "❌ npm not found"
    echo "📦 Please install npm (usually comes with Node.js)"
    exit 1
else
    echo "✅ npm found: $(npm --version)"
fi

# Check for Clarinet
if ! command_exists clarinet; then
    echo ""
    echo "⚠️  Clarinet not found"
    echo "📦 Installing Clarinet is recommended for Clarity development"
    echo "   Visit: https://github.com/hirosystems/clarinet"
    echo ""
    read -p "Continue without Clarinet? (yes/no): " continue_without_clarinet
    
    if [ "$continue_without_clarinet" != "yes" ]; then
        echo "❌ Setup cancelled"
        exit 1
    fi
else
    echo "✅ Clarinet found: $(clarinet --version)"
fi

# Check for Git
if ! command_exists git; then
    echo "❌ Git not found"
    echo "📦 Please install Git from: https://git-scm.com/"
    exit 1
else
    echo "✅ Git found: $(git --version)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Installing dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Install root dependencies (contract testing SDK)
echo ""
echo "📦 Installing root dependencies..."
npm install
echo "✅ Root dependencies installed"

# Install frontend dependencies
if [ -d "frontend" ]; then
    echo ""
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "✅ Frontend dependencies installed"
else
    echo "⚠️  No frontend directory found"
fi

# Create .env file from .env.example if it doesn't exist
if [ -d "frontend" ] && [ -f "frontend/.env.example" ] && [ ! -f "frontend/.env" ]; then
    echo ""
    echo "📝 Creating .env file from .env.example..."
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
    echo "⚠️  Remember to update .env with your configuration"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🪝 Setting up Git hooks..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Set up Husky git hooks
if [ -d ".husky" ]; then
    # Ensure hooks are executable
    chmod +x .husky/pre-commit 2>/dev/null || true
    chmod +x .husky/commit-msg 2>/dev/null || true

    # Configure git to use .husky directory
    git config core.hooksPath .husky
    echo "✅ Git hooks configured (core.hooksPath = .husky)"
    echo "   - pre-commit: lint, type check, test"
    echo "   - commit-msg: conventional commit format"
else
    echo "⚠️  No .husky directory found — skipping git hooks setup"
fi

# Run contract checks if Clarinet is available
if command_exists clarinet; then
    echo ""
    echo "📋 Running contract checks..."
    clarinet check
    echo "✅ Contract checks passed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Verifying setup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify contract test suite
echo ""
echo "📊 Project statistics:"
CONTRACT_COUNT=$(find contracts -name '*.clar' 2>/dev/null | wc -l)
TEST_COUNT=$(find tests -name '*.test.ts' 2>/dev/null | wc -l)
FRONTEND_TEST_COUNT=$(find frontend/src -name '*.test.ts' -o -name '*.test.tsx' 2>/dev/null | wc -l)
SCRIPT_COUNT=$(find scripts -name '*.sh' -o -name '*.js' 2>/dev/null | wc -l)
DOC_COUNT=$(find docs -name '*.md' 2>/dev/null | wc -l)

echo "   Contracts:      $CONTRACT_COUNT"
echo "   Contract tests: $TEST_COUNT"
echo "   Frontend tests: $FRONTEND_TEST_COUNT"
echo "   Scripts:        $SCRIPT_COUNT"
echo "   Documentation:  $DOC_COUNT files"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Development environment setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Quick start:"
echo "  1. Run contract tests:  npm test"
echo "  2. Run frontend tests:  cd frontend && npx vitest run --pool=forks"
echo "  3. Start frontend dev:  cd frontend && npm run dev"
echo "  4. Run all tests:       ./scripts/run-tests.sh"
echo ""
echo "📋 Available scripts:"
echo "  ./scripts/run-tests.sh          — Run all tests"
echo "  ./scripts/check-coverage.sh     — Check test coverage"
echo "  ./scripts/lint.sh               — Lint code"
echo "  ./scripts/deploy-testnet.sh     — Deploy to testnet"
echo "  ./scripts/pre-deployment-check.sh — Pre-deployment checks"
echo ""
echo "📚 Read docs/ for development guidelines"
echo ""
echo "📚 Useful commands:"
echo "  - Run tests: ./scripts/run-tests.sh"
echo "  - Check coverage: ./scripts/check-coverage.sh"
echo "  - Lint code: ./scripts/lint.sh"
echo "  - Deploy testnet: ./scripts/deploy-testnet.sh"
echo ""
echo "Happy coding! 🚀"
