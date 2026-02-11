# Kimi Evaluation Procedures

Step-by-step procedures for verifying, testing, and evaluating the Kimi Overseer integration across all features.

## 1. Setup Verification

Before any testing, verify the setup is complete:

```bash
# Full verification — checks all components
./scripts/verify-kimi-setup.sh

# Quick pre-work check (< 5 seconds)
./scripts/quick-kimi-check.sh
```

Expected: All critical checks PASS, warnings are optional improvements.

## 2. Session Management

### Create and manage sessions

```bash
# Create a sprint session
./scripts/kimi-session-manager.sh create sprint-test --sprint 1

# List active sessions
./scripts/kimi-session-manager.sh list

# Check current session
./scripts/kimi-session-manager.sh current

# Archive a session
./scripts/kimi-session-manager.sh archive sprint-test

# Delete a session
./scripts/kimi-session-manager.sh delete sprint-test
```

### Verify session persistence

```bash
# Create session, verify metadata file exists
./scripts/kimi-session-manager.sh create verify-session
ls .ai/sessions/active/verify-session.json

# Clean up
./scripts/kimi-session-manager.sh delete verify-session
```

## 3. Git Automation

### Test commit-based routing

```bash
# Dry-run mode (no actual Kimi calls)
export OPEN_ARTEL_DRY_RUN=true

# Test submit action
git commit --allow-empty -m "[AGENT:cursor] [ACTION:submit] [TASK:TEST-001] Test submission"

# Check hook log
cat .git/hooks/post-commit.log | tail -20

# Test evaluate action
git commit --allow-empty -m "[AGENT:claude] [ACTION:evaluate] [TASK:SPRINT-EVAL] Test evaluation"

# Disable dry-run
unset OPEN_ARTEL_DRY_RUN
```

## 4. Dynamic Subagents

### Test subagent creation

```bash
# List available templates
./scripts/create-specialized-subagent.sh --help

# Generate a debugger subagent call
./scripts/create-specialized-subagent.sh debugger TASK-TEST

# Generate a performance analyzer call
./scripts/create-specialized-subagent.sh performance TASK-TEST
```

## 5. Context Optimization

### Monitor context health

```bash
# Check context health for current session
./scripts/kimi-context-monitor.sh check

# View thresholds
./scripts/kimi-context-monitor.sh thresholds

# View measurement history
./scripts/kimi-context-monitor.sh history --limit 10

# Generate metrics report
./scripts/kimi-context-monitor.sh report
```

## 6. API Integration

### Verify API key

```bash
# Check API key status
./scripts/setup-project-api-key.sh status

# Validate API key works
./scripts/setup-project-api-key.sh validate
```

### Test file uploads

```bash
# List uploaded files
python3 scripts/upload-project-files.py --list

# Upload project files (initial)
python3 scripts/upload-project-files.py --initial

# Sync changes
python3 scripts/upload-project-files.py --sync
```

## 7. Agent Swarm

### Test parallel subagent dispatch

```bash
# Start overseer with agent file
kimi --agent-file .agents/kimi-overseer.yaml --print -p "Create 3 reviewer subagents and dispatch them to review the files in .ai/patterns/"
```

See `.ai/patterns/agent-swarm-parallel-review.md` for the full pattern.

## 8. Integration Tests

### Run all phase tests

```bash
# Run each phase's test suite
./scripts/test-phase-1.sh --mandatory-only
./scripts/test-phase-2.sh --mandatory
./scripts/test-phase-3.sh --structural
./scripts/test-phase-4.sh --structural
./scripts/test-phase-5.sh
./scripts/test-phase-6.sh
./scripts/test-phase-7.sh
```

## 9. Real Workflow Test

### End-to-end sprint simulation

```bash
# 1. Create sprint session
./scripts/kimi-session-manager.sh create sprint-test --sprint 99

# 2. Simulate task delegation
git commit --allow-empty -m "[AGENT:claude] [ACTION:delegate] [TASK:TASK-TEST-01] Assign test task"

# 3. Simulate task submission
git commit --allow-empty -m "[AGENT:cursor] [ACTION:submit] [TASK:TASK-TEST-01] Complete test task"

# 4. Check for review
ls .ai/reviews/TASK-TEST-01-review.md 2>/dev/null && echo "Review exists" || echo "No review (expected in dry-run)"

# 5. Simulate approval
git commit --allow-empty -m "[AGENT:kimi] [ACTION:approve] [TASK:TASK-TEST-01] Approved"

# 6. Check context health
./scripts/kimi-context-monitor.sh check 2>/dev/null || true

# 7. Clean up
./scripts/kimi-session-manager.sh delete sprint-test 2>/dev/null || true
```

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Hook not triggering | Check `ls -la .git/hooks/post-commit` — must be executable |
| Kimi CLI not found | `pipx install kimi-cli` |
| API key invalid | `./scripts/setup-project-api-key.sh validate` |
| Session not found | `./scripts/kimi-session-manager.sh list` |
| Context too large | `./scripts/kimi-context-monitor.sh auto-compact` |
| Tests failing | Check `.git/hooks/post-commit.log` for errors |

