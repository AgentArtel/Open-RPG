#!/usr/bin/env bash
# =============================================================================
# Open Artel — Upstream Sync Script
# =============================================================================
#
# Pulls the latest generic files (scripts, docs, templates, patterns, skills,
# subagent templates, workflows) from the open-artel-project-setup starter kit
# into the current project.  Customized files (AGENTS.md, .cursor/rules/, etc.)
# are NOT overwritten — the script shows a diff so you can merge manually.
#
# Usage:
#   ./scripts/sync-upstream.sh                # Sync generic files
#   ./scripts/sync-upstream.sh --dry-run      # Show what would change
#   ./scripts/sync-upstream.sh --diff         # Show diff for customized files
#   ./scripts/sync-upstream.sh --force        # Overwrite everything (caution!)
#   ./scripts/sync-upstream.sh --help         # Show this help
#
# Configuration:
#   Set OPEN_ARTEL_UPSTREAM in .env or .env.project to override the default
#   repo URL.  Default: https://github.com/AgentArtel/open-artel-project-setup.git
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Load environment for OPEN_ARTEL_UPSTREAM override
if [ -f "$PROJECT_ROOT/.env.project" ]; then
    set -a; source "$PROJECT_ROOT/.env.project"; set +a
fi
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a; source "$PROJECT_ROOT/.env"; set +a
fi

# Upstream repo URL (override with OPEN_ARTEL_UPSTREAM env var)
UPSTREAM_REPO="${OPEN_ARTEL_UPSTREAM:-https://github.com/AgentArtel/open-artel-project-setup.git}"
UPSTREAM_BRANCH="${OPEN_ARTEL_UPSTREAM_BRANCH:-main}"

# Local cache directory for the upstream clone
CACHE_DIR="$PROJECT_ROOT/.git/open-artel-upstream"

# Starter kit path inside the upstream repo
STARTER_KIT_PATH="setups/multi-agent-starter"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Flags
DRY_RUN=false
DIFF_ONLY=false
FORCE=false

# Counters
FILES_UPDATED=0
FILES_SKIPPED=0
FILES_NEW=0

# ---------------------------------------------------------------------------
# Generic files — always safe to update (no project-specific content)
# ---------------------------------------------------------------------------

GENERIC_DIRS=(
    "scripts"
    "docs"
    ".ai/templates"
    ".ai/patterns"
    ".agents/skills"
    ".agents/subagents"
    ".agents/prompts"
    ".github/workflows"
)

# Individual generic files that live at the root of the starter kit
GENERIC_FILES=(
    "BOOTSTRAP_PLAYBOOK.md"
)

# ---------------------------------------------------------------------------
# Customized files — skip by default, show diff with --diff
# These have [REPLACE] placeholders that the project fills in at bootstrap.
# ---------------------------------------------------------------------------

CUSTOMIZED_FILES=(
    "AGENTS.md"
    "CLAUDE.md"
    ".cursor/rules/00-project-context.mdc"
    ".cursor/rules/05-agent-boundaries.mdc"
    ".cursor/rules/06-task-protocol.mdc"
    ".cursor/rules/07-kimi-integration.mdc"
    ".cursor/rules/07-workforce-protocol.mdc"
    ".agents/kimi-overseer.yaml"
    ".agents/reviewer-sub.yaml"
    ".agents/researcher-sub.yaml"
)

# ---------------------------------------------------------------------------
# Never-touch files — project-specific data, never overwritten
# ---------------------------------------------------------------------------
# .ai/tasks/, .ai/reviews/, .ai/reports/, .ai/chats/, .ai/instructions/,
# .ai/ideas/, .ai/sessions/, .ai/metrics/, .ai/status.md, .ai/boundaries.md

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SYNC]${NC} $*"; }
log_skip()    { echo -e "${YELLOW}[SKIP]${NC} $*"; }
log_new()     { echo -e "${CYAN}[NEW]${NC}  $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERR]${NC}  $*"; }

show_help() {
    echo "Open Artel — Upstream Sync Script"
    echo ""
    echo "Usage:"
    echo "  ./scripts/sync-upstream.sh              Sync generic files from upstream"
    echo "  ./scripts/sync-upstream.sh --dry-run     Show what would change (no writes)"
    echo "  ./scripts/sync-upstream.sh --diff        Show diff for customized files"
    echo "  ./scripts/sync-upstream.sh --force       Overwrite everything including customized"
    echo "  ./scripts/sync-upstream.sh --help        Show this help"
    echo ""
    echo "Configuration:"
    echo "  OPEN_ARTEL_UPSTREAM          Override upstream repo URL"
    echo "  OPEN_ARTEL_UPSTREAM_BRANCH   Override upstream branch (default: main)"
    echo ""
    echo "File categories:"
    echo "  Generic (auto-updated):  scripts/, docs/, .ai/templates/, .ai/patterns/,"
    echo "                           .agents/skills/, .agents/subagents/, .agents/prompts/,"
    echo "                           .github/workflows/, BOOTSTRAP_PLAYBOOK.md"
    echo "  Customized (skip/diff):  AGENTS.md, CLAUDE.md, .cursor/rules/,"
    echo "                           .agents/kimi-overseer.yaml, reviewer-sub.yaml,"
    echo "                           researcher-sub.yaml"
    echo "  Never-touch:             .ai/tasks/, .ai/reviews/, .ai/reports/,"
    echo "                           .ai/chats/, .ai/instructions/, .ai/ideas/,"
    echo "                           .ai/sessions/, .ai/metrics/, .ai/status.md,"
    echo "                           .ai/boundaries.md"
    exit 0
}

