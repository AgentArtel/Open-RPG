#!/usr/bin/env bash
# =============================================================================
# Open Artel — Past Lessons Extractor
# =============================================================================
#
# Analyzes a past configuration directory and extracts structured lessons
# (successful patterns, failed patterns, anti-patterns) into a Markdown file.
#
# Usage:
#   ./scripts/extract-past-lessons.sh <config-name>
#   ./scripts/extract-past-lessons.sh Even-Openclaw
#   ./scripts/extract-past-lessons.sh --list
#   ./scripts/extract-past-lessons.sh help
#
# Output:
#   .ai/lessons/<config-name>-lessons.md
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
LESSONS_DIR=".ai/lessons"

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
Open Artel — Past Lessons Extractor

Analyzes a past configuration directory and extracts structured lessons
into a Markdown file.

USAGE:
    ./scripts/extract-past-lessons.sh <config-name>
    ./scripts/extract-past-lessons.sh --list
    ./scripts/extract-past-lessons.sh help

COMMANDS:
    <config-name>   Analyze the named past configuration
    --list          List available past configurations
    help            Show this help message

EXAMPLES:
    ./scripts/extract-past-lessons.sh Even-Openclaw
    ./scripts/extract-past-lessons.sh --list

OUTPUT:
    .ai/lessons/<config-name>-lessons.md
EOF
}

# ---------------------------------------------------------------------------
# List available past configurations
# ---------------------------------------------------------------------------

