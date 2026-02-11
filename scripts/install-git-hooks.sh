#!/usr/bin/env bash
# =============================================================================
# Open Artel — Git Hooks Installation Script
# =============================================================================
#
# Installs the post-commit hook that automates agent workflow routing
# via Kimi Code CLI Print Mode.
#
# Usage:
#   ./scripts/install-git-hooks.sh           # Install hooks
#   ./scripts/install-git-hooks.sh --remove  # Remove hooks
#   ./scripts/install-git-hooks.sh --status  # Check hook status
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project root (parent of scripts/)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Git hooks directory
GIT_DIR="$(cd "$PROJECT_ROOT" && git rev-parse --git-dir 2>/dev/null)" || {
    echo "ERROR: Not a Git repository. Run this from the project root."
    exit 1
}
HOOKS_DIR="$GIT_DIR/hooks"

# Source hook file (versioned in the repo)
HOOK_SOURCE="$SCRIPT_DIR/post-commit"

# Destination hook file
HOOK_DEST="$HOOKS_DIR/post-commit"

# ---------------------------------------------------------------------------
# Color output helpers
# ---------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

install_hooks() {
    echo ""
    echo "========================================="
    echo "  Open Artel — Git Hooks Installer"
    echo "========================================="
    echo ""

    # Step 1: Check prerequisites
    info "Checking prerequisites..."

    # Check for kimi command
    if command -v kimi &>/dev/null; then
        local kimi_version
        kimi_version="$(kimi --version 2>/dev/null || echo 'unknown')"
        success "Kimi Code CLI found: $kimi_version"
    else
        warn "Kimi Code CLI not found."
        warn "Install with: pipx install kimi-cli"
        warn "Hooks will be installed but won't trigger automation until kimi is available."
        echo ""
    fi

    # Check for source hook file
    if [ ! -f "$HOOK_SOURCE" ]; then
        error "Hook source not found: $HOOK_SOURCE"
        error "Make sure you're running this from the project root."
        exit 1
    fi

    # Step 2: Create hooks directory if needed
    if [ ! -d "$HOOKS_DIR" ]; then
        info "Creating hooks directory: $HOOKS_DIR"
        mkdir -p "$HOOKS_DIR"
    fi

    # Step 3: Check for existing hook
    if [ -f "$HOOK_DEST" ]; then
        warn "Existing post-commit hook found at: $HOOK_DEST"
        echo ""
        echo "  Options:"
        echo "    1) Overwrite with Open Artel hook"
        echo "    2) Back up existing hook and install"
        echo "    3) Cancel"
        echo ""

        # Non-interactive mode: default to backup + install
        if [ ! -t 0 ]; then
            info "Non-interactive mode: backing up existing hook and installing."
            cp "$HOOK_DEST" "$HOOK_DEST.backup.$(date +%s)"
            success "Existing hook backed up."
        else
            read -rp "  Choose [1/2/3]: " choice
            case "$choice" in
                1)
                    info "Overwriting existing hook."
                    ;;
                2)
                    local backup="$HOOK_DEST.backup.$(date +%s)"
                    cp "$HOOK_DEST" "$backup"
                    success "Existing hook backed up to: $backup"
                    ;;
                3)
                    info "Installation cancelled."
                    exit 0
                    ;;
                *)
                    error "Invalid choice. Installation cancelled."
                    exit 1
                    ;;
            esac
        fi
    fi

    # Step 4: Copy hook
    info "Installing post-commit hook..."
    cp "$HOOK_SOURCE" "$HOOK_DEST"
    chmod +x "$HOOK_DEST"
    success "Hook installed: $HOOK_DEST"

    # Step 5: Verify
    if [ -x "$HOOK_DEST" ]; then
        success "Hook is executable."
    else
        error "Hook is not executable. Run: chmod +x $HOOK_DEST"
        exit 1
    fi

    # Step 6: Summary
    echo ""
    echo "========================================="
    echo "  Installation Complete"
    echo "========================================="
    echo ""
    echo "  The post-commit hook will now automatically:"
    echo "    - Review agent submissions (ACTION: submit)"
    echo "    - Merge approved work to pre-mortal (ACTION: approve)"
    echo "    - Update sprint reports (ACTION: report)"
    echo ""
    echo "  Commit format:"
    echo "    [AGENT:agent] [ACTION:action] [TASK:task-id] Description"
    echo ""
    echo "  Configuration:"
    echo "    - Async mode: ON (commits return immediately)"
    echo "    - Dry-run: export OPEN_ARTEL_DRY_RUN=true"
    echo "    - Logs: $HOOKS_DIR/post-commit.log"
    echo ""
    echo "  Disable: mv $HOOK_DEST $HOOK_DEST.disabled"
    echo "  Remove:  $0 --remove"
    echo ""

    # Remind about authentication if kimi is installed
    if command -v kimi &>/dev/null; then
        info "Make sure Kimi Code CLI is authenticated."
        info "Run 'kimi' and then '/login' if you haven't already."
    fi
}

