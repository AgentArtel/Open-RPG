# Kimi Session Management

Kimi Code CLI sessions are persistent conversation contexts that auto-save to disk. The Open Artel session manager wraps Kimi's native session features with metadata tracking, sprint integration, and archival.

## Why Sessions Matter

Without session management, each Kimi invocation starts fresh with no memory of past interactions. Sessions solve this by:

- **Preserving context** across multiple Kimi calls within a sprint
- **Tying sessions to sprints** so you know which session belongs to which work period
- **Archiving completed sprints** with metadata (tasks completed, timestamps)
- **Enabling resume** — pick up exactly where you left off

## Quick Start

```bash
# Create a session for sprint 3
./scripts/kimi-session-manager.sh create sprint-3 --sprint 3

# Resume the session (launches Kimi CLI)
./scripts/kimi-session-manager.sh resume sprint-3

# See what's active
./scripts/kimi-session-manager.sh current

# When the sprint is done, archive it
./scripts/kimi-session-manager.sh archive sprint-3

# See all sessions (including archived)
./scripts/kimi-session-manager.sh list --all
```

## Commands

### `create <name> [--sprint N] [--launch]`

Creates a new session with metadata stored in `.ai/sessions/active/<name>.json`.

- `--sprint N` — Associates the session with sprint number N
- `--launch` — Also starts Kimi CLI with this session immediately

Session names are sanitized: only alphanumeric characters, hyphens, and underscores are allowed. Special characters are replaced with hyphens.

```bash
./scripts/kimi-session-manager.sh create sprint-3 --sprint 3
./scripts/kimi-session-manager.sh create feature-auth --sprint 3 --launch
```

### `list [--all]`

Lists active sessions in a table format. Use `--all` to include archived sessions.

```bash
./scripts/kimi-session-manager.sh list        # Active only
./scripts/kimi-session-manager.sh list --all  # Active + archived
```

### `resume <name>`

Resumes a session by launching Kimi CLI with `--session <id> --agent-file .agents/kimi-overseer.yaml`.

Requires Kimi CLI to be installed. The session must be in the active directory.

```bash
./scripts/kimi-session-manager.sh resume sprint-3
```

### `archive <name> [--compact]`

Moves a session from `active/` to `archived/`. Adds `archived_at` timestamp and `tasks_completed` count to the metadata.

- `--compact` — Runs Kimi's `/compact` command before archiving to summarize and compress the session context

```bash
./scripts/kimi-session-manager.sh archive sprint-3
./scripts/kimi-session-manager.sh archive sprint-3 --compact
```

### `delete <name>`

Removes a session's metadata file from either `active/` or `archived/`. Warns if deleting an active session.

```bash
./scripts/kimi-session-manager.sh delete sprint-3
```

### `current`

Shows the most recently modified active session with all its metadata.

```bash
./scripts/kimi-session-manager.sh current
```

## Session Storage

Sessions are stored as JSON metadata files:

```
.ai/sessions/
├── active/           # Currently active sessions
│   ├── .gitkeep
│   └── sprint-3.json
└── archived/         # Completed/archived sessions
    ├── .gitkeep
    └── sprint-2.json
```

### Active Session Metadata

```json
{
  "name": "sprint-3",
  "kimi_session_id": "sprint-3",
  "created_at": "2026-02-10T14:30:00Z",
  "sprint": "3",
  "agent_file": ".agents/kimi-overseer.yaml",
  "status": "active",
  "notes": "Sprint 3 session"
}
```

### Archived Session Metadata

Archived sessions have additional fields:

```json
{
  "name": "sprint-2",
  "kimi_session_id": "sprint-2",
  "created_at": "2026-02-05T10:00:00Z",
  "sprint": "2",
  "agent_file": ".agents/kimi-overseer.yaml",
  "status": "archived",
  "notes": "Sprint 2 session",
  "archived_at": "2026-02-10T10:00:00Z",
  "tasks_completed": "12"
}
```

## Sprint-Session Lifecycle

Sessions are automatically managed as part of the sprint workflow:

```
Sprint Start                    Sprint Active                Sprint Complete
─────────────────────────────────────────────────────────────────────────────
[ACTION:delegate]               Agent work, reviews,         All tasks DONE
[TASK:SPRINT-3]                 merges, reports              in .ai/status.md
       │                              │                            │
       ▼                              ▼                            ▼
post-commit hook                Kimi uses session            post-commit hook
auto-creates session            for context                  auto-archives session
"sprint-3"                      persistence                  + triggers evaluation
```

### Automatic Session Creation

When the post-commit hook detects a `[ACTION:delegate]` commit with a `SPRINT-*` task ID, it automatically creates a session:

```
[AGENT:kimi] [ACTION:delegate] [TASK:SPRINT-3] Starting sprint 3
→ Auto-creates session "sprint-3" via kimi-session-manager.sh
```

### Automatic Session Archival

When the post-commit hook detects sprint completion (all tasks DONE in `.ai/status.md`), it archives the current active session before triggering evaluation.

### Manual Session Management

You can also manage sessions manually at any time:

```bash
# Start a session for ad-hoc work
./scripts/kimi-session-manager.sh create debugging-auth --launch

# Archive when done
./scripts/kimi-session-manager.sh archive debugging-auth
```

## Integration Points

### Post-Commit Hook (`scripts/post-commit`)

- `check_sprint_start()` — Creates session on `[ACTION:delegate]` with `SPRINT-*` task
- `check_sprint_completion()` — Archives session when all tasks are DONE

### Evaluation Script (`scripts/generate-evaluation.sh`)

- Shows current session name in metrics summary
- Includes session info in Kimi Print Mode evaluation prompt

### Status Tracking (`.ai/status.md`)

- Health section includes "Session Management" and "Current Session" fields

## Kimi CLI Session Features

The session manager wraps these native Kimi CLI features:

| Feature | CLI Flag/Command | How We Use It |
|---------|-----------------|---------------|
| Named sessions | `--session <id>` | Resume specific sprint sessions |
| Continue last | `--continue` | Resume most recent session |
| Compact context | `/compact` | Summarize before archiving |
| Browse sessions | `/sessions` | Available inside Kimi CLI |
| Clear context | `/clear` | Reset for fresh start |

## Troubleshooting

### "Session not found" when resuming

The session may have been archived. Check with `list --all`:

```bash
./scripts/kimi-session-manager.sh list --all
```

If the session is archived, you'll need to create a new one.

### Stale sessions

If a session was created but never used, it may still be in `active/`. Clean up with:

```bash
./scripts/kimi-session-manager.sh delete stale-session-name
```

### Missing metadata

If a session's JSON file is corrupted or missing, the session manager handles this gracefully — it won't crash. You can delete the corrupted session and create a new one.

### JSON tool not available

The session manager tries `jq` first, then `python3`, then falls back to raw shell commands for JSON operations. For best results, install `jq`:

```bash
# macOS
brew install jq

# Linux
sudo apt install jq
```

### Kimi CLI not installed

The `resume` command requires Kimi CLI. Other commands (create, list, archive, delete, current) work without it.

```bash
# Install Kimi CLI
pipx install kimi-cli

# Authenticate
kimi
# then run /login inside the CLI
```

