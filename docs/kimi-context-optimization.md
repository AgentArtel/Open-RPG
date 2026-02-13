# Kimi Context Optimization Guide

## What Is Context and Why It Matters

Every Kimi session maintains a **context window** — the accumulated conversation history, tool outputs, and file reads that Kimi uses to understand your project. This context is stored on disk as `context.jsonl` files inside `~/.kimi/sessions/`.

### Key facts

- **Model limit**: Kimi K2/K2.5 supports up to **262,144 tokens** (256K) of context
- **Performance degrades** as context grows — responses slow down and quality drops
- **Context is cumulative** — every message, tool call, and file read adds to it
- **Compaction helps** — the `/compact` command summarizes and reduces context size

### How context is stored

```
~/.kimi/
  sessions/
    <workspace-hash>/          # MD5 hash of your project path
      <session-uuid>/          # UUID for each session
        context.jsonl          # Conversation history (JSONL format)
        wire.jsonl             # Wire mode events (if used)
```

Each `context.jsonl` file contains entries like:

```json
{"role": "user", "content": "..."}
{"role": "assistant", "content": [...]}
{"role": "_usage", "token_count": 24804}
{"role": "_checkpoint", "id": 5}
```

The `_usage` entries contain **real token counts** — this is the primary metric we use for monitoring.

---

## How to Monitor Context

### Quick check

```bash
./scripts/kimi-context-monitor.sh check
```

This outputs:

```
=========================================
  Context Health Check
=========================================

  Session:        sprint-3
  Context file:   ~/.kimi/sessions/.../context.jsonl

  Token count:    24804
  File size:      67000 bytes
  Session age:    3.5 hours
  File operations: 42

  Status:         HEALTHY
```

### Health statuses

| Status | Meaning | Action |
|--------|---------|--------|
| **HEALTHY** | All metrics below warn thresholds | None needed |
| **WARNING** | Any metric above warn but below compact threshold | Consider compacting soon |
| **CRITICAL** | Any metric above compact threshold | Auto-compact triggers |

### Check a specific session

```bash
./scripts/kimi-context-monitor.sh check my-session-name
```

### View measurement history

```bash
./scripts/kimi-context-monitor.sh history             # Last 10 measurements
./scripts/kimi-context-monitor.sh history --limit 50   # Last 50
```

### Generate a metrics report

```bash
./scripts/kimi-context-monitor.sh report
```

Shows averages, trends, and compact frequency across all measurements.

---

## Auto-Compact: How It Works

### Threshold-based triggers

Auto-compact runs automatically when context reaches **CRITICAL** status. The thresholds are:

| Metric | Warn | Compact (CRITICAL) |
|--------|------|-------------------|
| Token count | 50,000 | 100,000 |
| File size | 50,000 bytes | 100,000 bytes |
| Session age | 4 hours | 8 hours |
| File operations | 50 | 100 |

### When auto-compact runs

1. **After `approve`/`merge` commits** — The post-commit hook runs `auto-compact` in the background
2. **During session archive** — `kimi-session-manager.sh archive --compact` checks thresholds first
3. **Manually** — `./scripts/kimi-context-monitor.sh auto-compact`

### What auto-compact does

1. Runs `check` to determine health status
2. If CRITICAL: calls `kimi-session-manager.sh archive <session> --compact`
3. The archive command runs `/compact` via Kimi CLI to summarize context
4. Logs the compaction event to `.ai/metrics/context-history.json`

### Non-blocking execution

Context checks **never block** Git commits or workflow. They run in the background after relevant actions, following the same async pattern as the evaluation script.

---

## Manual Compaction

### Option 1: `/compact` directly in Kimi CLI

Use this when you're actively in a Kimi session and want to reduce context:

```
/compact
```

This tells Kimi to summarize the conversation history, reducing token count while preserving key information.

### Option 2: Archive with compaction

Use this to archive a session and compact it in one step:

```bash
./scripts/kimi-session-manager.sh archive my-session --compact
```

**Note**: Phase 4 enhanced this command — it now checks context health first and only compacts if the status is WARNING or CRITICAL. If HEALTHY, compaction is skipped.

### Option 3: Force auto-compact

Run the auto-compact command directly:

```bash
./scripts/kimi-context-monitor.sh auto-compact my-session
```

This checks health and only compacts if CRITICAL.

---

## Best Practices

### 1. Use subagents for isolated tasks