# ---------------------------------------------------------------------------
# Clone or update the upstream repo cache
# ---------------------------------------------------------------------------

fetch_upstream() {
    log_info "Upstream: $UPSTREAM_REPO (branch: $UPSTREAM_BRANCH)"

    if [ -d "$CACHE_DIR/.git" ]; then
        log_info "Updating cached upstream repo..."
        (cd "$CACHE_DIR" && git fetch origin "$UPSTREAM_BRANCH" --quiet && git checkout "origin/$UPSTREAM_BRANCH" --quiet) 2>/dev/null || {
            log_warn "Cache update failed — re-cloning..."
            rm -rf "$CACHE_DIR"
        }
    fi

    if [ ! -d "$CACHE_DIR/.git" ]; then
        log_info "Cloning upstream repo (first time — this may take a moment)..."
        git clone --depth 1 --branch "$UPSTREAM_BRANCH" --single-branch \
            "$UPSTREAM_REPO" "$CACHE_DIR" --quiet 2>/dev/null || {
            log_error "Failed to clone upstream repo: $UPSTREAM_REPO"
            log_error "Check that the URL is correct and you have network access."
            exit 1
        }
    fi

    UPSTREAM_DIR="$CACHE_DIR/$STARTER_KIT_PATH"

    if [ ! -d "$UPSTREAM_DIR" ]; then
        log_error "Starter kit not found at $STARTER_KIT_PATH in upstream repo."
        exit 1
    fi

    # Show upstream version info
    local upstream_commit
    upstream_commit="$(cd "$CACHE_DIR" && git rev-parse --short HEAD)"
    local upstream_date
    upstream_date="$(cd "$CACHE_DIR" && git log -1 --format='%ci' | cut -d' ' -f1)"
    log_info "Upstream version: $upstream_commit ($upstream_date)"
    echo ""
}

# ---------------------------------------------------------------------------
# Copy a single file from upstream, respecting dry-run mode
# ---------------------------------------------------------------------------

sync_file() {
    local src="$1"    # Full path in upstream cache
    local dest="$2"   # Relative path in project

    local dest_full="$PROJECT_ROOT/$dest"

    if [ ! -f "$src" ]; then
        return
    fi

    if [ ! -f "$dest_full" ]; then
        # New file — doesn't exist in project yet
        if [ "$DRY_RUN" = "true" ]; then
            log_new "$dest (new file)"
        else
            mkdir -p "$(dirname "$dest_full")"
            cp "$src" "$dest_full"
            # Preserve executable bit
            if [ -x "$src" ]; then
                chmod +x "$dest_full"
            fi
            log_new "$dest"
        fi
        FILES_NEW=$((FILES_NEW + 1))
        return
    fi

    # File exists — check if it differs
    if diff -q "$src" "$dest_full" >/dev/null 2>&1; then
        # Identical — no action needed
        return
    fi

    # File differs — update it
    if [ "$DRY_RUN" = "true" ]; then
        log_success "$dest (changed)"
    else
        cp "$src" "$dest_full"
        if [ -x "$src" ]; then
            chmod +x "$dest_full"
        fi
        log_success "$dest"
    fi
    FILES_UPDATED=$((FILES_UPDATED + 1))
}

# ---------------------------------------------------------------------------
# Sync a directory recursively
# ---------------------------------------------------------------------------

sync_dir() {
    local dir="$1"    # Relative directory path (e.g., "scripts")
    local upstream_path="$UPSTREAM_DIR/$dir"

    if [ ! -d "$upstream_path" ]; then
        log_warn "Directory not found in upstream: $dir"
        return
    fi

    # Find all files in the upstream directory
    while IFS= read -r src_file; do
        # Compute the relative path within the directory
        local rel_path="${src_file#$upstream_path/}"
        local dest_rel="$dir/$rel_path"

        # Skip .gitkeep files
        if [ "$(basename "$rel_path")" = ".gitkeep" ]; then
            continue
        fi

        # Skip test scripts (test-phase-*.sh, test-*.sh) — those are dev-only
        if echo "$rel_path" | grep -qE '^test-'; then
            continue
        fi

        sync_file "$src_file" "$dest_rel"
    done < <(find "$upstream_path" -type f | sort)
}

# ---------------------------------------------------------------------------
# Show diff for customized files
# ---------------------------------------------------------------------------

