#!/usr/bin/env bash
# =============================================================================
# Open Artel — Sprint Evaluation Report Generator
# =============================================================================
#
# Collects metrics from .ai/ files and Git history, then generates an
# evaluation report using Kimi Print Mode.
#
# Metrics collected:
#   1. Task completion rate     — % tasks DONE in .ai/status.md
#   2. Review rejection rate    — % rejected on first review in .ai/reviews/
#   3. Boundary violations      — Out-of-domain file touches from reviews
#   4. Sprint velocity          — Tasks completed in the sprint period
#   5. Handoff latency          — Average submit → merge time from Git
#   6. Regression rate          — % merges needing post-merge fixes
#   7. Escalation rate          — % tasks BLOCKED or escalated
#   8. Template coverage        — % task briefs matching standard format
#
# Usage:
#   ./scripts/generate-evaluation.sh                    # Full evaluation
#   ./scripts/generate-evaluation.sh --quick            # Skip Kimi, just metrics
#   ./scripts/generate-evaluation.sh --baseline         # Include baseline comparison
#   ./scripts/generate-evaluation.sh --sprint N         # Evaluate sprint N
#   ./scripts/generate-evaluation.sh --project NAME     # Set project name
#   ./scripts/generate-evaluation.sh --help             # Show help
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Load .env.project first (project-specific, highest priority)
if [ -f .env.project ]; then
    set -a
    source .env.project
    set +a
fi

# Load .env file (global fallback)
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Defaults
SPRINT_NUM=""
PROJECT_NAME="Open Artel"
USE_BASELINE=false
QUICK_MODE=false
VERBOSE=false
STREAM_MODE=false
OUTPUT_DIR=".ai/reports"
TEMPLATE=".ai/templates/evaluation-report.md"
BASELINE_DIR="past-configurations/Even-Openclaw"

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

log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }
log_metric()  { echo -e "${CYAN}[METRIC]${NC} $*"; }

# ---------------------------------------------------------------------------
# Metric collection functions
# ---------------------------------------------------------------------------

# Metric 1: Task completion rate
# Parses .ai/status.md for DONE vs total tasks
collect_task_completion_rate() {
    local total=0
    local done=0

    if [ -f .ai/status.md ]; then
        # Count tasks in the Active Sprint table (lines with | TASK- or | — |)
        total=$(grep -cE '\|\s*(TASK-|—)\s*\|.*\|\s*(DONE|IN_PROGRESS|PENDING|BLOCKED)' .ai/status.md 2>/dev/null || echo "0")
        done=$(grep -cE '\|\s*(TASK-|—)\s*\|.*\|\s*DONE' .ai/status.md 2>/dev/null || echo "0")
    fi

    # Also count from .ai/tasks/ files
    local task_files
    task_files=$(find .ai/tasks/ -name "TASK-*.md" -not -name "*-research*" -not -name "*-review*" 2>/dev/null | wc -l | tr -d ' ')
    local task_done
    task_done=$(grep -rlE "Status.*(DONE|COMPLETE)" .ai/tasks/ 2>/dev/null | wc -l | tr -d ' ')

    # Use the larger count (status.md may have more entries)
    if [ "$task_files" -gt "$total" ]; then
        total="$task_files"
        done="$task_done"
    fi

    if [ "$total" -eq 0 ]; then
        METRIC_COMPLETION_RATE="N/A"
        METRIC_COMPLETION_TOTAL=0
        METRIC_COMPLETION_DONE=0
    else
        METRIC_COMPLETION_RATE=$(awk "BEGIN {printf \"%.0f\", ($done / $total) * 100}")
        METRIC_COMPLETION_TOTAL="$total"
        METRIC_COMPLETION_DONE="$done"
    fi

    log_metric "Task completion: ${METRIC_COMPLETION_DONE}/${METRIC_COMPLETION_TOTAL} (${METRIC_COMPLETION_RATE}%)"
}

