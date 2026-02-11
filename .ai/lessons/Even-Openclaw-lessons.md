# Lessons Learned: Even-Openclaw

**Extracted**: 2026-02-10
**Source**: past-configurations/Even-Openclaw/
**Script**: scripts/extract-past-lessons.sh

---

## Summary Metrics

| Metric | Value |
|--------|-------|
| Total tasks | 23 |
| Completed (DONE/REVIEW) | 15 (65%) |
| Partial | 0 |
| Blocked/Open | 1 |
| Pending | 6 |
| Escalations | 1 |
| Tasks with acceptance criteria | 20/23 (86%) |
| Tasks with "Do NOT" section | 18/23 (78%) |
| Tasks with dependencies declared | 19/23 (82%) |
| Tasks with partial acceptance (multi-review) | 2 |
| Boundaries file exists | true |
| Agent sections in boundaries | 4 |
| File entries in boundaries | 50 |
| Sprint phases | 17 |
| Completed phases | 9 |
| Sprint uses task tables | false |

---

## Successful Patterns

### 1. Phased Approach

- **Pattern**: Break work into 17 distinct phases with increasing complexity
- **Evidence**: 9 phases completed in Even-Openclaw
- **Application**: Use for projects with multiple build targets or complex feature rollouts
- **How**: Define phases in `.ai/status.md` with clear scope boundaries. Each phase should be independently shippable.

### 2. Explicit File Ownership

- **Pattern**: Map every file to exactly one agent in `boundaries.md`
- **Evidence**: 50 files mapped across 4 agent sections in Even-Openclaw
- **Application**: Always generate `boundaries.md` during bootstrap — prevents ownership conflicts
- **How**: During Phase 1 of bootstrap, have Claude Code analyze every directory and file, then assign based on function (not location)

### 3. Detailed Task Briefs with Acceptance Criteria

- **Pattern**: Every task includes testable acceptance criteria and explicit "Do NOT" boundaries
- **Evidence**: 86% of tasks had acceptance criteria; 78% had "Do NOT" sections
- **Application**: Use the task template from `.ai/templates/task.md` for every task — never skip acceptance criteria
- **How**: Each criterion should be a checkbox (`- [ ] ...`) that can be verified independently

### 4. Explicit Dependency Declarations

- **Pattern**: Every task declares what it depends on and what it blocks
- **Evidence**: 82% of tasks had explicit dependency declarations
- **Application**: Always fill in "Depends on" and "Blocks" fields — enables parallel work and prevents blocked tasks
- **How**: Use task IDs (e.g., `TASK-P4-01`) in dependency fields. Validate no circular dependencies before assignment.

### 6. Handoff Notes in Task Files

- **Pattern**: Agents update task files with handoff notes when completing work
- **Evidence**: 82% of tasks had handoff notes sections
- **Application**: Always include a Handoff Notes section — it's the primary communication channel between task cycles
- **How**: Include: files changed, decisions made, issues found, verification steps


---

## Failed Patterns

### 2. Escalation Tasks

- **Pattern**: Tasks that required escalation to a different agent or cross-agent debugging
- **Evidence**: 1 escalation(s) in Even-Openclaw
- **Avoid**: Improve initial task specs to include more context. When a task touches code owned by multiple agents, split it into per-agent subtasks.
- **Detection**: If a task brief references files owned by multiple agents, it likely needs splitting.

### 3. Multi-Review Cycles

- **Pattern**: Tasks where some acceptance criteria passed but others failed, requiring re-work
- **Evidence**: 2 task(s) in Even-Openclaw had mixed checked/unchecked criteria
- **Avoid**: Make acceptance criteria more specific and testable. Include exact commands to verify each criterion.
- **Detection**: If a criterion says "works correctly" without specifying how to test, it's too vague.


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
- **Alternative**: Include "Required Reading" section listing files the agent must read before implementing. See TASK-003 from Even-Openclaw for a good example.


---

## Recommendations for New Projects

Based on the analysis of Even-Openclaw:

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

