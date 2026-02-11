#!/usr/bin/env bash
# =============================================================================
# Create Specialized Subagent — Helper Script
# =============================================================================
#
# Generates a Kimi prompt containing CreateSubagent + Task calls from
# reusable template files in .agents/subagents/.
#
# Usage:
#   ./scripts/create-specialized-subagent.sh <template> [task-id]
#   ./scripts/create-specialized-subagent.sh debugger TASK-123
#   ./scripts/create-specialized-subagent.sh performance
#   ./scripts/create-specialized-subagent.sh --list
#   ./scripts/create-specialized-subagent.sh --help
#
# Templates:
#   debugger         — Debugging specialist (isolate regressions, trace bugs)
#   performance      — Performance analyzer (bottlenecks, optimizations)
#   docs             — Documentation writer (clear docs from code analysis)
#   test-generator   — Test generator (test cases from code and requirements)
#
# Output:
#   Prints a Kimi prompt to stdout that you can pipe to kimi --print -p
#   or copy into a Kimi session.
#
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TEMPLATES_DIR="$PROJECT_ROOT/.agents/subagents"
PATTERNS_DIR="$PROJECT_ROOT/.ai/patterns"

# ---------------------------------------------------------------------------
# Colors (if terminal supports them)
# ---------------------------------------------------------------------------

if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    CYAN='\033[0;36m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' CYAN='' NC=''
fi

# ---------------------------------------------------------------------------
# Template mapping
# ---------------------------------------------------------------------------

# Maps short names to template filenames
get_template_file() {
    local name="$1"
    case "$name" in
        debugger)        echo "debugger-template.md" ;;
        performance)     echo "performance-analyzer-template.md" ;;
        docs)            echo "documentation-writer-template.md" ;;
        test-generator)  echo "test-generator-template.md" ;;
        *)               echo "" ;;
    esac
}

# Maps short names to subagent name prefixes
get_name_prefix() {
    local name="$1"
    case "$name" in
        debugger)        echo "bug-hunter" ;;
        performance)     echo "perf-analyzer" ;;
        docs)            echo "doc-writer" ;;
        test-generator)  echo "test-gen" ;;
        *)               echo "subagent" ;;
    esac
}

