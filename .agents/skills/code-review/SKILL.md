---
name: code-review
description: Automated code review workflow. Reads task brief, checks boundaries, verifies acceptance criteria, checks for regressions, and produces an APPROVE or REJECT verdict.
type: flow
---

```mermaid
flowchart TD
    A([BEGIN]) --> B[Read task brief and acceptance criteria from .ai/tasks/]
    B --> C[Read git diff of submitted changes]
    C --> D[Check: are all modified files within agent boundary?]
    D --> E{Boundary violation?}
    E -->|Yes| F["REJECT: list boundary violations in .ai/reviews/"]
    F --> Z([END])
    E -->|No| G[Check each acceptance criterion against the diff]
    G --> H{All criteria met?}
    H -->|No| I["REJECT: list unmet criteria in .ai/reviews/"]
    I --> Z
    H -->|Yes| J[Check for regressions: build, tests, related features]
    J --> K{Regressions found?}
    K -->|Yes| L["REJECT: describe regressions in .ai/reviews/"]
    L --> Z
    K -->|No| M[Check commit message format compliance]
    M --> N{Format correct?}
    N -->|No| O["CHANGES REQUESTED: fix commit message format"]
    O --> Z
    N -->|Yes| P["APPROVE: generate review report in .ai/reviews/"]
    P --> Q[Commit approve with routing header]
    Q --> Z
```

## Flow Steps Detail

### Step: Read task brief
- Open `.ai/tasks/TASK-XXX.md`
- Extract acceptance criteria checklist
- Note the assigned agent and file scope

### Step: Read git diff
- Run `git diff pre-mortal..<agent>/<task-id>`
- Identify all modified, added, and deleted files
- Note the scope of changes

### Step: Check boundaries
- Compare modified files against AGENTS.md ownership
- Reference `.ai/boundaries.md` for the complete map
- Flag any file outside the agent's domain

### Step: Check acceptance criteria
- Go through each criterion one by one
- Mark as met or unmet
- For unmet criteria, note what's missing

### Step: Check for regressions
- Verify build passes: `npm run build`
- Verify tests pass: `npm run test`
- Verify type check passes: `npx tsc --noEmit`
- Check related features still work

### Step: Check commit message format
- Verify header: `[AGENT:x] [ACTION:submit] [TASK:z]`
- Verify AGENT value matches the submitting agent
- Verify TASK value matches the task being reviewed

### Step: Generate review report
- Write to `.ai/reviews/TASK-XXX-review.md`
- Include checklist, findings, feedback, and verdict
- Use template from `.ai/templates/review.md`

## Verdict Outcomes

| Verdict | Commit | Next Action |
|---------|--------|-------------|
| APPROVE | `[AGENT:kimi] [ACTION:approve] [TASK:X]` | Merge to pre-mortal |
| CHANGES REQUESTED | `[AGENT:kimi] [ACTION:reject] [TASK:X]` | Agent fixes and re-submits |
| REJECT | `[AGENT:kimi] [ACTION:reject] [TASK:X]` | Task re-scoped or reassigned |

## Advanced Review Patterns

### Dynamic Reviewer Subagents

For specialized reviews, create a dynamic subagent at runtime:

```python
CreateSubagent(name="security-reviewer", system_prompt="<security review prompt>")
Task(subagent_name="security-reviewer", prompt="Review TASK-X for security issues...")
```

Templates available in `.agents/subagents/` (debugger, performance, docs, test-generator).

### Agent Swarm for Batch Reviews

At sprint end, dispatch multiple reviewer subagents in parallel:

```python
# Review 5 tasks simultaneously (K2.5 supports up to 100 sub-agents)
for task in tasks:
    Task(subagent_name="reviewer", prompt=f"Review {task}...")
```

See `.ai/patterns/agent-swarm-parallel-review.md` for the full pattern.

