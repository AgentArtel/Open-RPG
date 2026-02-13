---
name: sprint-execution
description: Automated sprint execution workflow. Reads sprint goals, decomposes tasks, assigns to agents, reviews submissions, merges approved work, and generates sprint summary.
type: flow
---

```mermaid
flowchart TD
    A([BEGIN]) --> B[Read sprint goals from .ai/instructions/]
    B --> B2[Check past lessons in .ai/lessons/]
    B2 --> C[Dispatch Claude Code to decompose into tasks]
    C --> D[Review task briefs for completeness]
    D --> E{Are all tasks well-defined?}
    E -->|No| F[Request Claude Code to refine unclear tasks]
    F --> D
    E -->|Yes| G[Assign first unblocked task to appropriate agent via .ai/instructions/]
    G --> H[Wait for agent submit commit]
    H --> I[Review submitted work against acceptance criteria]
    I --> J{Work approved?}
    J -->|No| K[Write feedback to .ai/reviews/ and commit reject]
    K --> L[Agent addresses feedback on their branch]
    L --> H
    J -->|Yes| M[Merge agent branch to pre-mortal]
    M --> N[Update .ai/status.md with task completion]
    N --> O{More tasks remaining?}
    O -->|Yes| G
    O -->|No| P[Generate sprint summary report in .ai/reports/]
    P --> Q[Notify Human PM that pre-mortal is ready for review]
    Q --> R([END])
```

## Flow Steps Detail

### Step: Read sprint goals
- Read `.ai/instructions/` for the current sprint brief
- Identify sprint scope, priorities, and constraints

### Step: Check past lessons (before decomposition)
- Read `.ai/lessons/applied-lessons.md` for patterns already applied to this project
- If similar work was done in a past configuration, reference those patterns:
  - Check task sizing (past configs show what worked for single-session scope)
  - Check dependency patterns (past configs show what caused blocking)
  - Check acceptance criteria format (past configs show what was testable)
- Avoid patterns marked as "failed" or "anti-pattern" in `.ai/lessons/`
- Apply patterns marked as "successful" to the current decomposition
- If no lessons file exists, run `./scripts/extract-past-lessons.sh` first

### Step: Dispatch Claude Code to decompose
- Create instruction for Claude Code in `.ai/instructions/claude-decompose-sprint-X.md`
- Claude Code writes task briefs to `.ai/tasks/`

### Step: Review task briefs
- Check each task has: Status, Priority, Type, Dependencies, Acceptance Criteria
- Verify file ownership matches agent assignment
- Ensure no circular dependencies

### Step: Assign task to agent
- Pick the highest-priority unblocked task
- Write instruction to `.ai/instructions/<agent>-<task>.md`
- Commit with `[AGENT:kimi] [ACTION:delegate] [TASK:X]`

### Step: Review submitted work
- Read the task brief acceptance criteria
- Run `git diff` on the agent's branch
- Check boundary compliance
- Check for regressions
- Use the `code-review` flow for detailed review

### Step: Merge to pre-mortal
- `git merge <agent>/<task-id> --no-ff`
- Commit with `[AGENT:kimi] [ACTION:merge] [TASK:X]`

### Step: Generate sprint summary
- Count tasks completed, blocked, review cycles
- Write report to `.ai/reports/sprint-X-summary.md`
- Commit with `[AGENT:kimi] [ACTION:report] [SPRINT:X]`