# Metric 2: Review rejection rate
# Counts REJECTED vs total reviews in .ai/reviews/
collect_review_rejection_rate() {
    local total=0
    local rejected=0

    if [ -d .ai/reviews ]; then
        total=$(find .ai/reviews/ -name "*-review.md" -type f 2>/dev/null | wc -l | tr -d ' ')
        rejected=$(grep -rl "Verdict.*REJECTED\|REJECTED" .ai/reviews/ 2>/dev/null | wc -l | tr -d ' ')
    fi

    if [ "$total" -eq 0 ]; then
        METRIC_REJECTION_RATE="N/A"
        METRIC_REJECTION_TOTAL=0
        METRIC_REJECTION_COUNT=0
    else
        METRIC_REJECTION_RATE=$(awk "BEGIN {printf \"%.0f\", ($rejected / $total) * 100}")
        METRIC_REJECTION_TOTAL="$total"
        METRIC_REJECTION_COUNT="$rejected"
    fi

    log_metric "Review rejection: ${METRIC_REJECTION_COUNT}/${METRIC_REJECTION_TOTAL} (${METRIC_REJECTION_RATE}%)"
}

# Metric 3: Boundary violations
# Counts boundary violations mentioned in reviews
collect_boundary_violations() {
    local violations=0

    if [ -d .ai/reviews ]; then
        violations=$(grep -rlEi "boundary violation|out.of.domain|outside.*domain|BOUNDARY" .ai/reviews/ 2>/dev/null | wc -l | tr -d ' ')
    fi

    METRIC_BOUNDARY_VIOLATIONS="$violations"
    log_metric "Boundary violations: $violations"
}

# Metric 4: Sprint velocity
# Counts tasks completed in the current sprint
collect_sprint_velocity() {
    local velocity=0

    if [ -f .ai/status.md ]; then
        # Count DONE entries in Active Sprint section
        velocity=$(grep -cE '\|\s*(TASK-|—)\s*\|.*\|\s*DONE' .ai/status.md 2>/dev/null || echo "0")
    fi

    METRIC_SPRINT_VELOCITY="$velocity"
    log_metric "Sprint velocity: $velocity tasks"
}

# Metric 5: Handoff latency
# Average time between submit and approve/merge commits
collect_handoff_latency() {
    local total_seconds=0
    local count=0

    # Find submit commits and extract task IDs
    local submit_data
    submit_data=$(git log --all --format="%H %at" --grep="\[ACTION:submit\]" 2>/dev/null || true)

    if [ -n "$submit_data" ]; then
        while read -r hash ts; do
            [ -z "$hash" ] && continue

            local task_id
            task_id=$(git log -1 --format=%B "$hash" 2>/dev/null | sed -n 's/.*\[TASK:\([a-zA-Z0-9_-]*\)\].*/\1/p' | head -1)
            [ -z "$task_id" ] && continue

            # Find the corresponding approve/merge commit for this task
            local merge_time
            merge_time=$(git log --all --format="%at" --grep="\[TASK:${task_id}\]" --grep="\[ACTION:approve\]" 2>/dev/null | head -1 || true)

            if [ -z "$merge_time" ]; then
                merge_time=$(git log --all --format="%at" --grep="\[TASK:${task_id}\]" --grep="\[ACTION:merge\]" 2>/dev/null | head -1 || true)
            fi

            if [ -n "$merge_time" ] && [ -n "$ts" ]; then
                local diff=$((merge_time - ts))
                if [ "$diff" -gt 0 ]; then
                    total_seconds=$((total_seconds + diff))
                    count=$((count + 1))
                fi
            fi
        done <<< "$submit_data"
    fi

    if [ "$count" -eq 0 ]; then
        METRIC_HANDOFF_LATENCY="N/A"
        METRIC_HANDOFF_LATENCY_HOURS="N/A"
    else
        local avg_seconds=$((total_seconds / count))
        local avg_hours
        avg_hours=$(awk "BEGIN {printf \"%.1f\", $avg_seconds / 3600}")
        METRIC_HANDOFF_LATENCY="${avg_hours}h"
        METRIC_HANDOFF_LATENCY_HOURS="$avg_hours"
    fi

    log_metric "Handoff latency: ${METRIC_HANDOFF_LATENCY}"
}

