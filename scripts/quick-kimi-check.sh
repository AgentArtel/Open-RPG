#!/usr/bin/env bash
# =============================================================================
# Open Artel — Quick Kimi Check
# =============================================================================
#
# Fast pre-work check (< 5 seconds) to verify Kimi essentials are ready.
# Run this before starting a work session.
#
# Usage:
#   ./scripts/quick-kimi-check.sh
#   ./scripts/quick-kimi-check.sh --help
#
# Exit codes:
#   0 — All checks pass
#   1 — One or more checks failed
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
if [ -t 1 ]; then
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[1;33m'
    NC='\033[0m'
else
    GREEN='' RED='' YELLOW='' NC=''
fi

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    echo "Quick Kimi Check — fast pre-work verification (< 5 seconds)"
    echo ""
    echo "Usage: ./scripts/quick-kimi-check.sh"
    echo ""
    echo "Checks: CLI installed, config exists, agent file present, git hooks installed"
    exit 0
fi

FAILURES=0

# Check 1: Kimi CLI
if command -v kimi >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}  Kimi CLI installed"
else
    echo -e "${RED}FAIL${NC}  Kimi CLI not found (pipx install kimi-cli)"
    FAILURES=$((FAILURES + 1))
fi

# Check 2: Authentication config
if [ -f "$HOME/.kimi/config.toml" ]; then
    echo -e "${GREEN}OK${NC}  Kimi authenticated"
else
    echo -e "${RED}FAIL${NC}  Kimi not authenticated (run 'kimi' then '/login')"
    FAILURES=$((FAILURES + 1))
fi

# Check 3: Agent file
if [ -f .agents/kimi-overseer.yaml ]; then
    echo -e "${GREEN}OK${NC}  Agent file present"
else
    echo -e "${RED}FAIL${NC}  .agents/kimi-overseer.yaml missing"
    FAILURES=$((FAILURES + 1))
fi

# Check 4: Git hooks
GIT_DIR="$(git rev-parse --git-dir 2>/dev/null || echo ".git")"
if [ -x "$GIT_DIR/hooks/post-commit" ]; then
    echo -e "${GREEN}OK${NC}  Git hooks installed"
else
    echo -e "${YELLOW}WARN${NC}  Git hooks not installed (./scripts/install-git-hooks.sh)"
fi

# Check 5: API key available
if [ -f .env.project ] || [ -f .env ] || [ -n "${KIMI_API_KEY:-}" ]; then
    echo -e "${GREEN}OK${NC}  API key available"
else
    echo -e "${YELLOW}WARN${NC}  No API key found (.env.project or .env)"
fi

# Summary
echo ""
if [ "$FAILURES" -gt 0 ]; then
    echo -e "${RED}$FAILURES critical issue(s) found. Run ./scripts/verify-kimi-setup.sh for details.${NC}"
    exit 1
else
    echo -e "${GREEN}Ready to work!${NC}"
    exit 0
fi

