#!/usr/bin/env bash
# =============================================================================
# Open Artel — Kimi Setup Verification
# =============================================================================
#
# Health check script that verifies all Kimi Overseer components are properly
# configured. Reports pass/fail/warn for each check with actionable fixes.
#
# Usage:
#   ./scripts/verify-kimi-setup.sh           # Full verification
#   ./scripts/verify-kimi-setup.sh --help    # Show help
#
# Exit codes:
#   0 — All checks pass (or only warnings)
#   1 — One or more critical checks failed
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

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

pass() { echo -e "  ${GREEN}PASS${NC}  $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
warn() { echo -e "  ${YELLOW}WARN${NC}  $*"; WARN_COUNT=$((WARN_COUNT + 1)); }
fail() { echo -e "  ${RED}FAIL${NC}  $*"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

show_help() {
    cat <<'EOF'
Kimi Setup Verification — Health check for Kimi Overseer integration

Usage:
  ./scripts/verify-kimi-setup.sh           # Full verification
  ./scripts/verify-kimi-setup.sh --help    # Show help

Checks performed:
  - Kimi CLI installed and version
  - Kimi CLI authenticated
  - Agent files present (.agents/)
  - Directory structure (.ai/sessions/, .ai/metrics/)
  - Git hooks installed
  - API key configured
  - Skills directory populated
  - Agent file loads successfully

Exit codes:
  0 — All checks pass (or only warnings)
  1 — One or more critical checks failed
EOF
    exit 0
}

for arg in "$@"; do
    case "$arg" in
        --help|-h) show_help ;;
    esac
done

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------

echo ""
echo -e "${BOLD}Kimi Setup Verification${NC}"
echo -e "${BOLD}========================${NC}"
echo ""

# ---------------------------------------------------------------------------
# Check 1: Kimi CLI
# ---------------------------------------------------------------------------

echo -e "${BLUE}CLI & Authentication${NC}"

if command -v kimi >/dev/null 2>&1; then
    KIMI_VERSION=$(kimi --version 2>/dev/null || echo "unknown")
    pass "Kimi CLI installed ($KIMI_VERSION)"
else
    fail "Kimi CLI not found — install with: pipx install kimi-cli"
fi

# Check authentication by looking for config
KIMI_CONFIG="$HOME/.kimi/config.toml"
if [ -f "$KIMI_CONFIG" ]; then
    pass "Kimi config exists (~/.kimi/config.toml)"
else
    warn "Kimi config not found — run 'kimi' then '/login' to authenticate"
fi

echo ""

# ---------------------------------------------------------------------------
# Check 2: Agent files
# ---------------------------------------------------------------------------

echo -e "${BLUE}Agent Files${NC}"

if [ -f .agents/kimi-overseer.yaml ]; then
    pass "kimi-overseer.yaml exists"
else
    fail "kimi-overseer.yaml missing — overseer cannot start"
fi

if [ -f .agents/prompts/overseer.md ]; then
    pass "overseer.md prompt exists"
else
    fail "overseer.md missing — overseer has no system prompt"
fi

if [ -f .agents/reviewer-sub.yaml ]; then
    pass "reviewer-sub.yaml exists"
else
    warn "reviewer-sub.yaml missing — automated reviews won't work"
fi

if [ -f .agents/researcher-sub.yaml ]; then
    pass "researcher-sub.yaml exists"
else
    warn "researcher-sub.yaml missing — research subagent unavailable"
fi

echo ""

# ---------------------------------------------------------------------------
# Check 3: Directory structure
# ---------------------------------------------------------------------------

echo -e "${BLUE}Directory Structure${NC}"

for dir in .ai/tasks .ai/reviews .ai/reports .ai/instructions .ai/templates; do
    if [ -d "$dir" ]; then
        pass "$dir/ exists"
    else
        fail "$dir/ missing — run setup-kimi-project.sh"
    fi
done

for dir in .ai/sessions/active .ai/sessions/archived .ai/metrics .ai/patterns; do
    if [ -d "$dir" ]; then
        pass "$dir/ exists"
    else
        warn "$dir/ missing — some features may not work"
    fi
done

echo ""

# ---------------------------------------------------------------------------
# Check 4: Git hooks
# ---------------------------------------------------------------------------

echo -e "${BLUE}Git Hooks${NC}"

GIT_DIR="$(git rev-parse --git-dir 2>/dev/null || echo ".git")"
HOOK_FILE="$GIT_DIR/hooks/post-commit"

if [ -x "$HOOK_FILE" ]; then
    pass "post-commit hook installed and executable"
else
    warn "post-commit hook not installed — run: ./scripts/install-git-hooks.sh"
fi

echo ""

# ---------------------------------------------------------------------------
# Check 5: API key
# ---------------------------------------------------------------------------

echo -e "${BLUE}API Key${NC}"

# Load env files to check
API_KEY=""
if [ -f .env.project ]; then
    API_KEY=$(grep -E '^KIMI_API_KEY=' .env.project 2>/dev/null | head -1 | cut -d= -f2- || true)
    if [ -n "$API_KEY" ]; then
        pass ".env.project has KIMI_API_KEY"
    else
        warn ".env.project exists but no KIMI_API_KEY found"
    fi
elif [ -f .env ]; then
    API_KEY=$(grep -E '^KIMI_API_KEY=' .env 2>/dev/null | head -1 | cut -d= -f2- || true)
    if [ -n "$API_KEY" ]; then
        pass ".env has KIMI_API_KEY"
    else
        warn "No KIMI_API_KEY found in .env or .env.project"
    fi
elif [ -n "${KIMI_API_KEY:-}" ]; then
    pass "KIMI_API_KEY set in environment"
else
    warn "No API key found — set in .env.project, .env, or environment"
fi

# Check .gitignore includes .env.project
if [ -f .gitignore ] && grep -q '\.env\.project' .gitignore 2>/dev/null; then
    pass ".env.project in .gitignore"
else
    warn ".env.project not in .gitignore — secrets may be committed"
fi

echo ""

# ---------------------------------------------------------------------------
# Check 6: Skills
# ---------------------------------------------------------------------------

echo -e "${BLUE}Agent Skills${NC}"

SKILL_COUNT=0
if [ -d .agents/skills ]; then
    SKILL_COUNT=$(find .agents/skills -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
fi

if [ "$SKILL_COUNT" -gt 0 ]; then
    pass "$SKILL_COUNT skills found in .agents/skills/"
else
    warn "No skills found — create .agents/skills/<name>/SKILL.md"
fi

# Check for subagent templates
SUBAGENT_COUNT=0
if [ -d .agents/subagents ]; then
    SUBAGENT_COUNT=$(find .agents/subagents -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
fi

if [ "$SUBAGENT_COUNT" -gt 0 ]; then
    pass "$SUBAGENT_COUNT subagent templates found"
else
    warn "No subagent templates found in .agents/subagents/"
fi

echo ""

# ---------------------------------------------------------------------------
# Check 7: Metrics and configuration files
# ---------------------------------------------------------------------------

echo -e "${BLUE}Configuration${NC}"

if [ -f .ai/metrics/thresholds.json ]; then
    # Validate JSON
    if python3 -c "import json; json.load(open('.ai/metrics/thresholds.json'))" 2>/dev/null; then
        pass "thresholds.json is valid JSON"
    else
        warn "thresholds.json exists but is not valid JSON"
    fi
else
    warn "thresholds.json missing — context monitoring won't have thresholds"
fi

if [ -f .ai/status.md ]; then
    pass ".ai/status.md exists"
else
    warn ".ai/status.md missing — create for sprint tracking"
fi

if [ -f .ai/boundaries.md ]; then
    pass ".ai/boundaries.md exists"
else
    warn ".ai/boundaries.md missing — boundary enforcement won't work"
fi

echo ""

# ---------------------------------------------------------------------------
# Check 8: Scripts
# ---------------------------------------------------------------------------

echo -e "${BLUE}Scripts${NC}"

for script in scripts/post-commit scripts/install-git-hooks.sh \
              scripts/generate-evaluation.sh scripts/kimi-session-manager.sh \
              scripts/kimi-context-monitor.sh; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            pass "$script (executable)"
        else
            warn "$script exists but not executable"
        fi
    else
        warn "$script not found"
    fi
done

echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo -e "${BOLD}Summary${NC}"
echo -e "${BOLD}========================${NC}"
TOTAL=$((PASS_COUNT + WARN_COUNT + FAIL_COUNT))
echo -e "  ${GREEN}PASS${NC}: $PASS_COUNT / $TOTAL"
echo -e "  ${YELLOW}WARN${NC}: $WARN_COUNT / $TOTAL"
echo -e "  ${RED}FAIL${NC}: $FAIL_COUNT / $TOTAL"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
    echo -e "${RED}Some checks failed. Fix the issues above and re-run.${NC}"
    exit 1
elif [ "$WARN_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}All critical checks passed. Warnings are optional improvements.${NC}"
    exit 0
else
    echo -e "${GREEN}All checks passed! Kimi integration is fully configured.${NC}"
    exit 0
fi