Subagents (created via `CreateSubagent`) run in isolated context. Their work doesn't leak back into the main session's context window. Use them for:
- Debugging investigations
- Performance analysis
- Documentation generation
- Test generation

### 2. Save key findings to `.ai/` files

Information saved to files survives compaction. Before compacting, ensure important findings are written to:
- `.ai/reports/` — Analysis results
- `.ai/reviews/` — Review feedback
- `.ai/tasks/` — Task updates

### 3. Use `--session` to isolate workstreams

Different tasks or sprints should use separate sessions:

```bash
./scripts/kimi-session-manager.sh create sprint-3 --sprint 3
./scripts/kimi-session-manager.sh create feature-auth
```

### 4. Archive sessions between sprints

When a sprint ends, archive the session:

```bash
./scripts/kimi-session-manager.sh archive sprint-3 --compact
```

This preserves the metadata while reducing the context footprint.

### 5. Monitor context regularly during long sessions

For sessions lasting more than 2 hours, periodically check context health:

```bash
./scripts/kimi-context-monitor.sh check
```

---

## Threshold Tuning Guide

### View current thresholds

```bash
./scripts/kimi-context-monitor.sh thresholds
```

### Edit thresholds

```bash
./scripts/kimi-context-monitor.sh thresholds --edit
```

Or edit directly:

```bash
$EDITOR .ai/metrics/thresholds.json
```

### Default thresholds

```json
{
  "warn_token_count": 50000,
  "compact_token_count": 100000,
  "max_token_count": 200000,
  "warn_context_size_bytes": 50000,
  "compact_context_size_bytes": 100000,
  "max_context_size_bytes": 200000,
  "warn_session_age_hours": 4,
  "compact_session_age_hours": 8,
  "warn_file_operations": 50,
  "compact_file_operations": 100
}
```

### When to adjust

| Scenario | Adjustment |
|----------|------------|
| Small codebase, short tasks | Lower warn thresholds (25K tokens, 2h age) |
| Large codebase, complex tasks | Raise compact thresholds (150K tokens, 12h age) |
| Frequent compaction interruptions | Raise warn thresholds |
| Quality degradation in responses | Lower compact thresholds |
| Many file reads per session | Raise file operations thresholds |

### Balancing compaction frequency

- **Too frequent**: Loses useful context, disrupts workflow
- **Too infrequent**: Context bloat degrades response quality
- **Sweet spot**: Compact when token count exceeds ~40% of model limit (100K for 256K model)

---

## Troubleshooting

### Context too large (exceeds max)

**Symptoms**: Kimi responses become slow or error out.

**Fix**:
1. Run `/compact` immediately in the active session
2. If that's not enough, archive the session: `./scripts/kimi-session-manager.sh archive <name> --compact`
3. Create a fresh session: `./scripts/kimi-session-manager.sh create <new-name>`

### Compact failures

**Symptoms**: `auto-compact` or `archive --compact` reports failure.

**Common causes**:
- Kimi CLI not installed (`pipx install kimi-cli`)
- Not authenticated (`kimi` then `/login`)
- Session ID mismatch (session was created outside the manager)

**Fix**:
1. Verify Kimi CLI: `kimi --version`
2. Verify authentication: `kimi --print -p "hello"`
3. Run compaction manually: `kimi --session <id> --print -p "/compact"`

### Metric corruption

**Symptoms**: `context-history.json` has invalid JSON.

**Fix**:
1. Back up the file: `cp .ai/metrics/context-history.json .ai/metrics/context-history.json.bak`
2. Reset: `echo "[]" > .ai/metrics/context-history.json`
3. Run a fresh check: `./scripts/kimi-context-monitor.sh check`

### No context file found

**Symptoms**: `check` reports "No context.jsonl found."

**Common causes**:
- No Kimi sessions have been created yet
- Kimi stores sessions in a different workspace hash

**Fix**:
1. Start a Kimi session: `kimi` (creates `context.jsonl`)
2. Check Kimi's data directory: `ls ~/.kimi/sessions/`
3. Verify workspace path matches: `cat ~/.kimi/kimi.json`

### History file growing too large

The `context-history.json` file is append-only. If it grows very large:

1. Archive old measurements: `cp .ai/metrics/context-history.json .ai/metrics/context-history-$(date +%Y%m%d).json`
2. Reset: `echo "[]" > .ai/metrics/context-history.json`

