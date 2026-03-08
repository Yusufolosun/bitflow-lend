#!/bin/bash
# Data Backup Script for BitFlow Lend
# Creates timestamped backups of critical project files
#
# Usage: ./scripts/backup-data.sh [--output <dir>] [--contracts-only] [--full]
#
# Backs up:
#   - Smart contracts (.clar files)
#   - Deployment configurations
#   - Settings/network configs
#   - Test files
#   - Documentation
#   - Frontend source (with --full flag)

set -e

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_NAME="bitflow-backup-$TIMESTAMP"
CONTRACTS_ONLY=false
FULL_BACKUP=false

# Parse arguments
while [ $# -gt 0 ]; do
    case $1 in
        --output)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --output=*)
            BACKUP_DIR="${1#*=}"
            shift
            ;;
        --contracts-only)
            CONTRACTS_ONLY=true
            shift
            ;;
        --full)
            FULL_BACKUP=true
            shift
            ;;
        --help)
            echo "Usage: ./scripts/backup-data.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --output <dir>     Backup output directory (default: backups/)"
            echo "  --contracts-only   Only backup contract files and deployments"
            echo "  --full             Include frontend source code"
            echo "  --help             Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 BitFlow Lend Backup"
echo "   Timestamp: $TIMESTAMP"
echo "   Output:    $BACKUP_PATH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create backup directory
mkdir -p "$BACKUP_PATH"

FILE_COUNT=0
TOTAL_SIZE=0

