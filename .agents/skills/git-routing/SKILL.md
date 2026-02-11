---
name: git-routing
description: Commit message routing rules for multi-agent workflows. Defines the header format, valid values, routing table, and examples for automated agent handoffs.
---

## Commit Message Format

Every commit in a multi-agent project uses this header format:

```
[AGENT:agent] [ACTION:action] [TASK:task-id] Short description

Optional body with details.
```

All three header fields are required. The short description should be under 72 characters.

## Valid AGENT Values

| Value | Agent | Role |
|-------|-------|------|
| `claude` | Claude Code | Orchestrator |
| `cursor` | Cursor | Implementation Specialist |
| `lovable` | Lovable | UI/UX Specialist |
| `kimi` | Kimi Code | Project Overseer |

## Valid ACTION Values

| Value | Meaning | Who Uses It |
|-------|---------|-------------|
| `submit` | Work completed, ready for review | Any agent submitting work |
| `review` | Review in progress | Reviewer (Kimi or Claude Code) |
| `approve` | Work approved | Reviewer |
| `reject` | Work needs changes, feedback provided | Reviewer |
| `update` | Progress update (not a submission) | Any agent |
| `report` | Sprint or status report | Kimi or Claude Code |
| `delegate` | Assigning work to another agent | Kimi or Claude Code |
| `merge` | Merging approved work to target branch | Kimi or Claude Code |

## Valid TASK Values

| Pattern | When to Use | Example |
|---------|-------------|---------|
| Task ID | Standard task work | `TASK-001`, `TASK-P4-01` |
| Sprint ID | Sprint-level work | `SPRINT-3`, `SPRINT-4` |
| Category | Non-task work | `INFRA`, `DOCS`, `CLEANUP` |

## Routing Table

This table defines what should happen after each commit pattern:

| Commit Pattern | What Happens Next |
|----------------|-------------------|
| `[AGENT:cursor] [ACTION:submit] [TASK:X]` | Kimi or Claude Code reviews cursor's work |
| `[AGENT:lovable] [ACTION:submit] [TASK:X]` | Kimi or Claude Code reviews lovable's work |
| `[AGENT:claude] [ACTION:submit] [TASK:X]` | Kimi reviews claude's work |
| `[AGENT:kimi] [ACTION:approve] [TASK:X]` | Work merged to `pre-mortal`, next task assigned |
| `[AGENT:kimi] [ACTION:reject] [TASK:X]` | Agent addresses feedback, re-submits |
| `[AGENT:kimi] [ACTION:delegate] [TASK:X]` | Target agent picks up assignment |
| `[AGENT:kimi] [ACTION:report] [SPRINT:X]` | Human PM reviews sprint summary |
| `[AGENT:kimi] [ACTION:merge] [TASK:X]` | Branch merged to `pre-mortal` |
| `[AGENT:claude] [ACTION:delegate] [TASK:X]` | Target agent picks up assignment |
| `[AGENT:*] [ACTION:update] [TASK:X]` | Status tracking only, no action triggered |

## Branch Rules

- Agents commit to their own branch: `<agent>/<task-id>-<description>`
- Submit commits are made on the agent's branch
- Approve and merge commits are made on `pre-mortal`
- Report commits can be made on any branch

## Examples

### Agent submitting work

```
[AGENT:cursor] [ACTION:submit] [TASK:TASK-P4-01] Implement gateway API client hook

Added WebSocket JSON-RPC client with reconnection logic.
Files: src/hooks/use-gateway-api.ts, src/services/openclaw-client.ts
```

### Reviewer approving work

```
[AGENT:kimi] [ACTION:approve] [TASK:TASK-P4-01] Gateway API client approved

All acceptance criteria met. Merging to pre-mortal.
Unblocks: TASK-P4-02, TASK-P4-03
```

### Reviewer requesting changes

```
[AGENT:kimi] [ACTION:reject] [TASK:TASK-P4-01] Error handling needs improvement

Missing timeout handling on WebSocket reconnection.
See .ai/reviews/TASK-P4-01-review.md for details.
```

### Progress update

```
[AGENT:claude] [ACTION:update] [TASK:TASK-002] Enrich ideas with research findings

Updated 18 idea files with feasibility ratings and roadmap phases.
```

### Sprint report

```
[AGENT:kimi] [ACTION:report] [SPRINT:3] Sprint 3 complete — 8 tasks done

See .ai/reports/sprint-3-summary.md for full details.
```

### Delegating work

```
[AGENT:kimi] [ACTION:delegate] [TASK:TASK-P4-02] Assign agent CRUD sync to Cursor

See .ai/instructions/cursor-TASK-P4-02.md for assignment details.
```

### Merging approved work

```
[AGENT:kimi] [ACTION:merge] [TASK:TASK-P4-01] Merge gateway client to pre-mortal

Approved in .ai/reviews/TASK-P4-01-review.md
```

## Reference

Full routing specification with additional details: `.ai/templates/commit-message.md`

