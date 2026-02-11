#!/usr/bin/env bash
# =============================================================================
# Open Artel — Project Structure Comparator
# =============================================================================
#
# Compares the current project structure against a past configuration to
# identify similarities, differences, and suggest adaptations.
#
# Usage:
#   ./scripts/compare-project-structure.sh <config-name>
#   ./scripts/compare-project-structure.sh Even-Openclaw
#   ./scripts/compare-project-structure.sh --list
#   ./scripts/compare-project-structure.sh help
#
# Output:
#   .ai/reports/structure-comparison-<config-name>.md
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

PAST_CONFIGS_DIR="past-configurations"
REPORTS_DIR=".ai/reports"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------

show_help() {
    cat << 'EOF'
Open Artel — Project Structure Comparator

Compares the current project structure against a past configuration to
identify similarities, differences, and suggest adaptations.

USAGE:
    ./scripts/compare-project-structure.sh <config-name>
    ./scripts/compare-project-structure.sh --list
    ./scripts/compare-project-structure.sh help

COMMANDS:
    <config-name>   Compare current project against the named past configuration
    --list          List available past configurations
    help            Show this help message

EXAMPLES:
    ./scripts/compare-project-structure.sh Even-Openclaw

OUTPUT:
    .ai/reports/structure-comparison-<config-name>.md
EOF
}

# ---------------------------------------------------------------------------
# List available past configurations
# ---------------------------------------------------------------------------

