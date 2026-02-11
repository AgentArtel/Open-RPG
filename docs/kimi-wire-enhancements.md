# Kimi Wire Mode Enhancements

## Overview

The Wire Mode daemon (`scripts/wire-daemon.py`) provides persistent coordination between Git events and Kimi Code CLI via JSON-RPC 2.0 over stdin/stdout. Phase 6 enhanced it with metrics tracking, error recovery, and additional event handlers.

## Event Handlers

### Original Handlers (Phase 7)

| Event | Handler | Behavior |
|-------|---------|----------|
| `TurnBegin` | `_on_turn_begin` | Logs turn start |
| `TurnEnd` | `_on_turn_end` | Logs turn end |
| `ToolCall` | `_on_tool_call` | Logs tool name |
| `ToolResult` | `_on_tool_result` | Logs errors |
| `ApprovalRequest` | `_on_approval_request` | Delegates to ApprovalHandler |

### Enhanced Handlers (Phase 6)

| Event | Handler | New Behavior |
|-------|---------|-------------|
| `TurnBegin` | `_on_turn_begin` | **Tracks turn start time** for duration metrics |
| `TurnEnd` | `_on_turn_end` | **Records turn duration**, saves metrics to disk |
| `ToolCall` | `_on_tool_call` | **Counts tool calls by name** for usage tracking |
| `ToolResult` | `_on_tool_result` | **Counts errors** in addition to logging |
| `StepBegin` | `_on_step_begin` | **Tracks step count** (new handler) |
| `StepEnd` | `_on_step_end` | Logs step completion (new handler) |
| `ContentPart` | `_on_content_part` | Logs streaming content type (new handler) |

## Metrics Tracking

### What Is Tracked

The `WireMetrics` class tracks operational metrics during each daemon session:

| Metric | Description |
|--------|-------------|
| `tool_call_count` | Total number of tool calls |
| `tool_calls_by_name` | Breakdown by tool name (e.g., ReadFile: 15, Shell: 8) |
| `turn_count` | Number of turns (prompt-response cycles) |
| `turn_duration_avg_seconds` | Average turn duration |
| `turn_duration_max_seconds` | Longest turn duration |
| `step_count` | Number of steps within turns |
| `error_count` | Number of errors (tool errors + restart attempts) |
| `uptime_seconds` | Daemon uptime |

### Storage

Metrics are stored in `.ai/metrics/wire-metrics.json` as a JSON array of measurement snapshots. Each snapshot is appended when a turn ends, keeping the last 100 entries.

Example entry:

```json
{
  "timestamp": "2026-02-10T12:34:56.789",
  "uptime_seconds": 3600.0,
  "tool_call_count": 47,
  "tool_calls_by_name": {
    "ReadFile": 15,
    "Shell": 8,
    "WriteFile": 6,
    "Grep": 5,
    "Think": 5,
    "Task": 4,
    "Glob": 4
  },
  "turn_count": 5,
  "turn_duration_avg_seconds": 12.5,
  "turn_duration_max_seconds": 28.3,
  "step_count": 15,
  "error_count": 0
}
```

### Viewing Metrics

```bash
# View latest metrics
cat .ai/metrics/wire-metrics.json | python3 -m json.tool | tail -20

# View with jq (if available)
jq '.[-1]' .ai/metrics/wire-metrics.json
```

## Error Recovery

### Auto-Restart

If the Kimi Wire Mode process exits unexpectedly, the daemon automatically attempts to restart it:

1. **Detection**: The main loop checks `process.poll()` every second
2. **Backoff**: Exponential backoff (2s, 4s, 8s) between attempts
3. **Limit**: Maximum 3 restart attempts before giving up
4. **Reset**: Successful restart resets the attempt counter

### Configuration

Auto-restart parameters are set in `WireDaemon.__init__`:

```python
self._max_restart_attempts = 3
self._restart_delay_base = 2  # seconds (exponential backoff)
```

### Restart Behavior

| Attempt | Delay | Action |
|---------|-------|--------|
| 1 | 2 seconds | Stop old connection, start new |
| 2 | 4 seconds | Stop old connection, start new |
| 3 | 8 seconds | Stop old connection, start new |
| 4+ | — | Give up, shut down daemon |

Each restart attempt is logged and counted as an error in metrics.

## Environment Variable Priority

The daemon now loads environment variables in the correct priority order:

1. `.env` (loaded first — lower priority)
2. `.env.project` (loaded second — overrides `.env` values)

This matches the priority order used by all other scripts (`post-commit`, `generate-evaluation.sh`, `kimi-session-manager.sh`, `kimi-context-monitor.sh`).

## Usage

### Start with Metrics

```bash
# Normal start — metrics are tracked automatically
python3 scripts/wire-daemon.py

# Dry run — metrics are tracked but no Kimi connection
python3 scripts/wire-daemon.py --dry-run

# Verbose — see all event handler output
python3 scripts/wire-daemon.py --verbose
```

### Monitor During Operation

```bash
# Check daemon status
python3 scripts/wire-daemon.py --status

# Watch metrics file
watch -n 5 'cat .ai/metrics/wire-metrics.json | python3 -m json.tool | tail -20'
```

### Graceful Shutdown

Metrics are saved to disk on:

- Every `TurnEnd` event (incremental saves)
- Daemon shutdown (final save)

This ensures no metrics are lost even on unexpected termination.

## Integration with Other Tools

### Context Monitor

The context monitor (`scripts/kimi-context-monitor.sh`) can read wire metrics to include in its reports:

```bash
./scripts/kimi-context-monitor.sh report
# Now includes wire metrics if available
```

### Evaluation Script

The evaluation script (`scripts/generate-evaluation.sh`) can reference wire metrics in its Kimi prompt for comprehensive project health assessment.