show_customized_diff() {
    echo ""
    echo -e "${BOLD}Customized Files — Upstream vs Local${NC}"
    echo -e "${BOLD}=====================================${NC}"
    echo ""

    local has_diff=false

    for file in "${CUSTOMIZED_FILES[@]}"; do
        local upstream_file="$UPSTREAM_DIR/$file"
        local local_file="$PROJECT_ROOT/$file"

        if [ ! -f "$upstream_file" ]; then
            continue
        fi

        if [ ! -f "$local_file" ]; then
            echo -e "${CYAN}--- $file ---${NC}"
            echo "  (not present locally — upstream has a template)"
            echo ""
            continue
        fi

        if ! diff -q "$upstream_file" "$local_file" >/dev/null 2>&1; then
            has_diff=true
            echo -e "${YELLOW}--- $file ---${NC}"
            # Show a summary diff (first 20 lines of changes)
            diff -u "$local_file" "$upstream_file" \
                --label "local: $file" \
                --label "upstream: $file" \
                2>/dev/null | head -40 || true
            echo ""
        fi
    done

    if [ "$has_diff" = "false" ]; then
        log_info "All customized files match upstream templates (or have been customized)."
    else
        echo ""
        log_info "To update a customized file, manually merge the changes above."
        log_info "Or use --force to overwrite all files (will lose your customizations)."
    fi
}

# ---------------------------------------------------------------------------
# Force sync — overwrite everything including customized files
# ---------------------------------------------------------------------------

force_sync_customized() {
    echo ""
    log_warn "Force mode: overwriting customized files..."
    echo ""

    for file in "${CUSTOMIZED_FILES[@]}"; do
        local upstream_file="$UPSTREAM_DIR/$file"
        sync_file "$upstream_file" "$file"
    done
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
    echo ""
    echo -e "${BOLD}Open Artel — Upstream Sync${NC}"
    echo -e "${BOLD}==========================${NC}"
    echo ""

    if [ "$DRY_RUN" = "true" ]; then
        log_info "Mode: DRY RUN (no files will be modified)"
        echo ""
    fi

    # Step 1: Fetch upstream
    fetch_upstream

    # Step 2: Sync generic directories
    echo -e "${BOLD}Syncing generic files...${NC}"
    echo ""

    for dir in "${GENERIC_DIRS[@]}"; do
        sync_dir "$dir"
    done

    # Step 3: Sync individual generic files
    for file in "${GENERIC_FILES[@]}"; do
        sync_file "$UPSTREAM_DIR/$file" "$file"
    done

    # Step 4: Handle customized files
    if [ "$FORCE" = "true" ]; then
        force_sync_customized
    elif [ "$DIFF_ONLY" = "true" ]; then
        show_customized_diff
    else
        echo ""
        echo -e "${BOLD}Customized files (skipped — use --diff to compare):${NC}"
        for file in "${CUSTOMIZED_FILES[@]}"; do
            local upstream_file="$UPSTREAM_DIR/$file"
            if [ -f "$upstream_file" ]; then
                local local_file="$PROJECT_ROOT/$file"
                if [ -f "$local_file" ]; then
                    if ! diff -q "$upstream_file" "$local_file" >/dev/null 2>&1; then
                        log_skip "$file (differs from upstream)"
                        FILES_SKIPPED=$((FILES_SKIPPED + 1))
                    fi
                else
                    log_skip "$file (not present locally — run --force or copy manually)"
                    FILES_SKIPPED=$((FILES_SKIPPED + 1))
                fi
            fi
        done
    fi

    # Step 5: Summary
    echo ""
    echo -e "${BOLD}Summary${NC}"
    echo -e "${BOLD}=======${NC}"
    echo ""
    echo "  Updated: $FILES_UPDATED"
    echo "  New:     $FILES_NEW"
    echo "  Skipped: $FILES_SKIPPED (customized files)"
    echo ""

    if [ "$DRY_RUN" = "true" ]; then
        log_info "This was a dry run. Run without --dry-run to apply changes."
    elif [ $((FILES_UPDATED + FILES_NEW)) -gt 0 ]; then
        log_info "Files have been updated. Review changes with:"
        echo "  git diff"
        echo ""
        log_info "Then commit:"
        echo "  git add -A && git commit -m '[AGENT:claude] [ACTION:update] [TASK:SYNC] Sync upstream starter kit'"
    else
        log_info "Everything is up to date."
    fi

    if [ "$FILES_SKIPPED" -gt 0 ] && [ "$DIFF_ONLY" = "false" ]; then
        echo ""
        log_info "Run with --diff to see what changed in customized files."
    fi

    echo ""
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------

case "${1:-}" in
    --dry-run)
        DRY_RUN=true
        ;;
    --diff)
        DIFF_ONLY=true
        ;;
    --force)
        FORCE=true
        echo -e "${RED}WARNING: Force mode will overwrite customized files!${NC}"
        echo -e "Press Ctrl+C to cancel, or wait 3 seconds to continue..."
        sleep 3
        ;;
    --help|-h)
        show_help
        ;;
    "")
        # Default: sync generic files only
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Run with --help for usage."
        exit 1
        ;;
esac

main

