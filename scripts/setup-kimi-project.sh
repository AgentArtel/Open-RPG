#!/usr/bin/env bash
# =============================================================================
# Open Artel — Kimi Project Setup
# =============================================================================
#
# One-command setup for Kimi Overseer integration. Creates directories,
# installs git hooks, configures API keys, and verifies the setup.
#
# Usage:
#   ./scripts/setup-kimi-project.sh           # Full interactive setup
#   ./scripts/setup-kimi-project.sh --quick   # Skip API key prompt
#   ./scripts/setup-kimi-project.sh --verify  # Just run verification
#   ./scripts/setup-kimi-project.sh --help    # Show help
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors (disable if not a terminal)
if [ -t 1 ]; then
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    BLUE='\033[0;34m'
    BOLD='\033[1m'
    NC='\033[0m'
else
    GREEN='' YELLOW='' RED='' BLUE='' BOLD='' NC=''
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; }

show_help() {
    cat <<'EOF'
Kimi Project Setup — One-command Kimi Overseer integration

Usage:
  ./scripts/setup-kimi-project.sh           # Full interactive setup
  ./scripts/setup-kimi-project.sh --quick   # Skip API key prompt
  ./scripts/setup-kimi-project.sh --verify  # Just run verification
  ./scripts/setup-kimi-project.sh --help    # Show help

Steps performed:
  1. Check prerequisites (kimi CLI, git repo)
  2. Create .agents/ structure if missing
  3. Create .ai/sessions/ and .ai/metrics/ directories
  4. Configure project API key (skippable with --quick)
  5. Install git hooks
  6. Run verification
  7. Print next steps

This script is idempotent — safe to run multiple times.
EOF
    exit 0
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------

QUICK_MODE=false
VERIFY_ONLY=false

for arg in "$@"; do
    case "$arg" in
        --quick)  QUICK_MODE=true ;;
        --verify) VERIFY_ONLY=true ;;
        --help|-h) show_help ;;
        *) fail "Unknown argument: $arg"; echo "Run with --help for usage."; exit 1 ;;
    esac
done

# ---------------------------------------------------------------------------
# Verify-only mode
# ---------------------------------------------------------------------------

if [ "$VERIFY_ONLY" = true ]; then
    if [ -x "$SCRIPT_DIR/verify-kimi-setup.sh" ]; then
        exec "$SCRIPT_DIR/verify-kimi-setup.sh"
    else
        fail "verify-kimi-setup.sh not found or not executable"
        exit 1
    fi