# Metric 6: Regression rate
# Percentage of merges that needed post-merge fix tasks
collect_regression_rate() {
    local total_merges=0
    local fix_tasks=0

    # Count merge commits
    local merge_count approve_count
    merge_count=$(git log --all --grep="\[ACTION:merge\]" --format="%H" 2>/dev/null | wc -l | tr -d ' ')
    approve_count=$(git log --all --grep="\[ACTION:approve\]" --format="%H" 2>/dev/null | wc -l | tr -d ' ')
    total_merges=$((merge_count + approve_count))

    # Count fix-related tasks
    if [ -d .ai/tasks ]; then
        fix_tasks=$(grep -rlEi "Type.*Fix|regression|hotfix|post-merge" .ai/tasks/ 2>/dev/null | wc -l | tr -d ' ')
    fi

    if [ "$total_merges" -eq 0 ]; then
        METRIC_REGRESSION_RATE="N/A"
    else
        METRIC_REGRESSION_RATE=$(awk "BEGIN {printf \"%.0f\", ($fix_tasks / $total_merges) * 100}")
    fi

    METRIC_REGRESSION_MERGES="$total_merges"
    METRIC_REGRESSION_FIXES="$fix_tasks"
    log_metric "Regression rate: ${METRIC_REGRESSION_FIXES}/${METRIC_REGRESSION_MERGES} (${METRIC_REGRESSION_RATE}%)"
}

# Metric 7: Escalation rate
# Percentage of tasks escalated to Human or marked BLOCKED
collect_escalation_rate() {
    local total=0
    local escalated=0

    if [ -d .ai/tasks ]; then
        total=$(find .ai/tasks/ -name "TASK-*.md" -not -name "*-research*" -type f 2>/dev/null | wc -l | tr -d ' ')
        escalated=$(grep -rlEi "Status.*BLOCKED|ESCALAT" .ai/tasks/ 2>/dev/null | wc -l | tr -d ' ')
    fi

    # Also check status.md for BLOCKED entries
    if [ -f .ai/status.md ]; then
        local blocked_in_status
        blocked_in_status=$(grep -c "BLOCKED" .ai/status.md 2>/dev/null || echo "0")
        blocked_in_status=$(echo "$blocked_in_status" | tr -d '[:space:]')
        escalated=$((escalated + blocked_in_status))
    fi

    if [ "$total" -eq 0 ]; then
        METRIC_ESCALATION_RATE="N/A"
    else
        METRIC_ESCALATION_RATE=$(awk "BEGIN {printf \"%.0f\", ($escalated / $total) * 100}")
    fi

    METRIC_ESCALATION_TOTAL="$total"
    METRIC_ESCALATION_COUNT="$escalated"
    log_metric "Escalation rate: ${METRIC_ESCALATION_COUNT}/${METRIC_ESCALATION_TOTAL} (${METRIC_ESCALATION_RATE}%)"
}

# Metric 8: Template coverage
# Percentage of task briefs following the standard template format
collect_template_coverage() {
    local total=0
    local compliant=0

    if [ -d .ai/tasks ]; then
        for task_file in .ai/tasks/TASK-*.md; do
            [ -f "$task_file" ] || continue
            # Skip research files
            echo "$task_file" | grep -q "research" && continue

            total=$((total + 1))

            # Check for key template sections: Status, Context/Objective, Acceptance Criteria
            local has_status has_objective has_criteria
            has_status=$(grep -cE "Status:" "$task_file" 2>/dev/null || true)
            has_status=$(echo "$has_status" | head -1 | tr -d '[:space:]')
            has_status=${has_status:-0}
            has_objective=$(grep -cE "Objective|Context|Goal" "$task_file" 2>/dev/null || true)
            has_objective=$(echo "$has_objective" | head -1 | tr -d '[:space:]')
            has_objective=${has_objective:-0}
            has_criteria=$(grep -cE "Acceptance Criteria|Criteria|Done when" "$task_file" 2>/dev/null || true)
            has_criteria=$(echo "$has_criteria" | head -1 | tr -d '[:space:]')
            has_criteria=${has_criteria:-0}

            if [ "$has_status" -gt 0 ] && [ "$has_objective" -gt 0 ] && [ "$has_criteria" -gt 0 ]; then
                compliant=$((compliant + 1))
            fi
        done
    fi

    if [ "$total" -eq 0 ]; then
        METRIC_TEMPLATE_COVERAGE="N/A"
    else
        METRIC_TEMPLATE_COVERAGE=$(awk "BEGIN {printf \"%.0f\", ($compliant / $total) * 100}")
    fi

    METRIC_TEMPLATE_TOTAL="$total"
    METRIC_TEMPLATE_COMPLIANT="$compliant"
    log_metric "Template coverage: ${METRIC_TEMPLATE_COMPLIANT}/${METRIC_TEMPLATE_TOTAL} (${METRIC_TEMPLATE_COVERAGE}%)"
}