remove_hooks() {
    echo ""
    info "Removing Open Artel Git hooks..."

    if [ -f "$HOOK_DEST" ]; then
        rm "$HOOK_DEST"
        success "Removed: $HOOK_DEST"
    else
        warn "No post-commit hook found at: $HOOK_DEST"
    fi

    # Clean up log file
    local log_file="$HOOKS_DIR/post-commit.log"
    if [ -f "$log_file" ]; then
        rm "$log_file"
        success "Removed log: $log_file"
    fi

    echo ""
    success "Git hooks removed."
}

show_status() {
    echo ""
    echo "========================================="
    echo "  Open Artel — Git Hooks Status"
    echo "========================================="
    echo ""

    # Check hook installation
    if [ -f "$HOOK_DEST" ]; then
        if [ -x "$HOOK_DEST" ]; then
            success "post-commit hook: INSTALLED (executable)"
        else
            warn "post-commit hook: INSTALLED (not executable — run: chmod +x $HOOK_DEST)"
        fi
    else
        info "post-commit hook: NOT INSTALLED"
    fi

    # Check for disabled hook
    if [ -f "$HOOK_DEST.disabled" ]; then
        info "post-commit hook: DISABLED (rename to enable)"
    fi

    # Check for backups
    local backups
    backups=$(find "$HOOKS_DIR" -maxdepth 1 -name 'post-commit.backup.*' 2>/dev/null | wc -l | tr -d ' ')
    if [ "$backups" -gt 0 ]; then
        info "Backups found: $backups"
    fi

    # Check kimi
    echo ""
    if command -v kimi &>/dev/null; then
        success "Kimi Code CLI: $(kimi --version 2>/dev/null || echo 'installed')"
    else
        warn "Kimi Code CLI: NOT INSTALLED (hooks won't trigger automation)"
    fi

    # Check log
    local log_file="$HOOKS_DIR/post-commit.log"
    if [ -f "$log_file" ]; then
        local log_lines
        log_lines=$(wc -l < "$log_file" | tr -d ' ')
        info "Log file: $log_file ($log_lines lines)"
        echo ""
        echo "  Last 5 log entries:"
        tail -5 "$log_file" | sed 's/^/    /'
    else
        info "Log file: none (no hooks have run yet)"
    fi

    echo ""
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

case "${1:-}" in
    --remove)
        remove_hooks
        ;;
    --status)
        show_status
        ;;
    --help|-h)
        echo "Usage: $0 [--remove|--status|--help]"
        echo ""
        echo "  (no args)  Install Git hooks"
        echo "  --remove   Remove Git hooks"
        echo "  --status   Show hook status"
        echo "  --help     Show this help"
        ;;
    "")
        install_hooks
        ;;
    *)
        error "Unknown option: $1"
        echo "Usage: $0 [--remove|--status|--help]"
        exit 1
        ;;
esac

