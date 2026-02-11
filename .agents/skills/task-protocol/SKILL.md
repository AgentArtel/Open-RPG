---
name: task-protocol
description: Standard task brief format and lifecycle for Open Artel projects. Defines required fields, lifecycle states, acceptance criteria rules, and naming conventions.
---

## Task Brief Format

Every task brief is a markdown file in `.ai/tasks/` following this structure:

```markdown
## TASK-XXX: [Short descriptive name]

- **Status**: [PENDING | IN_PROGRESS | REVIEW | DONE | BLOCKED]
- **Priority**: [P0-Critical | P1-High | P2-Medium | P3-Low]
- **Type**: [Create | Improve | Fix | Research]
- **Depends on**: [TASK-XXX | none]
- **Blocks**: [TASK-XXX | none]

### Context
[What exists currently, what prompted this task, relevant files]

### Objective
[Specific measurable goal — what "done" looks like]

### Scope
- [File or template area affected]
- [What's in bounds]
- [What's explicitly out of bounds]

### Acceptance Criteria
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] Changes are consistent with existing conventions
- [ ] No regressions in other templates

### Notes
[Design decisions, alternatives considered, open questions]
```

The template is at `.ai/templates/task.md`.

## Required Fields

| Field | Values | Required |
|-------|--------|----------|
| Status | PENDING, IN_PROGRESS, REVIEW, DONE, BLOCKED | Yes |
| Priority | P0-Critical, P1-High, P2-Medium, P3-Low | Yes |
| Type | Create, Improve, Fix, Research | Yes |
| Depends on | TASK-XXX or none | Yes |
| Blocks | TASK-XXX or none | Yes |
| Context | Free text | Yes |
| Objective | Free text | Yes |
| Scope | Bullet list | Yes |
| Acceptance Criteria | Checkbox list | Yes |

## Task Lifecycle

```
PENDING → IN_PROGRESS → REVIEW → DONE
    ↓                      ↓
  BLOCKED              BLOCKED
    ↓                      ↓
(unblocked)         (feedback addressed)
    ↓                      ↓
IN_PROGRESS            REVIEW → DONE
```

### State Transitions

| From | To | Trigger |
|------|----|---------|
| PENDING | IN_PROGRESS | Agent begins work |
| PENDING | BLOCKED | Dependency not met |
| IN_PROGRESS | REVIEW | Agent commits `[ACTION:submit]` |
| IN_PROGRESS | BLOCKED | Unexpected blocker discovered |
| REVIEW | DONE | Reviewer commits `[ACTION:approve]` |
| REVIEW | IN_PROGRESS | Reviewer commits `[ACTION:reject]` — agent addresses feedback |
| BLOCKED | PENDING | Blocker resolved |
| BLOCKED | IN_PROGRESS | Blocker resolved and agent resumes |

## Task Naming Convention

| Pattern | Example |
|---------|---------|
| `TASK-XXX` (numeric) | `TASK-001`, `TASK-002` |
| `TASK-DESCRIPTIVE-NAME` (named) | `TASK-GATEWAY-CLIENT` |
| `TASK-<PHASE>-<NUMBER>` (phased) | `TASK-P4-01`, `TASK-P4-02` |
| `TASK-<AGENT>-<NUMBER>` (agent-scoped) | `TASK-LOVABLE-001` |

File naming: `TASK-XXX.md` in `.ai/tasks/`.

## Acceptance Criteria Rules

1. **Every criterion must be independently testable** — no vague "works correctly"
2. **"Build passes" is always included** — for projects with a build step
3. **Boundary compliance is always checked** — agent must not modify files outside their domain
4. **Commit format compliance** — commits must use `[AGENT:x] [ACTION:y] [TASK:z]` format
5. **No regressions** — existing functionality must not break
6. **Criteria are checkboxes** — use `- [ ]` format for tracking

## Priority Definitions

| Priority | Meaning | Response Time |
|----------|---------|---------------|
| P0-Critical | System broken, blocking all work | Immediate |
| P1-High | Important feature or fix, current sprint | Same sprint |
| P2-Medium | Improvement, next sprint candidate | Next sprint |
| P3-Low | Nice to have, backlog | When capacity allows |

## Task Decomposition Guidelines

When breaking down work into tasks:

1. **One task per agent** — avoid tasks that require multiple agents
2. **Clear boundaries** — specify exactly which files are in scope
3. **Testable outcomes** — every task has measurable acceptance criteria
4. **Dependency chains** — document what blocks what
5. **Size limit** — a task should be completable in one work session
6. **Context included** — provide enough context that the agent can work independently