# Sanitize a string to be a valid subagent name (alphanumeric + hyphens)
sanitize_name() {
    local input="$1"
    # Replace non-alphanumeric chars (except hyphens) with hyphens, collapse multiples
    echo "$input" | tr -cs 'a-zA-Z0-9-' '-' | tr '[:upper:]' '[:lower:]' | sed 's/^-//;s/-$//'
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

cmd_list() {
    echo ""
    echo -e "${CYAN}Available Subagent Templates${NC}"
    echo ""
    printf "  %-18s %s\n" "NAME" "DESCRIPTION"
    printf "  %-18s %s\n" "----" "-----------"
    printf "  %-18s %s\n" "debugger" "Debugging specialist — isolate regressions, trace bugs, root cause analysis"
    printf "  %-18s %s\n" "performance" "Performance analyzer — bottlenecks, metrics, optimization recommendations"
    printf "  %-18s %s\n" "docs" "Documentation writer — clear docs from code analysis, following conventions"
    printf "  %-18s %s\n" "test-generator" "Test generator — test cases from code analysis and requirements"
    echo ""
    echo "Templates are stored in: $TEMPLATES_DIR/"
    echo "Usage patterns are in:   $PATTERNS_DIR/"
    echo ""
}

cmd_help() {
    echo ""
    echo -e "${CYAN}Create Specialized Subagent${NC}"
    echo ""
    echo "Generates a Kimi prompt with CreateSubagent + Task calls from templates."
    echo ""
    echo "Usage:"
    echo "  $0 <template> [task-id]    Generate a Kimi prompt"
    echo "  $0 --list                  List available templates"
    echo "  $0 --help                  Show this help"
    echo ""
    echo "Arguments:"
    echo "  <template>    Template name: debugger, performance, docs, test-generator"
    echo "  [task-id]     Optional task ID (e.g., TASK-123) — used in subagent name"
    echo ""
    echo "Examples:"
    echo "  $0 debugger TASK-123"
    echo "  $0 performance"
    echo "  $0 docs TASK-789"
    echo "  $0 test-generator TASK-101"
    echo ""
    echo "The output is a Kimi prompt you can use with:"
    echo "  $0 debugger TASK-123 | kimi --agent-file .agents/kimi-overseer.yaml --print -p -"
    echo ""
    echo "Or copy the output into an interactive Kimi session."
    echo ""
}

cmd_generate() {
    local template_name="$1"
    local task_id="${2:-}"

    # Resolve template file
    local template_file
    template_file=$(get_template_file "$template_name")

    if [ -z "$template_file" ]; then
        echo -e "${RED}Error: Unknown template '$template_name'${NC}" >&2
        echo "Run '$0 --list' to see available templates." >&2
        exit 1
    fi

    local template_path="$TEMPLATES_DIR/$template_file"

    if [ ! -f "$template_path" ]; then
        echo -e "${RED}Error: Template file not found: $template_path${NC}" >&2
        echo "Expected file: $template_path" >&2
        exit 1
    fi

    # Build subagent name
    local prefix
    prefix=$(get_name_prefix "$template_name")

    local subagent_name
    if [ -n "$task_id" ]; then
        subagent_name=$(sanitize_name "${prefix}-${task_id}")
    else
        subagent_name=$(sanitize_name "${prefix}-$(date +%Y%m%d-%H%M%S)")
    fi

    # Read template content
    local system_prompt
    system_prompt=$(cat "$template_path")

    # Generate the Kimi prompt using python3 for safe string escaping
    # (no sed — Phase 1 lesson)
    if python3 -c "pass" &>/dev/null; then
        python3 -c "
import sys

subagent_name = sys.argv[1]
template_path = sys.argv[2]
task_id = sys.argv[3] if len(sys.argv) > 3 else ''

with open(template_path, 'r') as f:
    system_prompt = f.read()

# Build the prompt
prompt_parts = []
prompt_parts.append(f'Create a specialized subagent and dispatch a task to it.')
prompt_parts.append(f'')
prompt_parts.append(f'Step 1: Create the subagent:')
prompt_parts.append(f'')
prompt_parts.append(f'CreateSubagent(')
prompt_parts.append(f'    name=\"{subagent_name}\",')
prompt_parts.append(f'    system_prompt=\"\"\"')
prompt_parts.append(system_prompt)
prompt_parts.append(f'\"\"\"')
prompt_parts.append(f')')
prompt_parts.append(f'')
prompt_parts.append(f'Step 2: After creating the subagent, dispatch this task:')
prompt_parts.append(f'')
prompt_parts.append(f'Task(')
prompt_parts.append(f'    subagent_name=\"{subagent_name}\",')
if task_id:
    prompt_parts.append(f'    prompt=\"\"\"Investigate {task_id}.')
else:
    prompt_parts.append(f'    prompt=\"\"\"[Describe your task here].')
prompt_parts.append(f'')
prompt_parts.append(f'    Context:')
prompt_parts.append(f'    - [Add relevant context]')
prompt_parts.append(f'')
prompt_parts.append(f'    Deliverable:')
prompt_parts.append(f'    - [Describe expected output]')
if task_id:
    prompt_parts.append(f'    - Save report to: .ai/reports/{task_id.lower()}-report.md\"\"\"')
else:
    prompt_parts.append(f'    - Save report to: .ai/reports/<name>-report.md\"\"\"')
prompt_parts.append(f')')

print('\n'.join(prompt_parts))
" "$subagent_name" "$template_path" "$task_id"
    else
        # Fallback: raw shell output (no python3 available)
        echo "Create a specialized subagent and dispatch a task to it."
        echo ""
        echo "Step 1: Create the subagent:"
        echo ""
        echo "CreateSubagent("
        echo "    name=\"$subagent_name\","
        echo "    system_prompt=\"\"\""
        cat "$template_path"
        echo "\"\"\""
        echo ")"
        echo ""
        echo "Step 2: After creating the subagent, dispatch this task:"
        echo ""
        echo "Task("
        echo "    subagent_name=\"$subagent_name\","
        if [ -n "$task_id" ]; then
            echo "    prompt=\"\"\"Investigate $task_id."
        else
            echo "    prompt=\"\"\"[Describe your task here]."
        fi
        echo ""
        echo "    Context:"
        echo "    - [Add relevant context]"
        echo ""
        echo "    Deliverable:"
        echo "    - [Describe expected output]"
        if [ -n "$task_id" ]; then
            echo "    - Save report to: .ai/reports/$(echo "$task_id" | tr '[:upper:]' '[:lower:]')-report.md\"\"\""
        else
            echo "    - Save report to: .ai/reports/<name>-report.md\"\"\""
        fi
        echo ")"
    fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

case "${1:-}" in
    --list|-l)
        cmd_list
        exit 0
        ;;
    --help|-h|"")
        cmd_help
        exit 0
        ;;
    *)
        cmd_generate "$@"
        ;;
esac