list_configs() {
    info "Available past configurations:"
    echo ""
    local count=0
    for dir in "$PAST_CONFIGS_DIR"/*/; do
        if [ -d "$dir" ]; then
            local name
            name="$(basename "$dir")"
            local task_count=0
            if [ -d "$dir/tasks" ]; then
                task_count=$(find "$dir/tasks" -name "TASK-*" -o -name "LANDING-*" -o -name "SUBMODULE-*" 2>/dev/null | wc -l | tr -d ' ')
            fi
            echo -e "  ${CYAN}${name}${NC} — ${task_count} task files"
            count=$((count + 1))
        fi
    done
    echo ""
    if [ "$count" -eq 0 ]; then
        warn "No past configurations found in $PAST_CONFIGS_DIR/"
    else
        info "Found $count past configuration(s)"
    fi
}

# ---------------------------------------------------------------------------
# Count tasks by status
# ---------------------------------------------------------------------------

count_task_status() {
    local tasks_dir="$1"
    local status_pattern="$2"
    grep -rl "Status.*${status_pattern}" "$tasks_dir" 2>/dev/null | wc -l | tr -d ' '
}

# ---------------------------------------------------------------------------
# Extract phase information from status.md
# ---------------------------------------------------------------------------

extract_phases() {
    local status_file="$1"
    if [ ! -f "$status_file" ]; then
        echo "No status.md found"
        return
    fi

    # Look for phase completion markers
    grep -i "phase\|COMPLETE\|DONE\|PARTIAL\|BLOCKED" "$status_file" 2>/dev/null | head -20
}

# ---------------------------------------------------------------------------
# Analyze task quality
# ---------------------------------------------------------------------------

analyze_tasks() {
    local tasks_dir="$1"
    local config_name="$2"

    if [ ! -d "$tasks_dir" ]; then
        echo "No tasks directory found"
        return
    fi

    local total=0
    local has_acceptance=0
    local has_donot=0
    local has_handoff=0
    local has_depends=0
    local has_blocks=0
    local status_done=0
    local status_review=0
    local status_partial=0
    local status_blocked=0
    local status_pending=0
    local escalations=0
    local multi_review=0

    for task_file in "$tasks_dir"/*.md; do
        [ -f "$task_file" ] || continue
        total=$((total + 1))

        local content
        content="$(cat "$task_file")"

        # Check for acceptance criteria section
        if echo "$content" | grep -qi "acceptance criteria"; then
            has_acceptance=$((has_acceptance + 1))
        fi

        # Check for "Do NOT" section
        if echo "$content" | grep -qi "do not"; then
            has_donot=$((has_donot + 1))
        fi

        # Check for handoff notes with actual content
        if echo "$content" | grep -qi "handoff notes"; then
            has_handoff=$((has_handoff + 1))
        fi

        # Check for dependency declarations
        if echo "$content" | grep -qi "depends on.*TASK\|depends on.*none"; then
            has_depends=$((has_depends + 1))
        fi

        # Check for blocks declarations
        if echo "$content" | grep -qi "blocks.*TASK\|blocks.*none"; then
            has_blocks=$((has_blocks + 1))
        fi

        # Count statuses
        if echo "$content" | grep -qi "status.*DONE\|status.*COMPLETE"; then
            status_done=$((status_done + 1))
        elif echo "$content" | grep -qi "status.*REVIEW"; then
            status_review=$((status_review + 1))
        elif echo "$content" | grep -qi "status.*PARTIAL"; then
            status_partial=$((status_partial + 1))
        elif echo "$content" | grep -qi "status.*BLOCKED\|status.*OPEN"; then
            status_blocked=$((status_blocked + 1))
        elif echo "$content" | grep -qi "status.*PENDING"; then
            status_pending=$((status_pending + 1))
        fi

        # Check for escalation tasks
        if echo "$content" | grep -qi "escalat"; then
            escalations=$((escalations + 1))
        fi

        # Check for multiple review cycles (checked/unchecked acceptance criteria mix)
        local checked
        checked=$(echo "$content" | grep -c "\- \[x\]" 2>/dev/null || true)
        local unchecked
        unchecked=$(echo "$content" | grep -c "\- \[ \]" 2>/dev/null || true)
        if [ "$checked" -gt 0 ] && [ "$unchecked" -gt 0 ]; then
            multi_review=$((multi_review + 1))
        fi
    done

    # Store results in global variables for the report
    TOTAL_TASKS=$total
    TASKS_WITH_ACCEPTANCE=$has_acceptance
    TASKS_WITH_DONOT=$has_donot
    TASKS_WITH_HANDOFF=$has_handoff
    TASKS_WITH_DEPENDS=$has_depends
    TASKS_WITH_BLOCKS=$has_blocks
    STATUS_DONE=$status_done
    STATUS_REVIEW=$status_review
    STATUS_PARTIAL=$status_partial
    STATUS_BLOCKED=$status_blocked
    STATUS_PENDING=$status_pending
    ESCALATION_COUNT=$escalations
    MULTI_REVIEW_COUNT=$multi_review
}

# ---------------------------------------------------------------------------
# Analyze boundaries quality
# ---------------------------------------------------------------------------

analyze_boundaries() {
    local boundaries_file="$1"

    if [ ! -f "$boundaries_file" ]; then
        BOUNDARIES_EXISTS="false"
        BOUNDARIES_AGENTS=0
        BOUNDARIES_FILES=0
        return
    fi

    BOUNDARIES_EXISTS="true"
    # Count agent sections (## headers with agent names)
    BOUNDARIES_AGENTS=$(grep -c "^## " "$boundaries_file" 2>/dev/null || echo "0")
    # Count file entries (lines with | path |)
    BOUNDARIES_FILES=$(grep -c "| \`" "$boundaries_file" 2>/dev/null || echo "0")
}

# ---------------------------------------------------------------------------
# Analyze sprint structure from status.md
# ---------------------------------------------------------------------------

analyze_sprint_structure() {
    local status_file="$1"

    if [ ! -f "$status_file" ]; then
        SPRINT_PHASES=0
        SPRINT_COMPLETED_PHASES=0
        SPRINT_HAS_TABLES="false"
        return
    fi

    local content
    content="$(cat "$status_file")"

    # Count phases mentioned
    SPRINT_PHASES=$(echo "$content" | grep -ci "phase [0-9]\|phase [1-9]" 2>/dev/null || echo "0")

    # Count completed phases
    SPRINT_COMPLETED_PHASES=$(echo "$content" | grep -ci "COMPLETE" 2>/dev/null || echo "0")

    # Check for task tables
    if echo "$content" | grep -q "| # |.*| ID |"; then
        SPRINT_HAS_TABLES="true"
    else
        SPRINT_HAS_TABLES="false"
    fi
}

# ---------------------------------------------------------------------------
# Generate lessons report
# ---------------------------------------------------------------------------

generate_report() {
    local config_name="$1"
    local config_dir="$2"
    local output_file="$3"

    # Calculate percentages safely
    local acceptance_pct=0
    local donot_pct=0
    local depends_pct=0
    local completion_pct=0

    if [ "$TOTAL_TASKS" -gt 0 ]; then
        acceptance_pct=$((TASKS_WITH_ACCEPTANCE * 100 / TOTAL_TASKS))
        donot_pct=$((TASKS_WITH_DONOT * 100 / TOTAL_TASKS))
        depends_pct=$((TASKS_WITH_DEPENDS * 100 / TOTAL_TASKS))
        local completed=$((STATUS_DONE + STATUS_REVIEW))
        completion_pct=$((completed * 100 / TOTAL_TASKS))
    fi

    cat > "$output_file" << REPORT
# Lessons Learned: ${config_name}

**Extracted**: $(date +%Y-%m-%d)
**Source**: past-configurations/${config_name}/
**Script**: scripts/extract-past-lessons.sh

---

## Summary Metrics

| Metric | Value |
|--------|-------|
| Total tasks | ${TOTAL_TASKS} |
| Completed (DONE/REVIEW) | $((STATUS_DONE + STATUS_REVIEW)) (${completion_pct}%) |
| Partial | ${STATUS_PARTIAL} |
| Blocked/Open | ${STATUS_BLOCKED} |
| Pending | ${STATUS_PENDING} |
| Escalations | ${ESCALATION_COUNT} |
| Tasks with acceptance criteria | ${TASKS_WITH_ACCEPTANCE}/${TOTAL_TASKS} (${acceptance_pct}%) |
| Tasks with "Do NOT" section | ${TASKS_WITH_DONOT}/${TOTAL_TASKS} (${donot_pct}%) |
| Tasks with dependencies declared | ${TASKS_WITH_DEPENDS}/${TOTAL_TASKS} (${depends_pct}%) |
| Tasks with partial acceptance (multi-review) | ${MULTI_REVIEW_COUNT} |
| Boundaries file exists | ${BOUNDARIES_EXISTS} |
| Agent sections in boundaries | ${BOUNDARIES_AGENTS} |
| File entries in boundaries | ${BOUNDARIES_FILES} |
| Sprint phases | ${SPRINT_PHASES} |
| Completed phases | ${SPRINT_COMPLETED_PHASES} |
| Sprint uses task tables | ${SPRINT_HAS_TABLES} |

---

## Successful Patterns

REPORT

    # --- Successful patterns ---

    # Phased approach
    if [ "$SPRINT_PHASES" -gt 1 ]; then
        cat >> "$output_file" << PATTERN
### 1. Phased Approach

- **Pattern**: Break work into ${SPRINT_PHASES} distinct phases with increasing complexity
- **Evidence**: ${SPRINT_COMPLETED_PHASES} phases completed in ${config_name}
- **Application**: Use for projects with multiple build targets or complex feature rollouts
- **How**: Define phases in \`.ai/status.md\` with clear scope boundaries. Each phase should be independently shippable.

PATTERN
    fi

    # Explicit file ownership
    if [ "$BOUNDARIES_EXISTS" = "true" ] && [ "$BOUNDARIES_FILES" -gt 10 ]; then
        cat >> "$output_file" << PATTERN
### 2. Explicit File Ownership

- **Pattern**: Map every file to exactly one agent in \`boundaries.md\`
- **Evidence**: ${BOUNDARIES_FILES} files mapped across ${BOUNDARIES_AGENTS} agent sections in ${config_name}
- **Application**: Always generate \`boundaries.md\` during bootstrap — prevents ownership conflicts
- **How**: During Phase 1 of bootstrap, have Claude Code analyze every directory and file, then assign based on function (not location)

PATTERN
    fi

    # Detailed task briefs
    if [ "$acceptance_pct" -gt 70 ]; then
        cat >> "$output_file" << PATTERN
### 3. Detailed Task Briefs with Acceptance Criteria

- **Pattern**: Every task includes testable acceptance criteria and explicit "Do NOT" boundaries
- **Evidence**: ${acceptance_pct}% of tasks had acceptance criteria; ${donot_pct}% had "Do NOT" sections
- **Application**: Use the task template from \`.ai/templates/task.md\` for every task — never skip acceptance criteria
- **How**: Each criterion should be a checkbox (\`- [ ] ...\`) that can be verified independently

PATTERN
    fi

    # Dependency management
    if [ "$depends_pct" -gt 50 ]; then
        cat >> "$output_file" << PATTERN
### 4. Explicit Dependency Declarations

- **Pattern**: Every task declares what it depends on and what it blocks
- **Evidence**: ${depends_pct}% of tasks had explicit dependency declarations
- **Application**: Always fill in "Depends on" and "Blocks" fields — enables parallel work and prevents blocked tasks
- **How**: Use task IDs (e.g., \`TASK-P4-01\`) in dependency fields. Validate no circular dependencies before assignment.

PATTERN
    fi

    # Sprint tables
    if [ "$SPRINT_HAS_TABLES" = "true" ]; then
        cat >> "$output_file" << PATTERN
### 5. Sprint Task Tables in Status

- **Pattern**: Use Markdown tables in \`status.md\` to track tasks per phase with ID, title, assignee, priority, status
- **Evidence**: ${config_name} used task tables for all phases — made sprint progress visible at a glance
- **Application**: Create a table in \`status.md\` for each sprint/phase. Update status column as tasks progress.
- **How**: Format: \`| # | ID | Title | Assigned | Priority | Status | Depends |\`

PATTERN
    fi

    # Handoff notes
    if [ "$TASKS_WITH_HANDOFF" -gt 0 ]; then
        local handoff_pct=$((TASKS_WITH_HANDOFF * 100 / TOTAL_TASKS))
        cat >> "$output_file" << PATTERN
### 6. Handoff Notes in Task Files

- **Pattern**: Agents update task files with handoff notes when completing work
- **Evidence**: ${handoff_pct}% of tasks had handoff notes sections
- **Application**: Always include a Handoff Notes section — it's the primary communication channel between task cycles
- **How**: Include: files changed, decisions made, issues found, verification steps

PATTERN
    fi

    # --- Failed patterns ---

    cat >> "$output_file" << SECTION

---

## Failed Patterns

SECTION

    # Partial completions
    if [ "$STATUS_PARTIAL" -gt 0 ]; then
        cat >> "$output_file" << PATTERN
### 1. Partial Task Completions

- **Pattern**: Tasks that were only partially completed, with remaining work deferred
- **Evidence**: ${STATUS_PARTIAL} task(s) in ${config_name} ended in PARTIAL status
- **Avoid**: Break large tasks into smaller, independently completable units. If a task has 4 specs, consider making each a separate task.
- **Detection**: If a task brief has more than 4 specification items, it may be too large for a single session.

PATTERN
    fi

    # Escalations
    if [ "$ESCALATION_COUNT" -gt 0 ]; then
        cat >> "$output_file" << PATTERN
### 2. Escalation Tasks

- **Pattern**: Tasks that required escalation to a different agent or cross-agent debugging
- **Evidence**: ${ESCALATION_COUNT} escalation(s) in ${config_name}
- **Avoid**: Improve initial task specs to include more context. When a task touches code owned by multiple agents, split it into per-agent subtasks.
- **Detection**: If a task brief references files owned by multiple agents, it likely needs splitting.

PATTERN
    fi

    # Multi-review cycles
    if [ "$MULTI_REVIEW_COUNT" -gt 0 ]; then
        cat >> "$output_file" << PATTERN
### 3. Multi-Review Cycles

- **Pattern**: Tasks where some acceptance criteria passed but others failed, requiring re-work
- **Evidence**: ${MULTI_REVIEW_COUNT} task(s) in ${config_name} had mixed checked/unchecked criteria
- **Avoid**: Make acceptance criteria more specific and testable. Include exact commands to verify each criterion.
- **Detection**: If a criterion says "works correctly" without specifying how to test, it's too vague.

PATTERN
    fi

    # Missing dependencies
    if [ "$depends_pct" -lt 80 ] && [ "$TOTAL_TASKS" -gt 5 ]; then
        local missing_deps=$((TOTAL_TASKS - TASKS_WITH_DEPENDS))
        cat >> "$output_file" << PATTERN
### 4. Missing Dependency Declarations

- **Pattern**: Tasks without explicit dependency information
- **Evidence**: ${missing_deps} task(s) in ${config_name} lacked dependency declarations
- **Avoid**: Always fill in both "Depends on" and "Blocks" fields, even if the value is "none"
- **Detection**: Review all task briefs before sprint start — every task should have these fields filled.

PATTERN
    fi

    # --- Anti-patterns ---

    cat >> "$output_file" << SECTION

---

## Anti-Patterns

### 1. Oversized Tasks

- **Pattern**: Tasks that try to accomplish too much in a single work session
- **Detection**: More than 4-5 specification items, or touching more than 3-4 files
- **Alternative**: Split into focused subtasks. Use phase-scoped IDs (TASK-P3-01a, TASK-P3-01b) for related subtasks.

### 2. Cross-Agent Tasks

- **Pattern**: Tasks that require modifications to files owned by different agents
- **Detection**: Task specs reference files from multiple agent domains (check boundaries.md)
- **Alternative**: Split into per-agent subtasks with clear handoff points. The first subtask produces an interface; the second consumes it.

### 3. Vague Acceptance Criteria

- **Pattern**: Criteria that can't be mechanically verified (e.g., "works correctly", "looks good")
- **Detection**: Criteria without specific commands, values, or observable outcomes
- **Alternative**: Each criterion should specify: what to check, how to check it, what the expected result is.

### 4. Missing "Do NOT" Sections

- **Pattern**: Tasks without explicit out-of-scope boundaries
- **Detection**: No "Do NOT" section in the task brief
- **Alternative**: Always include a "Do NOT" section — it prevents scope creep and boundary violations. List files, directories, and actions that are explicitly out of scope.

### 5. Assumptions Without Verification

- **Pattern**: Task briefs that assume APIs, interfaces, or behaviors without reading source code
- **Detection**: Specs that say "should work like X" without referencing actual code
- **Alternative**: Include "Required Reading" section listing files the agent must read before implementing. See TASK-003 from ${config_name} for a good example.

SECTION

    # --- Recommendations ---

    cat >> "$output_file" << SECTION

---

## Recommendations for New Projects

Based on the analysis of ${config_name}:

1. **Use the phased approach** for any project with more than 10 tasks
2. **Generate boundaries.md early** — during bootstrap, before any implementation
3. **Require acceptance criteria** on every task — no exceptions
4. **Include "Do NOT" sections** to prevent scope creep
5. **Declare dependencies explicitly** — enables parallel work and prevents blocking
6. **Keep tasks single-session sized** — if it has more than 4 specs, split it
7. **Use phase-scoped task IDs** (TASK-P1-01, TASK-P2-01) for easy tracking
8. **Include "Required Reading"** for tasks that touch unfamiliar code
9. **Update handoff notes** when completing tasks — this is the primary record
10. **Track progress in status.md tables** — visual progress tracking prevents tasks from being forgotten

SECTION

    ok "Lessons extracted to: $output_file"
}

# ---------------------------------------------------------------------------
# Main: Extract lessons from a past configuration
# ---------------------------------------------------------------------------

extract_lessons() {
    local config_name="$1"
    local config_dir="${PAST_CONFIGS_DIR}/${config_name}"

    # Validate the configuration exists
    if [ ! -d "$config_dir" ]; then
        err "Past configuration not found: $config_dir"
        echo ""
        list_configs
        exit 1
    fi

    info "Analyzing past configuration: ${config_name}"
    echo ""

    # Create lessons directory if needed
    mkdir -p "$LESSONS_DIR"

    # Analyze task quality
    info "Analyzing task files..."
    if [ -d "$config_dir/tasks" ]; then
        analyze_tasks "$config_dir/tasks" "$config_name"
        ok "Analyzed ${TOTAL_TASKS} tasks"
    else
        warn "No tasks directory found"
        TOTAL_TASKS=0
        TASKS_WITH_ACCEPTANCE=0
        TASKS_WITH_DONOT=0
        TASKS_WITH_HANDOFF=0
        TASKS_WITH_DEPENDS=0
        TASKS_WITH_BLOCKS=0
        STATUS_DONE=0
        STATUS_REVIEW=0
        STATUS_PARTIAL=0
        STATUS_BLOCKED=0
        STATUS_PENDING=0
        ESCALATION_COUNT=0
        MULTI_REVIEW_COUNT=0
    fi

    # Analyze boundaries
    info "Analyzing boundaries..."
    if [ -f "$config_dir/boundaries.md" ]; then
        analyze_boundaries "$config_dir/boundaries.md"
        ok "Boundaries: ${BOUNDARIES_FILES} files across ${BOUNDARIES_AGENTS} agents"
    else
        warn "No boundaries.md found"
        BOUNDARIES_EXISTS="false"
        BOUNDARIES_AGENTS=0
        BOUNDARIES_FILES=0
    fi

    # Analyze sprint structure
    info "Analyzing sprint structure..."
    if [ -f "$config_dir/status.md" ]; then
        analyze_sprint_structure "$config_dir/status.md"
        ok "Sprint: ${SPRINT_PHASES} phases, ${SPRINT_COMPLETED_PHASES} completed"
    else
        warn "No status.md found"
        SPRINT_PHASES=0
        SPRINT_COMPLETED_PHASES=0
        SPRINT_HAS_TABLES="false"
    fi

    echo ""

    # Generate the report
    local output_file="${LESSONS_DIR}/${config_name}-lessons.md"
    info "Generating lessons report..."
    generate_report "$config_name" "$config_dir" "$output_file"

    echo ""
    info "Lessons file: ${output_file}"
    info "Review the output and refine based on your own reading of the past config files."
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
        extract_lessons "$1"
        ;;
esac

