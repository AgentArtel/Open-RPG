# Cursor-Kimi Integration Guide

How Cursor (Implementation Specialist) communicates with Kimi (Project Overseer) in the Open Artel multi-agent workflow.

## Communication Model

Cursor communicates with Kimi **primarily through Git commits**. There is no direct API call or chat between Cursor and Kimi. Instead, commit messages with routing headers trigger automated actions.

```
Cursor commits → post-commit hook → Kimi CLI Print Mode → .ai/ files
```

## Submitting Work for Review

When you finish a task, commit with the `[ACTION:submit]` header:

```bash
git commit -m "[AGENT:cursor] [ACTION:submit] [TASK:TASK-P4-01] Implement gateway client"
```

This triggers:
1. Post-commit hook parses the routing header
2. Kimi CLI runs in Print Mode with the `reviewer` subagent
3. Review is written to `.ai/reviews/TASK-P4-01-review.md`
4. If approved: work is merged to `pre-mortal`
5. If rejected: feedback is in the review file

## Checking Review Feedback

After submitting, check for Kimi's review:

```bash
# Check if a review exists for your task
cat .ai/reviews/TASK-P4-01-review.md

# List all recent reviews
ls -lt .ai/reviews/
```

Review files contain:
- **Verdict**: APPROVED, CHANGES_REQUESTED, or REJECTED
- **Checklist**: Each acceptance criterion marked MET or UNMET
- **Boundary check**: Whether all modified files are in your domain
- **Feedback**: Specific findings and recommendations

## Receiving Task Assignments

Kimi assigns tasks by writing instruction files:

```bash
# Check for new assignments
ls .ai/instructions/cursor-*.md

# Read your latest assignment
cat .ai/instructions/cursor-TASK-P4-02.md
```

## Progress Updates

For non-submission updates (work in progress):

```bash
git commit -m "[AGENT:cursor] [ACTION:update] [TASK:TASK-P4-01] Added error handling"
```

Update commits are logged but don't trigger reviews.

## Requesting Specialized Help

If you need debugging or performance analysis help, the Kimi Overseer can create specialized subagents. Flag this in your task handoff notes:

```markdown
### Handoff Notes
- Status: BLOCKED
- Need: Performance analysis on the API gateway response times
- Suggest: Create a performance-analyzer subagent for this investigation
```

Available subagent templates:
- `debugger-template.md` — Bug isolation and root cause analysis
- `performance-analyzer-template.md` — Bottleneck identification
- `documentation-writer-template.md` — Documentation generation
- `test-generator-template.md` — Test case generation

## Sprint Lifecycle

### Sprint Start
- Kimi creates a session when `[ACTION:delegate] [TASK:SPRINT-N]` is committed
- Check `.ai/instructions/` for your first task assignment

### During Sprint
- Work on your branch: `cursor/<task-id>-<description>`
- Submit with `[ACTION:submit]` when ready
- Check `.ai/reviews/` for feedback
- Address rejections and re-submit

### Sprint End
- When all tasks are DONE, Kimi auto-triggers evaluation
- Evaluation report appears in `.ai/reports/`
- Session is archived

## Quick Reference

| Action | Commit Format |
|--------|--------------|
| Submit work | `[AGENT:cursor] [ACTION:submit] [TASK:X] Description` |
| Progress update | `[AGENT:cursor] [ACTION:update] [TASK:X] Description` |
| Report status | `[AGENT:cursor] [ACTION:report] [TASK:X] Description` |

| Check | Command |
|-------|---------|
| Your assignments | `ls .ai/instructions/cursor-*.md` |
| Review feedback | `cat .ai/reviews/TASK-X-review.md` |
| Sprint status | `cat .ai/status.md` |
| Pre-work check | `./scripts/quick-kimi-check.sh` |

## Troubleshooting

- **No review after submit**: Check `.git/hooks/post-commit.log` for errors
- **Review says REJECTED**: Read the full review file for specific feedback
- **No task assignments**: Check `.ai/status.md` — sprint may not have started
- **Kimi not responding**: Verify setup with `./scripts/verify-kimi-setup.sh`

