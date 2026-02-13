---
name: sprint-management
description: Sprint planning, execution, and tracking for Open Artel multi-agent projects. Covers task decomposition, dependency management, status tracking, completion criteria, and blocked task handling.
---

## Sprint Planning Process

### Step 1: Define Sprint Goals

Human PM writes sprint goals to `.ai/instructions/`. Goals should be:
- Specific and measurable
- Achievable within the sprint timeframe
- Prioritized (P0 > P1 > P2 > P3)

### Step 2: Task Decomposition

Claude Code (Orchestrator) breaks sprint goals into individual tasks:

1. **Read sprint goals** from `.ai/instructions/`
2. **Identify work items** — each distinct piece of work becomes a task
3. **Assign to agents** — based on file ownership and domain expertise
4. **Define dependencies** — which tasks block which
5. **Write task briefs** to `.ai/tasks/` using the task template
6. **Submit for review** — commit with `[ACTION:submit]`

### Step 3: Task Assignment

Kimi (Overseer) or Claude Code assigns tasks to agents:

1. **Review task briefs** for completeness
2. **Write instructions** to `.ai/instructions/<agent>-<task>.md`
3. **Update status board** in `.ai/status.md`
4. **Commit** with `[ACTION:delegate]`

## Task Decomposition Guidelines

### Sizing

- **One task per agent** — avoid tasks requiring multiple agents
- **One session scope** — completable in a single work session
- **Clear boundaries** — specify exactly which files are in scope
- **Testable outcomes** — every task has measurable acceptance criteria

### Dependency Management

Document dependencies in each task brief:

```markdown
- **Depends on**: TASK-P4-01 (gateway client must exist first)
- **Blocks**: TASK-P4-03, TASK-LOVABLE-002
```

Rules:
- Tasks with no dependencies can run in parallel
- Blocked tasks stay in PENDING until dependencies are DONE
- Circular dependencies indicate a decomposition problem — re-decompose
- If a dependency is blocked, escalate to the orchestrator

### Priority Assignment

| Priority | When to Use |
|----------|-------------|
| P0-Critical | System broken, blocking all work |
| P1-High | Core sprint goal, must complete this sprint |
| P2-Medium | Important but not blocking, next sprint candidate |
| P3-Low | Nice to have, backlog |

## Status Tracking

### Status Board Format

The sprint status board lives in `.ai/status.md`:

```markdown
# Development Status

Last updated: [DATE]

## Current Focus
[One-line description of current sprint focus]

## Active Sprint

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| TASK-XXX | [Title] | [Status] | [Brief note] |

## Backlog

| ID | Title | Priority | Notes |
|----|-------|----------|-------|
| — | [Title] | [Priority] | [Brief note] |

## Recently Completed

| ID | Title | Date | Notes |
|----|-------|------|-------|
| TASK-XXX | [Title] | [Date] | [Brief note] |
```

### Updating Status

- **When a task starts**: Move to Active Sprint, set status to IN_PROGRESS
- **When a task is submitted**: Set status to REVIEW
- **When a task is approved**: Move to Recently Completed, set status to DONE
- **When a task is blocked**: Set status to BLOCKED, add blocker in Notes

## Kimi Session & Context Integration

### Session Lifecycle

Sessions are automatically linked to sprints:

- **Sprint start**: `[ACTION:delegate] [TASK:SPRINT-N]` auto-creates a Kimi session named `sprint-N`
- **During sprint**: Session persists across all task reviews and handoffs
- **Sprint end**: Session auto-archived when all tasks are DONE, evaluation triggered

### Context Monitoring

The context monitor runs in background after approve/merge actions:

- Checks context file size, session age, and file operations against thresholds
- Auto-compacts if CRITICAL threshold exceeded (configurable in `.ai/metrics/thresholds.json`)
- History tracked in `.ai/metrics/context-history.json`

### Sprint Evaluation

At sprint completion, 8 metrics are collected automatically:
task completion rate, review rejection rate, boundary violations, sprint velocity, handoff latency, regression rate, escalation rate, template coverage.

## Sprint Execution

### Workflow

1. Kimi assigns first unblocked task to the appropriate agent
2. Agent works on their branch, commits progress with `[ACTION:update]`
3. Agent completes work, commits with `[ACTION:submit]`
4. Kimi reviews (or dispatches reviewer subagent)
5. If approved: merge to `pre-mortal`, update status, assign next task
6. If rejected: agent addresses feedback, re-submits
7. Repeat until all tasks are DONE
8. Generate sprint summary report

### Parallel Execution

When tasks have no dependencies between them:
- Multiple agents can work simultaneously
- Each agent works on their own branch
- Merges to `pre-mortal` happen sequentially (to avoid conflicts)

## Sprint Completion Criteria

A sprint is complete when:

- [ ] All P0 and P1 tasks are DONE
- [ ] No tasks are in BLOCKED state (or blockers are documented and accepted)
- [ ] All approved work is merged to `pre-mortal`
- [ ] `pre-mortal` builds successfully
- [ ] Sprint summary report generated in `.ai/reports/`
- [ ] `.ai/status.md` updated with completion status
- [ ] Human PM notified for `pre-mortal` → `main` review

## Report Generation

At sprint completion, generate a summary report in `.ai/reports/`:

See `.ai/templates/report.md` for the complete template.

Key metrics to include:
- Tasks completed vs. planned
- Tasks blocked (and reasons)
- Commits merged
- Review cycles per task (average)
- Issues encountered and resolutions

## Blocked Task Handling

| Situation | Response |
|-----------|----------|
| Dependency not met | Wait — task stays PENDING until dependency is DONE |
| External blocker | Document in status.md, escalate to Human PM |
| Technical blocker | Escalate to Claude Code for re-decomposition |
| Agent unavailable | Reassign to another capable agent |
| Merge conflict | Kimi attempts auto-resolve; if non-trivial, escalate to Claude Code |
| Build breaks | Identify breaking commit, create fix task, route to appropriate agent |

## Reference

- Task brief template: `.ai/templates/task.md`
- Report template: `.ai/templates/report.md`
- Status board: `.ai/status.md`
- Task lifecycle: `task-protocol` skill