# ---------------------------------------------------------------------------
# Baseline comparison (Even-Openclaw)
# ---------------------------------------------------------------------------

collect_baseline_metrics() {
    if [ ! -d "$BASELINE_DIR" ]; then
        log_warn "Baseline directory not found: $BASELINE_DIR"
        BASELINE_AVAILABLE=false
        return
    fi

    BASELINE_AVAILABLE=true

    # Baseline task completion
    local bl_total=0
    local bl_done=0
    if [ -f "$BASELINE_DIR/status.md" ]; then
        bl_total=$(grep -cE '\|\s*(TASK-|ESCALATE|LANDING|SUBMODULE)' "$BASELINE_DIR/status.md" 2>/dev/null || echo "0")
        bl_done=$(grep -cE 'DONE|COMPLETE|✅' "$BASELINE_DIR/status.md" 2>/dev/null || echo "0")
    fi

    # Count task files in baseline
    local bl_task_files=0
    if [ -d "$BASELINE_DIR/tasks" ]; then
        bl_task_files=$(find "$BASELINE_DIR/tasks/" -name "TASK-*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    fi

    if [ "$bl_task_files" -gt "$bl_total" ]; then
        bl_total="$bl_task_files"
    fi

    if [ "$bl_total" -gt 0 ]; then
        BASELINE_COMPLETION_RATE=$(awk "BEGIN {printf \"%.0f\", ($bl_done / $bl_total) * 100}")
    else
        BASELINE_COMPLETION_RATE="N/A"
    fi

    BASELINE_VELOCITY="$bl_done"

    # Baseline template coverage
    local bl_compliant=0
    local bl_task_count=0
    if [ -d "$BASELINE_DIR/tasks" ]; then
        for task_file in "$BASELINE_DIR/tasks"/TASK-*.md; do
            [ -f "$task_file" ] || continue
            bl_task_count=$((bl_task_count + 1))
            local has_s has_o has_c
            has_s=$(grep -cE "Status:" "$task_file" 2>/dev/null || true)
            has_s=$(echo "$has_s" | head -1 | tr -d '[:space:]')
            has_s=${has_s:-0}
            has_o=$(grep -cE "Objective|Context|Goal" "$task_file" 2>/dev/null || true)
            has_o=$(echo "$has_o" | head -1 | tr -d '[:space:]')
            has_o=${has_o:-0}
            has_c=$(grep -cE "Acceptance Criteria|Criteria|Done when" "$task_file" 2>/dev/null || true)
            has_c=$(echo "$has_c" | head -1 | tr -d '[:space:]')
            has_c=${has_c:-0}
            if [ "$has_s" -gt 0 ] && [ "$has_o" -gt 0 ] && [ "$has_c" -gt 0 ]; then
                bl_compliant=$((bl_compliant + 1))
            fi
        done
    fi

    if [ "$bl_task_count" -gt 0 ]; then
        BASELINE_TEMPLATE_COVERAGE=$(awk "BEGIN {printf \"%.0f\", ($bl_compliant / $bl_task_count) * 100}")
    else
        BASELINE_TEMPLATE_COVERAGE="N/A"
    fi

    log_info "Baseline loaded from $BASELINE_DIR"
    log_metric "Baseline completion: ${BASELINE_COMPLETION_RATE}%"
    log_metric "Baseline velocity: ${BASELINE_VELOCITY} tasks"
    log_metric "Baseline template coverage: ${BASELINE_TEMPLATE_COVERAGE}%"
}

# ---------------------------------------------------------------------------
# Status evaluation (PASS/FAIL against targets)
# ---------------------------------------------------------------------------

evaluate_status() {
    local value="$1"
    local target="$2"
    local direction="$3"  # "above" or "below"

    if [ "$value" = "N/A" ]; then
        echo "N/A"
        return
    fi

    if [ "$direction" = "above" ]; then
        if [ "$value" -ge "$target" ]; then
            echo "PASS"
        else
            echo "FAIL"
        fi
    elif [ "$direction" = "below" ]; then
        if [ "$value" -le "$target" ]; then
            echo "PASS"
        else
            echo "NEEDS WORK"
        fi
    elif [ "$direction" = "zero" ]; then
        if [ "$value" -eq 0 ]; then
            echo "PASS"
        else
            echo "NEEDS WORK"
        fi
    fi
}

# ---------------------------------------------------------------------------
# Generate metrics summary (plain text)
# ---------------------------------------------------------------------------

generate_metrics_summary() {
    echo ""
    echo "========================================="
    echo "  Sprint Evaluation Metrics"
    echo "========================================="
    echo ""
    echo "  Project: $PROJECT_NAME"
    echo "  Date: $(date '+%Y-%m-%d')"
    [ -n "$SPRINT_NUM" ] && echo "  Sprint: $SPRINT_NUM"

    # Show current Kimi session if one exists
    local session_mgr="${PROJECT_ROOT}/scripts/kimi-session-manager.sh"
    if [ -x "$session_mgr" ]; then
        local current_session=""
        for sf in "${PROJECT_ROOT}/.ai/sessions/active"/*.json; do
            [ -f "$sf" ] || continue
            current_session="$(basename "$sf" .json)"
            break
        done
        if [ -n "$current_session" ]; then
            echo "  Session: $current_session"
        fi
    fi
    echo ""

    local s1 s2 s3 s4 s5 s6 s7 s8
    s1=$(evaluate_status "${METRIC_COMPLETION_RATE}" 80 "above")
    s2=$(evaluate_status "${METRIC_REJECTION_RATE}" 30 "below")
    s3=$(evaluate_status "${METRIC_BOUNDARY_VIOLATIONS}" 0 "zero")
    s4=$(evaluate_status "${METRIC_SPRINT_VELOCITY}" 10 "above")
    # Latency and regression use string comparison
    s5="N/A"
    s6=$(evaluate_status "${METRIC_REGRESSION_RATE}" 10 "below")
    s7=$(evaluate_status "${METRIC_ESCALATION_RATE}" 15 "below")
    s8=$(evaluate_status "${METRIC_TEMPLATE_COVERAGE}" 90 "above")

    printf "  %-25s %-10s %-10s %-10s\n" "Metric" "Value" "Target" "Status"
    printf "  %-25s %-10s %-10s %-10s\n" "-------------------------" "----------" "----------" "----------"
    printf "  %-25s %-10s %-10s %-10s\n" "Task completion rate" "${METRIC_COMPLETION_RATE}%" ">80%" "$s1"
    printf "  %-25s %-10s %-10s %-10s\n" "Review rejection rate" "${METRIC_REJECTION_RATE}%" "<30%" "$s2"
    printf "  %-25s %-10s %-10s %-10s\n" "Boundary violations" "${METRIC_BOUNDARY_VIOLATIONS}" "0" "$s3"
    printf "  %-25s %-10s %-10s %-10s\n" "Sprint velocity" "${METRIC_SPRINT_VELOCITY}" "10+" "$s4"
    printf "  %-25s %-10s %-10s %-10s\n" "Handoff latency" "${METRIC_HANDOFF_LATENCY}" "<4h" "$s5"
    printf "  %-25s %-10s %-10s %-10s\n" "Regression rate" "${METRIC_REGRESSION_RATE}%" "<10%" "$s6"
    printf "  %-25s %-10s %-10s %-10s\n" "Escalation rate" "${METRIC_ESCALATION_RATE}%" "<15%" "$s7"
    printf "  %-25s %-10s %-10s %-10s\n" "Template coverage" "${METRIC_TEMPLATE_COVERAGE}%" ">90%" "$s8"
    echo ""

    # Phase 4: Context health metrics
    local context_monitor="${PROJECT_ROOT}/scripts/kimi-context-monitor.sh"
    if [ -x "$context_monitor" ]; then
        local ctx_output
        ctx_output=$("$context_monitor" check 2>/dev/null)
        local ctx_status ctx_tokens
        ctx_status=$(echo "$ctx_output" | tail -1)
        ctx_tokens=$(echo "$ctx_output" | grep "Token count:" | awk '{print $3}')
        if [ -n "$ctx_status" ] && [ "$ctx_status" != "UNKNOWN" ]; then
            echo "  Context Health:"
            printf "  %-25s %-10s\n" "Token count" "${ctx_tokens:-?}"
            printf "  %-25s %-10s\n" "Status" "${ctx_status:-?}"
            echo ""
        fi
    fi

    if [ "$USE_BASELINE" = true ] && [ "${BASELINE_AVAILABLE:-false}" = true ]; then
        echo "  Baseline Comparison (${BASELINE_DIR}):"
        printf "  %-25s %-10s %-10s\n" "Metric" "Current" "Baseline"
        printf "  %-25s %-10s %-10s\n" "-------------------------" "----------" "----------"
        printf "  %-25s %-10s %-10s\n" "Completion rate" "${METRIC_COMPLETION_RATE}%" "${BASELINE_COMPLETION_RATE}%"
        printf "  %-25s %-10s %-10s\n" "Velocity" "${METRIC_SPRINT_VELOCITY}" "${BASELINE_VELOCITY}"
        printf "  %-25s %-10s %-10s\n" "Template coverage" "${METRIC_TEMPLATE_COVERAGE}%" "${BASELINE_TEMPLATE_COVERAGE}%"
        echo ""
    fi
}

# ---------------------------------------------------------------------------
# Generate report via Kimi Print Mode
# ---------------------------------------------------------------------------

generate_kimi_report() {
    local sprint_label="${SPRINT_NUM:-current}"
    local output_file="${OUTPUT_DIR}/eval-sprint-${sprint_label}.md"

    log_info "Generating evaluation report via Kimi Print Mode..."

    # Build the baseline section for the prompt
    local baseline_section=""
    if [ "$USE_BASELINE" = true ] && [ "${BASELINE_AVAILABLE:-false}" = true ]; then
        baseline_section="
Baseline comparison (from ${BASELINE_DIR}):
- Baseline completion rate: ${BASELINE_COMPLETION_RATE}%
- Baseline velocity: ${BASELINE_VELOCITY} tasks
- Baseline template coverage: ${BASELINE_TEMPLATE_COVERAGE}%

Include a 'Comparison to Baseline' section analyzing improvements and regressions."
    fi

    # Detect current session for context
    local session_info=""
    for sf in "${PROJECT_ROOT}/.ai/sessions/active"/*.json; do
        [ -f "$sf" ] || continue
        session_info="Kimi session: $(basename "$sf" .json)"
        break
    done

    # Phase 4: Collect context health for the prompt
    local context_health_info=""
    local ctx_monitor="${PROJECT_ROOT}/scripts/kimi-context-monitor.sh"
    if [ -x "$ctx_monitor" ]; then
        local ctx_out
        ctx_out=$("$ctx_monitor" check 2>/dev/null)
        local ctx_st ctx_tk ctx_sz
        ctx_st=$(echo "$ctx_out" | tail -1)
        ctx_tk=$(echo "$ctx_out" | grep "Token count:" | awk '{print $3}')
        ctx_sz=$(echo "$ctx_out" | grep "File size:" | awk '{print $3}')
        if [ -n "$ctx_st" ] && [ "$ctx_st" != "UNKNOWN" ]; then
            context_health_info="
Context health:
- Token count: ${ctx_tk:-unknown}
- File size: ${ctx_sz:-unknown} bytes
- Status: ${ctx_st:-unknown}"
        fi
    fi

    local prompt="Generate a sprint evaluation report for project '${PROJECT_NAME}'.
${session_info:+
Session context: ${session_info}
}${context_health_info:+
${context_health_info}
}
Use the template from .ai/templates/evaluation-report.md as the structure.

Here are the collected metrics:
- Task completion rate: ${METRIC_COMPLETION_DONE}/${METRIC_COMPLETION_TOTAL} (${METRIC_COMPLETION_RATE}%)
- Review rejection rate: ${METRIC_REJECTION_COUNT}/${METRIC_REJECTION_TOTAL} (${METRIC_REJECTION_RATE}%)
- Boundary violations: ${METRIC_BOUNDARY_VIOLATIONS}
- Sprint velocity: ${METRIC_SPRINT_VELOCITY} tasks
- Handoff latency: ${METRIC_HANDOFF_LATENCY}
- Regression rate: ${METRIC_REGRESSION_FIXES}/${METRIC_REGRESSION_MERGES} (${METRIC_REGRESSION_RATE}%)
- Escalation rate: ${METRIC_ESCALATION_COUNT}/${METRIC_ESCALATION_TOTAL} (${METRIC_ESCALATION_RATE}%)
- Template coverage: ${METRIC_TEMPLATE_COMPLIANT}/${METRIC_TEMPLATE_TOTAL} (${METRIC_TEMPLATE_COVERAGE}%)
${baseline_section}

Additional context:
1. Read .ai/status.md for sprint context and completed work.
2. Read .ai/reviews/ for review details and patterns.
3. Analyze what worked well and what needs improvement.
4. Provide specific, actionable recommendations.

Write the complete evaluation report to ${output_file}.
Fill in all template fields with the actual metrics and analysis.
Set Status to PASS if metric meets target, FAIL or NEEDS WORK if not."

    # Check if kimi is available
    if ! command -v kimi &>/dev/null; then
        log_error "Kimi CLI not found. Cannot generate AI report."
        log_info "Install with: pipx install kimi-cli"
        log_info "Metrics have been collected — use them to fill the template manually."
        return 1
    fi

    # Build kimi command
    local env_vars=""
    if [ -n "${KIMI_API_KEY:-}" ]; then
        env_vars="KIMI_API_KEY=\"$KIMI_API_KEY\" "
    fi

    # Resolve agent file for full Kimi Overseer context
    local agent_arg=""
    local agent_file="${PROJECT_ROOT}/.agents/kimi-overseer.yaml"
    if [ -f "$agent_file" ]; then
        agent_arg="--agent-file $agent_file "
    fi

    mkdir -p "$OUTPUT_DIR"

    # Add streaming flag if requested
    local stream_arg=""
    if [ "$STREAM_MODE" = true ]; then
        stream_arg="--output-format stream-json "
        log_info "Calling Kimi Print Mode (streaming)..."
    else
        log_info "Calling Kimi Print Mode..."
    fi

    if eval "${env_vars}kimi ${agent_arg}${stream_arg}--print -p \"$prompt\"" 2>&1; then
        if [ -f "$output_file" ]; then
            log_success "Evaluation report generated: $output_file"
        else
            log_warn "Kimi completed but report file not found at $output_file"
            log_info "Check Kimi output above for details."
        fi
    else
        log_error "Kimi Print Mode failed. Metrics are available for manual report."
    fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
    echo ""
    echo "========================================="
    echo "  Open Artel — Sprint Evaluation"
    echo "========================================="
    echo ""

    # Collect all metrics
    log_info "Collecting metrics..."
    echo ""

    collect_task_completion_rate
    collect_review_rejection_rate
    collect_boundary_violations
    collect_sprint_velocity
    collect_handoff_latency
    collect_regression_rate
    collect_escalation_rate
    collect_template_coverage

    # Collect baseline if requested
    if [ "$USE_BASELINE" = true ]; then
        echo ""
        log_info "Collecting baseline metrics..."
        collect_baseline_metrics
    fi

    # Display metrics summary
    generate_metrics_summary

    # Generate Kimi report (unless quick mode)
    if [ "$QUICK_MODE" = false ]; then
        generate_kimi_report
    else
        log_info "Quick mode — skipping Kimi report generation."
        log_info "Metrics collected. Use them to fill .ai/templates/evaluation-report.md manually."
    fi

    echo ""
    log_success "Evaluation complete."
    echo ""
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------

while [ $# -gt 0 ]; do
    case "$1" in
        --quick|-q)
            QUICK_MODE=true
            shift
            ;;
        --baseline|-b)
            USE_BASELINE=true
            shift
            ;;
        --sprint|-s)
            SPRINT_NUM="$2"
            shift 2
            ;;
        --project|-p)
            PROJECT_NAME="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --stream)
            STREAM_MODE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quick, -q        Skip Kimi report generation (metrics only)"
            echo "  --baseline, -b     Include baseline comparison (Even-Openclaw)"
            echo "  --sprint N, -s N   Set sprint number for report naming"
            echo "  --project NAME     Set project name (default: Open Artel)"
            echo "  --verbose, -v      Show detailed output"
            echo "  --stream           Use streaming mode for Kimi report generation"
            echo "  --help, -h         Show this help"
            echo ""
            echo "Examples:"
            echo "  $0 --quick --baseline       # Metrics with baseline, no Kimi"
            echo "  $0 --sprint 3               # Full report for sprint 3"
            echo "  $0 --project MyProject -b   # Named project with baseline"
            echo "  $0 --stream                 # Stream Kimi output incrementally"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# Run main
main