fi

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  Open Artel — Kimi Project Setup${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Check prerequisites
# ---------------------------------------------------------------------------

info "Step 1: Checking prerequisites..."

# Check we're in a git repo
if ! git rev-parse --git-dir >/dev/null 2>&1; then
    fail "Not inside a Git repository. Run this from your project root."
    exit 1
fi
ok "Git repository detected"

# Check kimi CLI
if command -v kimi >/dev/null 2>&1; then
    KIMI_VERSION=$(kimi --version 2>/dev/null || echo "unknown")
    ok "Kimi CLI found: $KIMI_VERSION"
else
    warn "Kimi CLI not found. Install with: pipx install kimi-cli"
    warn "Continuing setup — CLI needed later for overseer features."
fi

# Check python3
if command -v python3 >/dev/null 2>&1; then
    ok "Python 3 found"
else
    warn "Python 3 not found — some features require it"
fi

echo ""

# ---------------------------------------------------------------------------
# Step 2: Create .agents/ structure
# ---------------------------------------------------------------------------

info "Step 2: Creating .agents/ structure..."

DIRS_CREATED=0

for dir in .agents .agents/prompts .agents/skills .agents/subagents; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        DIRS_CREATED=$((DIRS_CREATED + 1))
    fi
done

if [ "$DIRS_CREATED" -gt 0 ]; then
    ok "Created $DIRS_CREATED directories in .agents/"
else
    ok ".agents/ structure already exists"
fi

# Create .gitkeep files for empty directories
for dir in .agents/skills .agents/subagents; do
    if [ ! -f "$dir/.gitkeep" ] && [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
        touch "$dir/.gitkeep"
    fi
done

echo ""

# ---------------------------------------------------------------------------
# Step 3: Create .ai/ coordination directories
# ---------------------------------------------------------------------------

info "Step 3: Creating .ai/ coordination directories..."

DIRS_CREATED=0

for dir in .ai .ai/tasks .ai/reviews .ai/reports .ai/instructions .ai/chats \
           .ai/templates .ai/sessions .ai/sessions/active .ai/sessions/archived \
           .ai/metrics .ai/patterns; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        DIRS_CREATED=$((DIRS_CREATED + 1))
    fi
done

if [ "$DIRS_CREATED" -gt 0 ]; then
    ok "Created $DIRS_CREATED directories in .ai/"
else
    ok ".ai/ structure already exists"
fi

# Create .gitkeep files for empty directories
for dir in .ai/tasks .ai/reviews .ai/reports .ai/instructions .ai/chats \
           .ai/sessions/active .ai/sessions/archived .ai/metrics .ai/patterns; do
    if [ ! -f "$dir/.gitkeep" ] && [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
        touch "$dir/.gitkeep"
    fi
done

# Initialize metrics files if missing
if [ ! -f .ai/metrics/thresholds.json ]; then
    cat > .ai/metrics/thresholds.json <<'THRESHOLDS'
{
  "warn_context_size_bytes": 50000,
  "compact_context_size_bytes": 100000,
  "max_context_size_bytes": 200000,
  "warn_session_age_hours": 4,
  "compact_session_age_hours": 8,
  "warn_file_operations": 50,
  "compact_file_operations": 100
}
THRESHOLDS
    ok "Created default thresholds.json"
fi

if [ ! -f .ai/metrics/context-history.json ]; then
    echo "[]" > .ai/metrics/context-history.json
    ok "Created context-history.json"
fi

if [ ! -f .ai/metrics/wire-metrics.json ]; then
    echo "[]" > .ai/metrics/wire-metrics.json
    ok "Created wire-metrics.json"
fi

echo ""

# ---------------------------------------------------------------------------
# Step 4: Configure project API key
# ---------------------------------------------------------------------------

if [ "$QUICK_MODE" = false ]; then
    info "Step 4: Configuring project API key..."

    if [ -f .env.project ]; then
        ok ".env.project already exists"
    elif [ -x "$SCRIPT_DIR/setup-project-api-key.sh" ]; then
        info "Running API key setup (press Ctrl+C to skip)..."
        "$SCRIPT_DIR/setup-project-api-key.sh" status 2>/dev/null || true
        echo ""
        warn "To configure a project-specific API key later, run:"
        warn "  ./scripts/setup-project-api-key.sh create"
    else
        warn "setup-project-api-key.sh not found — skipping API key setup"
    fi
else
    info "Step 4: Skipping API key setup (--quick mode)"
fi

echo ""

# ---------------------------------------------------------------------------
# Step 5: Install git hooks
# ---------------------------------------------------------------------------

info "Step 5: Installing git hooks..."

if [ -x "$SCRIPT_DIR/install-git-hooks.sh" ]; then
    "$SCRIPT_DIR/install-git-hooks.sh" 2>/dev/null && ok "Git hooks installed" || warn "Git hook installation had warnings"
else
    warn "install-git-hooks.sh not found — skipping hook installation"
fi

echo ""

# ---------------------------------------------------------------------------
# Step 6: Run verification
# ---------------------------------------------------------------------------

info "Step 6: Running verification..."

if [ -x "$SCRIPT_DIR/verify-kimi-setup.sh" ]; then
    "$SCRIPT_DIR/verify-kimi-setup.sh" || true
else
    warn "verify-kimi-setup.sh not found — skipping verification"
fi

echo ""

# ---------------------------------------------------------------------------
# Step 7: Print next steps
# ---------------------------------------------------------------------------

echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  Setup Complete!${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. Start the Kimi Overseer:"
echo "     kimi --agent-file .agents/kimi-overseer.yaml"
echo ""
echo "  2. Create your first sprint session:"
echo "     ./scripts/kimi-session-manager.sh create sprint-1 --sprint 1"
echo ""
echo "  3. Test commit-based communication:"
echo "     git commit --allow-empty -m '[AGENT:claude] [ACTION:update] [TASK:TEST] Setup test'"
echo ""
echo "  4. Run a quick pre-work check anytime:"
echo "     ./scripts/quick-kimi-check.sh"
echo ""
echo "  5. Read the integration guides:"
echo "     - docs/cursor-kimi-integration.md"
echo "     - docs/claude-kimi-coordination.md"
echo ""

