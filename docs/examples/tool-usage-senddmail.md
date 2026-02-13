# SendDMail Tool Usage Example

## Tool Reference

- **Tool name**: `SendDMail`
- **Module**: `kimi_cli.tools.multiagent:SendDMail`
- **Purpose**: Send delayed messages or create checkpoints for follow-up actions

## When to Use

- Scheduling follow-up checks after delegating a task
- Creating recovery points during complex multi-step operations
- Deferring non-critical actions to avoid context overload
- Setting reminders to check on blocked tasks
- Scheduling sprint summary generation at end of sprint

## When NOT to Use

- For immediate actions (just do them directly)
- For communicating with agents (use `.ai/instructions/` files instead)
- For urgent blockers (escalate immediately, don't defer)

## Example Usage

### Schedule a follow-up on a blocked task

```
SendDMail(message="Check if TASK-005 blocker is resolved. If so, re-assign TASK-007 to Cursor.", delay="2 hours")
```

Use this when a task is blocked waiting for another task to complete. Instead of polling, schedule a check-in.

### Create a checkpoint during complex operations

```
SendDMail(message="Checkpoint: Completed merge of TASK-003 and TASK-004 to pre-mortal. Next: run evaluation script and generate sprint report.", delay="5 minutes")
```

Use this during multi-step operations as a recovery point. If the session is interrupted, the delayed message provides context on where to resume.

### Defer non-critical cleanup

```
SendDMail(message="Clean up stale branches: cursor/TASK-001, claude/TASK-002. These were merged to pre-mortal but branches not deleted.", delay="30 minutes")
```

Use this when you notice cleanup needed but are in the middle of higher-priority work.

## Real-World Use Case

**Scenario**: You've just assigned three tasks to different agents at the start of a sprint. You want to check in on progress after a reasonable work period:

```
SendDMail(message="Sprint check-in: Review progress on TASK-010 (Cursor), TASK-011 (Lovable), TASK-012 (Claude Code). Check .ai/status.md for updates and any new [ACTION:submit] commits.", delay="1 hour")
```

This ensures you don't forget to follow up, even during long sessions where context may compress. The delayed message acts as a built-in reminder system.

