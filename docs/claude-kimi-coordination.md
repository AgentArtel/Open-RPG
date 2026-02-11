# Claude Code-Kimi Coordination Guide

How Claude Code (Orchestrator) coordinates with Kimi (Project Overseer) in the Open Artel multi-agent workflow.

## Coordination Model

Claude Code and Kimi share oversight responsibilities. The primary communication channel is **commit-based routing** through Git.

```
Claude Code commits → post-commit hook → Kimi CLI → .ai/ files
Kimi reviews → .ai/reviews/ → Claude Code reads feedback
```

## When to Use Kimi vs Direct

| Scenario | Use Kimi | Use Direct |
|----------|----------|------------|
| Code review of agent submissions | Yes — `[ACTION:submit]` triggers auto-review | — |
| Task decomposition | — | Yes — Claude Code's primary role |
| Sprint evaluation | Yes — `[ACTION:evaluate]` triggers metrics | — |
| Architecture decisions | — | Yes — Claude Code decides, documents |
| Merge to pre-mortal | Yes — `[ACTION:approve]` triggers merge | — |
| Status updates | Yes — auto-updated after approve/merge | Also update manually |

## Delegation Patterns

### Starting a Sprint

```bash
# Delegate sprint start — auto-creates Kimi session
git commit -m "[AGENT:kimi] [ACTION:delegate] [TASK:SPRINT-3] Start sprint 3"
```

This triggers:
1. Kimi session `sprint-3` is auto-created
2. Session linked to sprint metadata

### Assigning Tasks

Write task assignments to `.ai/instructions/`:

```bash
# Create instruction file
cat > .ai/instructions/cursor-TASK-P4-01.md <<EOF
# Task Assignment: TASK-P4-01

Assigned to: Cursor
Priority: P1-High
Task brief: .ai/tasks/TASK-P4-01.md

Please implement the gateway client as specified in the task brief.
EOF

# Commit with delegate action
git commit -m "[AGENT:claude] [ACTION:delegate] [TASK:TASK-P4-01] Assign gateway client to Cursor"
```

### Triggering Evaluations

```bash
# Manual evaluation trigger
git commit --allow-empty -m "[AGENT:claude] [ACTION:evaluate] [TASK:SPRINT-EVAL] Evaluate sprint 3"

# Or run the script directly
./scripts/generate-evaluation.sh --sprint 3 --baseline
```

## Review Coordination

### Before Your Own Review

Always check if Kimi has already reviewed:

```bash
# Check for existing Kimi review
cat .ai/reviews/TASK-P4-01-review.md 2>/dev/null || echo "No Kimi review yet"
```

### After Kimi Reviews

1. Read Kimi's review in `.ai/reviews/`
2. Add your own assessment if needed
3. If you agree with APPROVE: commit `[ACTION:approve]`
4. If you disagree: override with your own verdict

### Overriding Kimi

Claude Code has authority to override Kimi's verdict:

```bash
# Override a Kimi rejection
git commit -m "[AGENT:claude] [ACTION:approve] [TASK:TASK-P4-01] Override: acceptance criteria met per discussion"
```

Document the reason in the commit message or in `.ai/reviews/`.

## Session Management

### Checking Current Session

```bash
./scripts/kimi-session-manager.sh current
```

### Creating Sessions for Special Tasks

```bash
# Create a research session
./scripts/kimi-session-manager.sh create research-api-evaluation

# Create a session for a specific sprint
./scripts/kimi-session-manager.sh create sprint-3 --sprint 3
```

### Context Health

```bash
# Check context health
./scripts/kimi-context-monitor.sh check

# View metrics report
./scripts/kimi-context-monitor.sh report
```

## Sprint Lifecycle from Claude Code's Perspective

### 1. Sprint Planning
- Write sprint goals to `.ai/instructions/`
- Decompose into task briefs in `.ai/tasks/`
- Commit with `[ACTION:delegate]` for each assignment

### 2. During Sprint
- Monitor `.ai/reviews/` for Kimi's automated reviews
- Check `.ai/status.md` for progress
- Handle escalations and re-decomposition

### 3. Sprint Completion
- Auto-detected when all tasks in `.ai/status.md` are DONE
- Kimi auto-triggers evaluation and session archive
- Review evaluation report in `.ai/reports/`
- Notify Human PM for `pre-mortal` → `main` review

## Quick Reference

| Action | Commit Format |
|--------|--------------|
| Delegate task | `[AGENT:claude] [ACTION:delegate] [TASK:X] Description` |
| Approve work | `[AGENT:claude] [ACTION:approve] [TASK:X] Description` |
| Trigger evaluation | `[AGENT:claude] [ACTION:evaluate] [TASK:SPRINT-EVAL] Description` |
| Status report | `[AGENT:claude] [ACTION:report] [TASK:X] Description` |

| Check | Command |
|-------|---------|
| Kimi reviews | `ls .ai/reviews/` |
| Sprint status | `cat .ai/status.md` |
| Session health | `./scripts/kimi-context-monitor.sh check` |
| Full verification | `./scripts/verify-kimi-setup.sh` |