list_configs() {
    info "Available past configurations:"
    echo ""
    for dir in "$PAST_CONFIGS_DIR"/*/; do
        if [ -d "$dir" ]; then
            local name
            name="$(basename "$dir")"
            echo -e "  ${CYAN}${name}${NC}"
        fi
    done
    echo ""
}

# ---------------------------------------------------------------------------
# Check if a file or directory exists in a path
# ---------------------------------------------------------------------------

check_exists() {
    local path="$1"
    if [ -e "$path" ]; then
        echo "yes"
    else
        echo "no"
    fi
}

# ---------------------------------------------------------------------------
# Count files in a directory (non-recursive)
# ---------------------------------------------------------------------------

count_files() {
    local dir="$1"
    local pattern="${2:-*}"
    if [ -d "$dir" ]; then
        find "$dir" -maxdepth 1 -name "$pattern" -type f 2>/dev/null | wc -l | tr -d ' '
    else
        echo "0"
    fi
}

# ---------------------------------------------------------------------------
# Extract agent names from boundaries or AGENTS file
# ---------------------------------------------------------------------------

extract_agents() {
    local file="$1"
    if [ -f "$file" ]; then
        grep "^## " "$file" | sed 's/^## //' | head -10
    else
        echo "(not found)"
    fi
}

# ---------------------------------------------------------------------------
# Check for coordination layer components
# ---------------------------------------------------------------------------

check_coordination() {
    local base_dir="$1"
    local label="$2"
    local is_past_config="${3:-false}"

    echo "### ${label} Coordination Layer"
    echo ""
    echo "| Component | Present |"
    echo "|-----------|---------|"

    # Check for key coordination files and directories
    # Past configs may store files at root level (e.g., status.md instead of .ai/status.md)
    local items=(
        ".ai/status.md:Sprint status tracking"
        ".ai/boundaries.md:File ownership map"
        ".ai/tasks:Task briefs directory"
        ".ai/templates:Templates directory"
        ".ai/reviews:Review feedback directory"
        ".ai/reports:Reports directory"
        ".ai/instructions:Instructions directory"
        ".ai/chats:Chat logs directory"
        ".ai/sessions:Session management"
        ".ai/metrics:Metrics tracking"
        ".ai/patterns:Pattern library"
        ".ai/lessons:Lessons learned"
        "AGENTS.md:Agent roles definition"
        "CLAUDE.md:Orchestrator config"
        ".cursor/rules:Cursor governance rules"
        ".agents:Kimi agent definitions"
        "scripts:Automation scripts"
        "docs:Documentation"
        ".github/workflows:CI/CD workflows"
    )

    for item in "${items[@]}"; do
        local path="${item%%:*}"
        local desc="${item#*:}"
        local full_path="${base_dir}/${path}"
        local present
        present=$(check_exists "$full_path")

        # For past configs, also check at root level (without .ai/ prefix)
        if [ "$present" = "no" ] && [ "$is_past_config" = "true" ]; then
            local alt_path
            alt_path="${base_dir}/$(echo "$path" | sed 's|^\.ai/||')"
            present=$(check_exists "$alt_path")
        fi

        if [ "$present" = "yes" ]; then
            echo "| ${desc} (\`${path}\`) | Yes |"
        else
            echo "| ${desc} (\`${path}\`) | No |"
        fi
    done
    echo ""
}

# ---------------------------------------------------------------------------
# Compare task formats
# ---------------------------------------------------------------------------

compare_task_format() {
    local current_tasks="$1"
    local past_tasks="$2"

    echo "### Task Format Comparison"
    echo ""

    local current_count=0
    local past_count=0
    local current_has_template="no"
    local past_has_template="no"

    if [ -d "$current_tasks" ]; then
        current_count=$(find "$current_tasks" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    fi
    if [ -d "$past_tasks" ]; then
        past_count=$(find "$past_tasks" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    fi

    if [ -f ".ai/templates/task.md" ]; then
        current_has_template="yes"
    fi
    # Check for task template in past config
    if [ -f "${past_tasks}/../templates/task.md" ] || [ -f "${past_tasks}/../templates/multi-agent-starter/AGENTS.md" ]; then
        past_has_template="yes"
    fi

    echo "| Aspect | Current Project | Past Config |"
    echo "|--------|----------------|-------------|"
    echo "| Task count | ${current_count} | ${past_count} |"
    echo "| Has task template | ${current_has_template} | ${past_has_template} |"

    # Check task field usage in past tasks
    if [ -d "$past_tasks" ] && [ "$past_count" -gt 0 ]; then
        local has_status
        has_status=$(grep -rl "Status" "$past_tasks" 2>/dev/null | wc -l | tr -d ' ')
        local has_assigned
        has_assigned=$(grep -rl "Assigned" "$past_tasks" 2>/dev/null | wc -l | tr -d ' ')
        local has_priority
        has_priority=$(grep -rl "Priority" "$past_tasks" 2>/dev/null | wc -l | tr -d ' ')
        local has_acceptance
        has_acceptance=$(grep -rli "acceptance" "$past_tasks" 2>/dev/null | wc -l | tr -d ' ')

        echo "| Tasks with Status field | — | ${has_status}/${past_count} |"
        echo "| Tasks with Assigned field | — | ${has_assigned}/${past_count} |"
        echo "| Tasks with Priority field | — | ${has_priority}/${past_count} |"
        echo "| Tasks with Acceptance Criteria | — | ${has_acceptance}/${past_count} |"
    fi

    echo ""
}

# ---------------------------------------------------------------------------
# Compare agent roles
# ---------------------------------------------------------------------------

compare_agent_roles() {
    local current_agents="$1"
    local past_boundaries="$2"

    echo "### Agent Roles Comparison"
    echo ""

    echo "**Current Project Agents:**"
    echo ""
    if [ -f "$current_agents" ]; then
        # Extract agent role headers
        grep "^### " "$current_agents" | sed 's/^### /- /' | head -10
    else
        echo "- (AGENTS.md not found)"
    fi
    echo ""

    echo "**Past Config Agents:**"
    echo ""
    if [ -f "$past_boundaries" ]; then
        grep "^## " "$past_boundaries" | sed 's/^## /- /' | head -10
    else
        echo "- (boundaries.md not found)"
    fi
    echo ""
}

# ---------------------------------------------------------------------------
# Generate comparison report
# ---------------------------------------------------------------------------

generate_comparison() {
    local config_name="$1"
    local config_dir="$2"
    local output_file="$3"

    cat > "$output_file" << HEADER
# Project Structure Comparison: Current vs ${config_name}

**Generated**: $(date +%Y-%m-%d)
**Current Project**: $(basename "$PROJECT_ROOT")
**Past Config**: past-configurations/${config_name}/

---

## Overview

This report compares the current project structure against the ${config_name} past configuration. Use it to identify patterns to adopt, adapt, or skip.

---

HEADER

    # Coordination layer comparison
    check_coordination "$PROJECT_ROOT" "Current Project" "false" >> "$output_file"
    check_coordination "$config_dir" "Past Config (${config_name})" "true" >> "$output_file"

    # Agent roles comparison
    compare_agent_roles "AGENTS.md" "$config_dir/boundaries.md" >> "$output_file"

    # Task format comparison
    compare_task_format ".ai/tasks" "$config_dir/tasks" >> "$output_file"

    # --- Similarities ---
    cat >> "$output_file" << 'SECTION'
---

## Similarities

SECTION

    local sim_count=0

    # Check for common coordination components
    # Check for boundaries/AGENTS (past config may have at root level)
    if [ -f "AGENTS.md" ] && { [ -f "$config_dir/boundaries.md" ] || [ -f "$config_dir/.ai/boundaries.md" ]; }; then
        echo "- Both define explicit agent roles and file ownership" >> "$output_file"
        sim_count=$((sim_count + 1))
    fi

    # Check for tasks directory (past config may have at root level)
    if [ -d ".ai/tasks" ] && { [ -d "$config_dir/tasks" ] || [ -d "$config_dir/.ai/tasks" ]; }; then
        echo "- Both use task-based work decomposition in \`.ai/tasks/\`" >> "$output_file"
        sim_count=$((sim_count + 1))
    fi

    # Check for status.md (past config may have at root level)
    if [ -f ".ai/status.md" ] && { [ -f "$config_dir/status.md" ] || [ -f "$config_dir/.ai/status.md" ]; }; then
        echo "- Both track sprint progress in \`.ai/status.md\`" >> "$output_file"
        sim_count=$((sim_count + 1))
    fi

    if [ -d ".cursor/rules" ] && [ -d "$config_dir/templates/starter-cursor-rules" ]; then
        echo "- Both use Cursor governance rules (\`.cursor/rules/\`)" >> "$output_file"
        sim_count=$((sim_count + 1))
    fi

    if [ -d ".agents" ]; then
        echo "- Current project has Kimi agent definitions (evolved from past config)" >> "$output_file"
        sim_count=$((sim_count + 1))
    fi

    if [ "$sim_count" -eq 0 ]; then
        echo "- No structural similarities detected (this may be a very different project type)" >> "$output_file"
    fi

    echo "" >> "$output_file"

    # --- Differences ---
    cat >> "$output_file" << 'SECTION'
---

## Differences

SECTION

    local diff_count=0

    # Check for components in past but not current
    if [ -f "$config_dir/CURSOR_WORKFORCE.md" ] && [ ! -f ".ai/CURSOR_WORKFORCE.md" ]; then
        echo "- Past config has \`CURSOR_WORKFORCE.md\` (workforce protocol) — current project does not" >> "$output_file"
        diff_count=$((diff_count + 1))
    fi

    if [ -f "$config_dir/lovable-knowledge.md" ] && [ ! -f ".ai/lovable-knowledge.md" ]; then
        echo "- Past config has \`lovable-knowledge.md\` — current project does not" >> "$output_file"
        diff_count=$((diff_count + 1))
    fi

    if [ -d "$config_dir/walkthroughs" ] && [ ! -d "walkthroughs" ]; then
        echo "- Past config has \`walkthroughs/\` directory with setup guides — current project does not" >> "$output_file"
        diff_count=$((diff_count + 1))
    fi

    if [ -d "$config_dir/project-vision" ] && [ ! -d ".ai/project-vision" ]; then
        echo "- Past config has \`project-vision/\` with architecture docs — consider creating one" >> "$output_file"
        diff_count=$((diff_count + 1))
    fi

    # Check for components in current but not past
    if [ -d ".agents" ] && [ ! -d "$config_dir/../.agents" ]; then
        echo "- Current project has \`.agents/\` (Kimi integration) — past config predates this" >> "$output_file"
        diff_count=$((diff_count + 1))
    fi

    if [ -d ".github/workflows" ] && [ ! -d "$config_dir/../.github" ]; then
        echo "- Current project has GitHub Actions workflows — past config does not" >> "$output_file"
        diff_count=$((diff_count + 1))
    fi

    if [ -d ".ai/sessions" ] && [ ! -d "$config_dir/sessions" ]; then
        echo "- Current project has session management — past config does not" >> "$output_file"
        diff_count=$((diff_count + 1))
    fi

    if [ -d ".ai/metrics" ] && [ ! -d "$config_dir/metrics" ]; then
        echo "- Current project has metrics tracking — past config does not" >> "$output_file"
        diff_count=$((diff_count + 1))
    fi

    # Compare task counts
    local current_tasks=0
    local past_tasks=0
    if [ -d ".ai/tasks" ]; then
        current_tasks=$(find ".ai/tasks" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    fi
    if [ -d "$config_dir/tasks" ]; then
        past_tasks=$(find "$config_dir/tasks" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    fi
    if [ "$current_tasks" -ne "$past_tasks" ]; then
        echo "- Task count differs: current has ${current_tasks}, past had ${past_tasks}" >> "$output_file"
        diff_count=$((diff_count + 1))
    fi

    if [ "$diff_count" -eq 0 ]; then
        echo "- No significant structural differences detected" >> "$output_file"
    fi

    echo "" >> "$output_file"

    # --- Gaps ---
    cat >> "$output_file" << 'SECTION'
---

## Gaps (Present in Past, Missing in Current)

SECTION

    local gap_count=0

    if [ ! -f ".ai/boundaries.md" ] && [ -f "$config_dir/boundaries.md" ]; then
        echo "- **Missing \`boundaries.md\`**: Past config had explicit file ownership. Generate one during bootstrap." >> "$output_file"
        gap_count=$((gap_count + 1))
    fi

    if [ ! -d ".ai/project-vision" ] && [ -d "$config_dir/project-vision" ]; then
        echo "- **Missing project vision**: Past config had \`project-vision/README.md\` with architecture diagram. Consider creating one." >> "$output_file"
        gap_count=$((gap_count + 1))
    fi

    if [ ! -f ".ai/CURSOR_WORKFORCE.md" ] && [ -f "$config_dir/CURSOR_WORKFORCE.md" ]; then
        echo "- **Missing workforce protocol**: Past config had \`CURSOR_WORKFORCE.md\` with Manager/Task Chat setup. Consider adopting." >> "$output_file"
        gap_count=$((gap_count + 1))
    fi

    if [ "$gap_count" -eq 0 ]; then
        echo "No significant gaps detected — current project has all components from past config." >> "$output_file"
    fi

    echo "" >> "$output_file"

    # --- Suggested Adaptations ---
    cat >> "$output_file" << SECTION

---

## Suggested Adaptations

Based on the comparison with ${config_name}:

SECTION

    local adapt_num=1

    # Always suggest studying task format
    if [ -d "$config_dir/tasks" ]; then
        cat >> "$output_file" << ADAPT
### ${adapt_num}. Study Task Brief Format

The past config has $(find "$config_dir/tasks" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ') task files. Read 2-3 of them to understand:
- How acceptance criteria are structured
- How dependencies are declared
- What "Do NOT" sections look like
- How handoff notes capture decisions

**Recommended**: Read \`past-configurations/${config_name}/tasks/TASK-P4-01.md\` (a well-structured task)

ADAPT
        adapt_num=$((adapt_num + 1))
    fi

    # Suggest phased approach if past used it
    if grep -qi "phase" "$config_dir/status.md" 2>/dev/null; then
        cat >> "$output_file" << ADAPT
### ${adapt_num}. Adopt Phased Approach

${config_name} used a phased approach (P1, P2, P3, P4) that worked well. Consider:
- Phase 1: Foundation / Proof of Concept
- Phase 2: Core features
- Phase 3: Integration / Real data
- Phase 4: Polish / Advanced features

Each phase should be independently shippable and have its own task table in \`status.md\`.

ADAPT
        adapt_num=$((adapt_num + 1))
    fi

    # Suggest boundaries if past had them
    if [ -f "$config_dir/boundaries.md" ]; then
        cat >> "$output_file" << ADAPT
### ${adapt_num}. Generate Comprehensive Boundaries

${config_name} mapped $(grep -c "| \`" "$config_dir/boundaries.md" 2>/dev/null || echo "many") files to agents. Key principles:
- Map by function (what the code does), not by location (where it lives)
- Include a "DO NOT EDIT" section for auto-generated files
- Every file maps to exactly one agent
- Review and update boundaries when adding new directories

ADAPT
        adapt_num=$((adapt_num + 1))
    fi

    # Suggest escalation protocol
    if [ -f "$config_dir/tasks/TASK-ESCALATE-CHAT-REGRESSION.md" ]; then
        cat >> "$output_file" << ADAPT
### ${adapt_num}. Prepare Escalation Protocol

${config_name} needed an escalation task for a critical regression. Have a template ready:
- Clear problem statement with reproduction steps
- What has already been tried (prevents re-work)
- Specific files to investigate
- Success criteria for the fix

Read \`past-configurations/${config_name}/tasks/TASK-ESCALATE-CHAT-REGRESSION.md\` for the format.

ADAPT
        adapt_num=$((adapt_num + 1))
    fi

    ok "Comparison report generated: $output_file"
}

# ---------------------------------------------------------------------------
# Main: Compare current project against a past configuration
# ---------------------------------------------------------------------------

compare_structure() {
    local config_name="$1"
    local config_dir="${PAST_CONFIGS_DIR}/${config_name}"

    # Validate the configuration exists
    if [ ! -d "$config_dir" ]; then
        err "Past configuration not found: $config_dir"
        echo ""
        list_configs
        exit 1
    fi

    info "Comparing current project against: ${config_name}"
    echo ""

    # Create reports directory if needed
    mkdir -p "$REPORTS_DIR"

    # Generate the comparison report
    local output_file="${REPORTS_DIR}/structure-comparison-${config_name}.md"
    generate_comparison "$config_name" "$config_dir" "$output_file"

    echo ""
    info "Comparison report: ${output_file}"
    info "Review the report and decide which adaptations to apply."
}

# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

case "${1:-help}" in
    help|--help|-h)
        show_help
        ;;
    --list|-l)
        list_configs
        ;;
    *)
        compare_structure "$1"
        ;;
esac

