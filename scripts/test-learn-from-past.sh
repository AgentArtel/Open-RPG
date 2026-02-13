#!/usr/bin/env bash
# =============================================================================
# F1: Learn from Past Configurations — Test Suite
# =============================================================================
#
# Tests the learn-from-past skill, extraction scripts, comparison scripts,
# pattern library, and integration with the bootstrap playbook.
#
# Usage: ./scripts/test-learn-from-past.sh [--mandatory-only | --edge-only | --live-only]
#
# Exit codes:
#   0 = All tests passed
#   1 = One or more tests failed
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Colors (if terminal supports them)
if [ -t 1 ]; then
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[0;33m'
    CYAN='\033[0;36m'
    NC='\033[0m'
else
    GREEN='' RED='' YELLOW='' CYAN='' NC=''
fi

# Run a test and track result
run_test() {
    local test_id="$1"
    local test_name="$2"
    shift 2

    printf "${CYAN}[%s]${NC} %s ... " "$test_id" "$test_name"

    # Capture output and exit code
    local output
    output=$("$@" 2>&1)
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        printf "${GREEN}PASS${NC}\n"
        ((PASSED++))
    elif [ $exit_code -eq 2 ]; then
        # Convention: exit 2 = SKIP
        printf "${YELLOW}SKIP${NC}\n"
        if [ -n "$output" ]; then
            echo "         Reason: $output"
        fi
        ((SKIPPED++))
    else
        printf "${RED}FAIL${NC}\n"
        if [ -n "$output" ]; then
            # Show first 3 lines of error output
            echo "$output" | head -3 | sed 's/^/         /'
        fi
        ((FAILED++))
    fi
}

# =============================================================================
# MANDATORY TESTS — Structural validation
# =============================================================================

run_mandatory_tests() {
    echo ""
    echo "=========================================="
    echo "  Mandatory Tests (Structural)"
    echo "=========================================="
    echo ""

    # --- M1: Skill file exists and has correct structure ---
    run_test "M1.1" "Skill file exists" \
        test -f ".agents/skills/learn-from-past/SKILL.md"

    run_test "M1.2" "Skill has YAML frontmatter" bash -c '
        head -1 .agents/skills/learn-from-past/SKILL.md | grep -q "^---"
    '

    run_test "M1.3" "Skill has name field" bash -c '
        grep -q "name: learn-from-past" .agents/skills/learn-from-past/SKILL.md
    '

    run_test "M1.4" "Skill has description field" bash -c '
        grep -q "description:" .agents/skills/learn-from-past/SKILL.md
    '

    # --- M2: Past configurations index ---
    run_test "M2.1" "INDEX.md exists in past-configurations/" \
        test -f "past-configurations/INDEX.md"

    run_test "M2.2" "INDEX.md references Even-Openclaw" bash -c '
        grep -q "Even-Openclaw" past-configurations/INDEX.md
    '

    run_test "M2.3" "INDEX.md has structured metadata" bash -c '
        grep -q "Project Type" past-configurations/INDEX.md &&
        grep -q "Phases" past-configurations/INDEX.md &&
        grep -q "Key Files" past-configurations/INDEX.md
    '

    # --- M3: Extract script ---
    run_test "M3.1" "extract-past-lessons.sh exists and is executable" bash -c '
        test -f scripts/extract-past-lessons.sh && test -x scripts/extract-past-lessons.sh
    '

    run_test "M3.2" "extract-past-lessons.sh passes syntax check" \
        bash -n scripts/extract-past-lessons.sh

    run_test "M3.3" "extract-past-lessons.sh has help text" bash -c '
        ./scripts/extract-past-lessons.sh help 2>&1 | grep -q "Past Lessons Extractor"
    '

    run_test "M3.4" "extract-past-lessons.sh --list works" bash -c '
        ./scripts/extract-past-lessons.sh --list 2>&1 | grep -q "Even-Openclaw"
    '

    # --- M4: Compare script ---
    run_test "M4.1" "compare-project-structure.sh exists and is executable" bash -c '
        test -f scripts/compare-project-structure.sh && test -x scripts/compare-project-structure.sh
    '

    run_test "M4.2" "compare-project-structure.sh passes syntax check" \
        bash -n scripts/compare-project-structure.sh

    run_test "M4.3" "compare-project-structure.sh has help text" bash -c '
        ./scripts/compare-project-structure.sh help 2>&1 | grep -q "Project Structure Comparator"
    '

    # --- M5: Lessons directory and templates ---
    run_test "M5.1" "Lessons directory exists" \
        test -d ".ai/lessons"

    run_test "M5.2" "Applied lessons template exists" \
        test -f ".ai/lessons/applied-lessons.md"

    run_test "M5.3" "Applied lessons template has correct structure" bash -c '
        grep -q "Applied Successful Patterns" .ai/lessons/applied-lessons.md &&
        grep -q "Avoided Failed Patterns" .ai/lessons/applied-lessons.md &&
        grep -q "Adaptations Made" .ai/lessons/applied-lessons.md
    '

    # --- M6: Pattern library ---
    run_test "M6.1" "Pattern library directory exists" \
        test -d ".ai/patterns/from-past-configs"

    run_test "M6.2" "Phased approach pattern exists" \
        test -f ".ai/patterns/from-past-configs/phased-approach.md"

    run_test "M6.3" "File ownership pattern exists" \
        test -f ".ai/patterns/from-past-configs/file-ownership-mapping.md"

    run_test "M6.4" "Task decomposition pattern exists" \
        test -f ".ai/patterns/from-past-configs/task-decomposition.md"

    run_test "M6.5" "Escalation protocol pattern exists" \
        test -f ".ai/patterns/from-past-configs/escalation-protocol.md"

    run_test "M6.6" "Pattern files have correct structure" bash -c '
        for f in .ai/patterns/from-past-configs/*.md; do
            grep -q "Source" "$f" || { echo "Missing Source in $f"; exit 1; }
            grep -q "Category" "$f" || { echo "Missing Category in $f"; exit 1; }
            grep -q "Evidence" "$f" || { echo "Missing Evidence in $f"; exit 1; }
            grep -q "When to Use" "$f" || { echo "Missing When to Use in $f"; exit 1; }
            grep -q "How to Apply" "$f" || { echo "Missing How to Apply in $f"; exit 1; }
        done
    '

    # --- M7: Integration points ---
    run_test "M7.1" "Overseer prompt includes learn-from-past section" bash -c '
        grep -q "Learning from Past Configurations" .agents/prompts/overseer.md
    '

    run_test "M7.2" "Sprint execution skill references past lessons" bash -c '
        grep -q "Check past lessons" .agents/skills/sprint-execution/SKILL.md
    '

    run_test "M7.3" "Bootstrap playbook includes Step 0" bash -c '
        grep -q "Step 0: Learn from Past Configurations" setups/multi-agent-starter/BOOTSTRAP_PLAYBOOK.md
    '
}

# =============================================================================
# LIVE TESTS — Actually run the scripts on real data
# =============================================================================

run_live_tests() {
    echo ""
    echo "=========================================="
    echo "  Live Tests (Script Execution)"
    echo "=========================================="
    echo ""

    # --- L1: Extract lessons from Even-Openclaw ---
    run_test "L1.1" "Extract lessons from Even-Openclaw" bash -c '
        # Remove existing output to test fresh generation
        rm -f .ai/lessons/Even-Openclaw-lessons.md
        ./scripts/extract-past-lessons.sh Even-Openclaw >/dev/null 2>&1
        test -f .ai/lessons/Even-Openclaw-lessons.md
    '

    run_test "L1.2" "Extracted lessons have Summary Metrics" bash -c '
        grep -q "Summary Metrics" .ai/lessons/Even-Openclaw-lessons.md
    '

    run_test "L1.3" "Extracted lessons have Successful Patterns" bash -c '
        grep -q "Successful Patterns" .ai/lessons/Even-Openclaw-lessons.md
    '

    run_test "L1.4" "Extracted lessons have task count > 0" bash -c '
        # Check that Total tasks is not 0
        grep "Total tasks" .ai/lessons/Even-Openclaw-lessons.md | grep -v "| 0 |"
    '

    run_test "L1.5" "Extracted lessons have Anti-Patterns section" bash -c '
        grep -q "Anti-Patterns" .ai/lessons/Even-Openclaw-lessons.md
    '

    run_test "L1.6" "Extracted lessons have Recommendations" bash -c '
        grep -q "Recommendations for New Projects" .ai/lessons/Even-Openclaw-lessons.md
    '

    # --- L2: Compare project structure ---
    run_test "L2.1" "Compare structure against Even-Openclaw" bash -c '
        rm -f .ai/reports/structure-comparison-Even-Openclaw.md
        ./scripts/compare-project-structure.sh Even-Openclaw >/dev/null 2>&1
        test -f .ai/reports/structure-comparison-Even-Openclaw.md
    '

    run_test "L2.2" "Comparison has Coordination Layer tables" bash -c '
        grep -q "Coordination Layer" .ai/reports/structure-comparison-Even-Openclaw.md
    '

    run_test "L2.3" "Comparison has Similarities section" bash -c '
        grep -q "## Similarities" .ai/reports/structure-comparison-Even-Openclaw.md
    '

    run_test "L2.4" "Comparison has Differences section" bash -c '
        grep -q "## Differences" .ai/reports/structure-comparison-Even-Openclaw.md
    '

    run_test "L2.5" "Comparison has Suggested Adaptations" bash -c '
        grep -q "Suggested Adaptations" .ai/reports/structure-comparison-Even-Openclaw.md
    '

    # --- L3: Idempotent re-runs ---
    run_test "L3.1" "Extract script is idempotent (re-run produces valid output)" bash -c '
        ./scripts/extract-past-lessons.sh Even-Openclaw >/dev/null 2>&1
        test -f .ai/lessons/Even-Openclaw-lessons.md &&
        grep -q "Summary Metrics" .ai/lessons/Even-Openclaw-lessons.md
    '

    run_test "L3.2" "Compare script is idempotent (re-run produces valid output)" bash -c '
        ./scripts/compare-project-structure.sh Even-Openclaw >/dev/null 2>&1
        test -f .ai/reports/structure-comparison-Even-Openclaw.md &&
        grep -q "Coordination Layer" .ai/reports/structure-comparison-Even-Openclaw.md
    '
}

# =============================================================================
# EDGE TESTS — Error handling and boundary conditions
# =============================================================================

run_edge_tests() {
    echo ""
    echo "=========================================="
    echo "  Edge Tests (Error Handling)"
    echo "=========================================="
    echo ""

    # --- E1: Invalid config name ---
    run_test "E1.1" "Extract script fails gracefully for non-existent config" bash -c '
        output=$(./scripts/extract-past-lessons.sh NonExistentConfig 2>&1)
        exit_code=$?
        # Should fail (non-zero exit)
        if [ $exit_code -eq 0 ]; then
            echo "Expected non-zero exit code"
            exit 1
        fi
        # Should show error message
        echo "$output" | grep -qi "not found\|error"
    '

    run_test "E1.2" "Compare script fails gracefully for non-existent config" bash -c '
        output=$(./scripts/compare-project-structure.sh NonExistentConfig 2>&1)
        exit_code=$?
        if [ $exit_code -eq 0 ]; then
            echo "Expected non-zero exit code"
            exit 1
        fi
        echo "$output" | grep -qi "not found\|error"
    '

    # --- E2: Empty or minimal past config ---
    run_test "E2.1" "Extract script handles config with no tasks dir" bash -c '
        # Create a minimal temp config
        mkdir -p past-configurations/_test_empty
        echo "# Test" > past-configurations/_test_empty/status.md
        output=$(./scripts/extract-past-lessons.sh _test_empty 2>&1)
        exit_code=$?
        rm -rf past-configurations/_test_empty .ai/lessons/_test_empty-lessons.md
        # Should succeed (exit 0) even with minimal data
        exit $exit_code
    '

    run_test "E2.2" "Compare script handles config with no tasks dir" bash -c '
        mkdir -p past-configurations/_test_empty
        echo "# Test" > past-configurations/_test_empty/status.md
        output=$(./scripts/compare-project-structure.sh _test_empty 2>&1)
        exit_code=$?
        rm -rf past-configurations/_test_empty .ai/reports/structure-comparison-_test_empty.md
        exit $exit_code
    '

    # --- E3: Config with no status.md ---
    run_test "E3.1" "Extract handles config with no status.md" bash -c '
        mkdir -p past-configurations/_test_no_status/tasks
        echo "## TASK-001: Test" > past-configurations/_test_no_status/tasks/TASK-001.md
        echo "- **Status**: DONE" >> past-configurations/_test_no_status/tasks/TASK-001.md
        output=$(./scripts/extract-past-lessons.sh _test_no_status 2>&1)
        exit_code=$?
        rm -rf past-configurations/_test_no_status .ai/lessons/_test_no_status-lessons.md
        exit $exit_code
    '

    # --- E4: Verify cleanup of test artifacts ---
    run_test "E4.1" "No test artifacts left behind" bash -c '
        # Verify no _test_ directories remain
        count=$(find past-configurations -maxdepth 1 -name "_test_*" -type d 2>/dev/null | wc -l | tr -d " ")
        if [ "$count" -gt 0 ]; then
            echo "Found $count test artifact directories"
            exit 1
        fi
    '
}

# =============================================================================
# INTEGRATION TESTS — Full flow
# =============================================================================

run_integration_tests() {
    echo ""
    echo "=========================================="
    echo "  Integration Tests (Full Flow)"
    echo "=========================================="
    echo ""

    # --- I1: Starter kit has all components ---
    run_test "I1.1" "Starter kit has learn-from-past skill" \
        test -f "setups/multi-agent-starter/.agents/skills/learn-from-past/SKILL.md"

    run_test "I1.2" "Starter kit has applied-lessons template" \
        test -f "setups/multi-agent-starter/.ai/lessons/applied-lessons.md"

    run_test "I1.3" "Starter kit has pattern library" \
        test -d "setups/multi-agent-starter/.ai/patterns/from-past-configs"

    run_test "I1.4" "Starter kit has updated overseer prompt" bash -c '
        grep -q "Learning from Past Configurations" setups/multi-agent-starter/.agents/prompts/overseer.md
    '

    run_test "I1.5" "Starter kit has updated sprint execution skill" bash -c '
        grep -q "Check past lessons" setups/multi-agent-starter/.agents/skills/sprint-execution/SKILL.md
    '

    run_test "I1.6" "Starter kit bootstrap has Step 0" bash -c '
        grep -q "Step 0" setups/multi-agent-starter/BOOTSTRAP_PLAYBOOK.md
    '

    # --- I2: Cross-references are valid ---
    run_test "I2.1" "Overseer prompt references extract script" bash -c '
        grep -q "extract-past-lessons.sh" .agents/prompts/overseer.md
    '

    run_test "I2.2" "Overseer prompt references compare script" bash -c '
        grep -q "compare-project-structure.sh" .agents/prompts/overseer.md
    '

    run_test "I2.3" "Skill file references pattern library" bash -c '
        grep -q "patterns/from-past-configs" .agents/skills/learn-from-past/SKILL.md
    '

    run_test "I2.4" "INDEX.md references lessons extraction" bash -c '
        grep -q "extract-past-lessons.sh" past-configurations/INDEX.md
    '
}

# =============================================================================
# Main — Run requested test suites
# =============================================================================

echo "============================================"
echo "  F1: Learn from Past Configurations Tests"
echo "============================================"

case "${1:-all}" in
    --mandatory-only)
        run_mandatory_tests
        ;;
    --live-only)
        run_live_tests
        ;;
    --edge-only)
        run_edge_tests
        ;;
    --integration-only)
        run_integration_tests
        ;;
    all|*)
        run_mandatory_tests
        run_live_tests
        run_edge_tests
        run_integration_tests
        ;;
esac

echo ""
echo "=========================================="
echo "  Results"
echo "=========================================="
echo ""
echo -e "  ${GREEN}Passed: ${PASSED}${NC}"
echo -e "  ${RED}Failed: ${FAILED}${NC}"
echo -e "  ${YELLOW}Skipped: ${SKIPPED}${NC}"
echo -e "  Total:  $((PASSED + FAILED + SKIPPED))"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}SOME TESTS FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}ALL TESTS PASSED${NC}"
    exit 0
fi

