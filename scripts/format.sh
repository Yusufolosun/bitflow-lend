#!/bin/bash
# Format all code in the BitFlow Lend project
# Usage: ./scripts/format.sh [--check] [--frontend] [--contracts] [--tests]
#
# Options:
#   --check      Check formatting without making changes (exit 1 if unformatted)
#   --frontend   Format only frontend code
#   --contracts  Format only contract files
#   --tests      Format only test files
#   (no flag)    Format everything

set -e

CHECK_MODE=false
FORMAT_FRONTEND=true
FORMAT_CONTRACTS=true
FORMAT_TESTS=true
SPECIFIC=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --check)
            CHECK_MODE=true
            ;;
        --frontend)
            FORMAT_FRONTEND=true
            FORMAT_CONTRACTS=false
            FORMAT_TESTS=false
            SPECIFIC=true
            ;;
        --contracts)
            FORMAT_FRONTEND=false
            FORMAT_CONTRACTS=true
            FORMAT_TESTS=false
            SPECIFIC=true
            ;;
        --tests)
            FORMAT_FRONTEND=false
            FORMAT_CONTRACTS=false
            FORMAT_TESTS=true
            SPECIFIC=true
            ;;
        --help)
            echo "Usage: ./scripts/format.sh [--check] [--frontend] [--contracts] [--tests]"
            echo ""
            echo "Options:"
            echo "  --check      Check formatting without making changes"
            echo "  --frontend   Format only frontend code"
            echo "  --contracts  Format only contract files"
            echo "  --tests      Format only test files"
            echo "  (no flag)    Format everything"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Run with --help for usage"
            exit 1
            ;;
    esac
done

ERRORS=0

if [ "$CHECK_MODE" = true ]; then
    echo "🔍 Checking code formatting..."
else
    echo "✨ Formatting code..."
fi

# ──────────────────────────────────────────────
# Frontend (TypeScript/React)
# ──────────────────────────────────────────────
if [ "$FORMAT_FRONTEND" = true ] && [ -d "frontend" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📁 Frontend (TypeScript/React)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check if prettier is available
    if [ -f "frontend/node_modules/.bin/prettier" ] || command -v npx &>/dev/null; then
        if [ "$CHECK_MODE" = true ]; then
            (cd frontend && npx prettier --check "src/**/*.{ts,tsx,css}" 2>/dev/null) || {
                echo "❌ Frontend files need formatting"
                ERRORS=$((ERRORS + 1))
            }
        else
            (cd frontend && npx prettier --write "src/**/*.{ts,tsx,css}" 2>/dev/null) && {
                echo "✅ Frontend files formatted"
            } || {
                echo "⚠️  Prettier not configured — skipping frontend formatting"
            }
        fi
    else
        echo "⚠️  Prettier not available — install with: cd frontend && npm install -D prettier"
    fi

    # Remove trailing whitespace from frontend files
    if [ "$CHECK_MODE" = false ]; then
        find frontend/src -name '*.ts' -o -name '*.tsx' -o -name '*.css' | while read -r file; do
            sed -i 's/[[:space:]]*$//' "$file" 2>/dev/null || true
        done
        echo "✅ Trailing whitespace removed from frontend files"
    fi
fi

# ──────────────────────────────────────────────
# Contract files (Clarity)
# ──────────────────────────────────────────────
if [ "$FORMAT_CONTRACTS" = true ] && [ -d "contracts" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📁 Contracts (Clarity)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    CLAR_ISSUES=0

    find contracts -name '*.clar' | while read -r file; do
        # Check for tabs (Clarity should use spaces)
        if grep -P '\t' "$file" >/dev/null 2>&1; then
            if [ "$CHECK_MODE" = true ]; then
                echo "❌ Tabs found in: $file"
                CLAR_ISSUES=$((CLAR_ISSUES + 1))
            else
                # Replace tabs with 2 spaces
                sed -i 's/\t/  /g' "$file" 2>/dev/null || true
                echo "✅ Converted tabs to spaces in: $file"
            fi
        fi

        # Check for trailing whitespace
        if grep -E '[[:space:]]+$' "$file" >/dev/null 2>&1; then
            if [ "$CHECK_MODE" = true ]; then
                echo "❌ Trailing whitespace in: $file"
                CLAR_ISSUES=$((CLAR_ISSUES + 1))
            else
                sed -i 's/[[:space:]]*$//' "$file" 2>/dev/null || true
                echo "✅ Removed trailing whitespace in: $file"
            fi
        fi

        # Ensure file ends with newline
        if [ -n "$(tail -c 1 "$file" 2>/dev/null)" ]; then
            if [ "$CHECK_MODE" = true ]; then
                echo "❌ No trailing newline in: $file"
                CLAR_ISSUES=$((CLAR_ISSUES + 1))
            else
                echo "" >> "$file"
                echo "✅ Added trailing newline to: $file"
            fi
        fi
    done

    if [ "$CLAR_ISSUES" -gt 0 ]; then
        ERRORS=$((ERRORS + CLAR_ISSUES))
    else
        echo "✅ Contract files look good"
    fi
fi

# ──────────────────────────────────────────────
# Test files
# ──────────────────────────────────────────────
if [ "$FORMAT_TESTS" = true ] && [ -d "tests" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📁 Test files"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ "$CHECK_MODE" = false ]; then
        # Remove trailing whitespace from test files
        find tests -name '*.ts' | while read -r file; do
            sed -i 's/[[:space:]]*$//' "$file" 2>/dev/null || true
        done
        echo "✅ Test files cleaned"
    else
        TEST_ISSUES=0
        find tests -name '*.ts' | while read -r file; do
            if grep -E '[[:space:]]+$' "$file" >/dev/null 2>&1; then
                echo "❌ Trailing whitespace in: $file"
                TEST_ISSUES=$((TEST_ISSUES + 1))
            fi
        done
        if [ "$TEST_ISSUES" -gt 0 ]; then
            ERRORS=$((ERRORS + TEST_ISSUES))
        else
            echo "✅ Test files look good"
        fi
    fi
fi

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$CHECK_MODE" = true ]; then
    if [ "$ERRORS" -gt 0 ]; then
        echo "❌ Formatting check failed ($ERRORS issues)"
        echo "   Run './scripts/format.sh' to auto-fix"
        exit 1
    else
        echo "✅ All files properly formatted"
    fi
else
    echo "✅ Formatting complete!"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