# ──────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────
backup_dir() {
    local src="$1"
    local dest="$BACKUP_PATH/$2"
    local label="$3"

    if [ -d "$src" ]; then
        mkdir -p "$dest"
        cp -r "$src"/* "$dest"/ 2>/dev/null || true
        local count
        count=$(find "$dest" -type f 2>/dev/null | wc -l | tr -d ' ')
        FILE_COUNT=$((FILE_COUNT + count))
        echo "  ✅ $label: $count files"
    else
        echo "  ⚠️  $label: directory not found ($src)"
    fi
}

backup_file() {
    local src="$1"
    local dest="$BACKUP_PATH/$2"
    local label="$3"

    if [ -f "$src" ]; then
        mkdir -p "$(dirname "$dest")"
        cp "$src" "$dest"
        FILE_COUNT=$((FILE_COUNT + 1))
        echo "  ✅ $label"
    else
        echo "  ⚠️  $label: file not found ($src)"
    fi
}

# ──────────────────────────────────────────────
# Core backups (always included)
# ──────────────────────────────────────────────
echo "📜 Smart Contracts"
backup_dir "contracts" "contracts" "Contracts"

echo ""
echo "📋 Deployment Configurations"
backup_dir "deployments" "deployments" "Deployment plans"

echo ""
echo "⚙️  Settings"
backup_dir "settings" "settings" "Network settings"

echo ""
echo "📄 Project Files"
backup_file "Clarinet.toml" "Clarinet.toml" "Clarinet.toml"
backup_file "package.json" "package.json" "package.json"
backup_file "tsconfig.json" "tsconfig.json" "tsconfig.json"
backup_file "vitest.config.ts" "vitest.config.ts" "vitest.config.ts"
backup_file "Makefile" "Makefile" "Makefile"

if [ "$CONTRACTS_ONLY" = false ]; then
    echo ""
    echo "🧪 Tests"
    backup_dir "tests" "tests" "Contract tests"

    echo ""
    echo "📚 Documentation"
    backup_dir "docs" "docs" "Documentation"

    echo ""
    echo "🔧 Scripts"
    backup_dir "scripts" "scripts" "Scripts"

    echo ""
    echo "🔄 CI/CD"
    if [ -d ".github" ]; then
        backup_dir ".github" ".github" "GitHub config"
    fi

    echo ""
    echo "🪝 Git Hooks"
    if [ -d ".husky" ]; then
        backup_dir ".husky" ".husky" "Husky hooks"
    fi
fi

if [ "$FULL_BACKUP" = true ]; then
    echo ""
    echo "🖥️  Frontend Source"
    if [ -d "frontend/src" ]; then
        backup_dir "frontend/src" "frontend/src" "Frontend source"
        backup_file "frontend/package.json" "frontend/package.json" "Frontend package.json"
        backup_file "frontend/tsconfig.json" "frontend/tsconfig.json" "Frontend tsconfig"
        backup_file "frontend/vite.config.ts" "frontend/vite.config.ts" "Vite config"
        backup_file "frontend/tailwind.config.js" "frontend/tailwind.config.js" "Tailwind config"
        backup_file "frontend/index.html" "frontend/index.html" "Index HTML"
    fi
fi

# ──────────────────────────────────────────────
# Save git state
# ──────────────────────────────────────────────
echo ""
echo "📌 Git State"
GIT_INFO_FILE="$BACKUP_PATH/GIT_STATE.txt"
{
    echo "BitFlow Lend Backup - Git State"
    echo "==================================="
    echo "Timestamp:    $(timestamp 2>/dev/null || date)"
    echo "Branch:       $(git branch --show-current 2>/dev/null || echo 'unknown')"
    echo "Commit:       $(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
    echo "Short commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    echo "Author:       $(git log -1 --format='%an <%ae>' 2>/dev/null || echo 'unknown')"
    echo "Message:      $(git log -1 --format='%s' 2>/dev/null || echo 'unknown')"
    echo "Status:       $(git status --short 2>/dev/null | wc -l | tr -d ' ') uncommitted changes"
    echo ""
    echo "Recent commits:"
    git log --oneline -10 2>/dev/null || echo "  Unable to retrieve"
} > "$GIT_INFO_FILE"
echo "  ✅ Git state saved"

# ──────────────────────────────────────────────
# Create archive
# ──────────────────────────────────────────────
echo ""
echo "📦 Creating archive..."

ARCHIVE_NAME="$BACKUP_NAME.tar.gz"
ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE_NAME"

if command -v tar &>/dev/null; then
    (cd "$BACKUP_DIR" && tar -czf "$ARCHIVE_NAME" "$BACKUP_NAME" 2>/dev/null)
    ARCHIVE_SIZE=$(wc -c < "$ARCHIVE_PATH" 2>/dev/null | tr -d ' ' || echo "0")
    ARCHIVE_SIZE_KB=$((ARCHIVE_SIZE / 1024))
    echo "  ✅ Archive created: $ARCHIVE_PATH ($ARCHIVE_SIZE_KB KB)"

    # Remove uncompressed backup directory
    rm -rf "$BACKUP_PATH"
    echo "  ✅ Cleaned up uncompressed files"
else
    echo "  ⚠️  tar not available — backup saved as directory: $BACKUP_PATH"
    ARCHIVE_PATH="$BACKUP_PATH"
fi

# ──────────────────────────────────────────────
# Cleanup old backups (keep last 10)
# ──────────────────────────────────────────────
echo ""
echo "🧹 Cleanup"
BACKUP_COUNT=$(find "$BACKUP_DIR" -name 'bitflow-backup-*.tar.gz' -o -name 'bitflow-backup-*' -type d 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt 10 ]; then
    echo "  ⚠️  $BACKUP_COUNT backups found. Consider removing older backups."
    echo "  Oldest backups:"
    find "$BACKUP_DIR" -name 'bitflow-backup-*' -maxdepth 1 | sort | head -3 | while read -r old; do
        echo "    $(basename "$old")"
    done
else
    echo "  ✅ $BACKUP_COUNT backup(s) in $BACKUP_DIR/"
fi

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Backup complete!"
echo "   Files backed up: $FILE_COUNT"
echo "   Location: $ARCHIVE_PATH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Restore tip: Extract with 'tar -xzf $ARCHIVE_NAME'"
echo ""
