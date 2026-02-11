# Moonshot API Integration Guide

This guide covers the Moonshot REST API integration added in Phase 5. It enables project-specific API keys, file uploads for persistent context, cached token optimization, and streaming for long operations.

## 1. Overview

The Moonshot API (`https://api.moonshot.ai/v1`) is OpenAI-compatible. Phase 5 adds direct REST API calls for capabilities not available through the Kimi CLI alone:

| Feature | What It Does |
|---------|-------------|
| **Project API Keys** | Separate API keys per project (`.env.project`) |
| **Files API** | Upload project files for persistent context across sessions |
| **Cached Tokens** | 75% cost savings when reusing context ($0.15/1M vs $0.60/1M) |
| **Streaming** | SSE-based streaming for long evaluation reports |

All scripts use **Python stdlib only** (`urllib.request`, `json`) — no `pip install` required.

## 2. Project API Keys

### Why `.env.project`?

Different projects may use different Moonshot API keys (e.g., separate billing, rate limits). The `.env.project` file stores a project-specific key that takes priority over the global `.env`.

### Priority Order

All scripts resolve the API key in this order:

1. **`.env.project`** — Project-specific (highest priority)
2. **`.env`** — Global fallback
3. **`KIMI_API_KEY` env var** — Environment variable (lowest priority)

### Setup

```bash
# Create with a specific key
./scripts/setup-project-api-key.sh create --key sk-your-api-key

# Or interactively (prompts for key)
./scripts/setup-project-api-key.sh create

# Check which key source is active
./scripts/setup-project-api-key.sh status

# Validate the active key against Moonshot API
./scripts/setup-project-api-key.sh validate

# Remove project-specific key (falls back to .env)
./scripts/setup-project-api-key.sh remove
```

The `create` command automatically:
- Validates the key by calling `/v1/models`
- Adds `.env.project` to `.gitignore` if not already there
- Writes the key to `.env.project`

### Security

- `.env.project` is in `.gitignore` — never committed
- The `status` command masks keys (shows `sk-yrm3e...8Kds`)
- Keys are only loaded via `set -a; source; set +a` (no export to child processes beyond the script)

## 3. Files API

### What It Does

Upload project files to Moonshot so Kimi can reference them across sessions. Uploaded files persist on Moonshot's servers and can be referenced in conversations for document Q&A.

### API Client

The `scripts/moonshot-api-client.py` script provides 5 operations:

```bash
# Upload a file
python3 scripts/moonshot-api-client.py upload README.md

# List all uploaded files
python3 scripts/moonshot-api-client.py list

# Get metadata for a specific file
python3 scripts/moonshot-api-client.py get <file-id>

# Get file content
python3 scripts/moonshot-api-client.py content <file-id>

# Delete a file
python3 scripts/moonshot-api-client.py delete <file-id>

# Validate your API key
python3 scripts/moonshot-api-client.py validate
```

All output is JSON (except `content` which returns raw text), suitable for piping to `jq`.

### Batch Upload

The `scripts/upload-project-files.py` script handles batch operations:

```bash
# Upload all project files (initial setup)
python3 scripts/upload-project-files.py --initial

# Sync only changed files (incremental)
python3 scripts/upload-project-files.py --sync

# List what's uploaded
python3 scripts/upload-project-files.py --list

# Delete everything from Moonshot
python3 scripts/upload-project-files.py --clean

# Preview without making changes
python3 scripts/upload-project-files.py --initial --dry-run
```

### What Gets Uploaded

| Included | Excluded |
|----------|----------|
| `.agents/` (configs, prompts, skills) | `.env*` (secrets) |
| `.ai/` (tasks, status, reports) | `*.log` (logs) |
| `README.md`, `AGENTS.md`, `CLAUDE.md` | `.git/` (version control) |
| | `node_modules/`, `__pycache__/` |
| | Binary files (images, archives) |
| | Files > 1 MB |

### Upload Tracking

Uploaded file mappings are stored in `.ai/metrics/uploaded-files.json`:

```json
{
  "README.md": {
    "file_id": "cnco1234567890",
    "uploaded_at": "2026-02-10T12:00:00Z",
    "mtime": 1707566400.0,
    "bytes": 4096,
    "filename": "README.md"
  }
}
```

The `--sync` command uses `mtime` (modification time) to detect changes and only re-uploads modified files.

## 4. Cached Tokens

### How It Works

Moonshot caches frequently-used context. When the same content appears in consecutive API calls, cached tokens cost 75% less:

| Token Type | Cost (K2) |
|-----------|-----------|
| Input tokens | $0.60 / 1M |
| **Cached tokens** | **$0.15 / 1M** |
| Output tokens | $2.50 / 1M |

### Maximizing Cache Hits

1. **Reuse sessions**: Use `kimi --session <name>` to continue in the same session. The session context is cached.
2. **Group similar operations**: Run related tasks in the same session instead of creating new ones.
3. **Upload persistent files**: Files uploaded via the Files API are cached across sessions.
4. **Avoid frequent session switching**: Each new session starts with a cold cache.

### Best Practices

```bash
# Good: Reuse a session for related tasks
kimi --session sprint-3 --agent-file .agents/kimi-overseer.yaml

# Good: Upload project files once, reference across sessions
python3 scripts/upload-project-files.py --initial

# Bad: Creating a new session for every small task
kimi --print -p "Review this file"  # Cold cache every time
```

## 5. Streaming

### When to Use

Streaming delivers output incrementally via Server-Sent Events (SSE). Use it for:

- **Long evaluation reports** (minutes of generation)
- **Large file processing** (many files to analyze)
- **Real-time feedback** (see output as it's generated)

Do NOT use streaming for:
- Quick operations (< 10 seconds)
- Structured output that needs complete JSON
- Automated pipelines that parse the full response

### Usage

```bash
# Stream evaluation report output
./scripts/generate-evaluation.sh --stream

# Stream with other options
./scripts/generate-evaluation.sh --stream --sprint 3 --baseline
```

The `--stream` flag adds `--output-format stream-json` to the Kimi CLI call, which outputs tokens as they're generated rather than waiting for the complete response.

## 6. Best Practices

### File Selection

- Upload **coordination files** (`.ai/`, `.agents/`) — these give Kimi persistent context about your project structure
- Upload **key docs** (`README.md`, `AGENTS.md`) — these define project identity
- Skip **generated files** (reports, logs) — these change frequently and add noise
- Skip **large files** (> 1 MB) — these consume context budget

### Sync Frequency

- **After major changes**: Run `--sync` after updating agent configs, task briefs, or project docs
- **Start of sprint**: Run `--initial` to ensure clean state
- **End of sprint**: Run `--clean` to free Moonshot storage, then `--initial` for next sprint

### Token Optimization Workflow

```bash
# 1. Upload project files for persistent context
python3 scripts/upload-project-files.py --initial

# 2. Create a session for the sprint
./scripts/kimi-session-manager.sh create sprint-3

# 3. Work within the session (cached tokens accumulate)
kimi --session sprint-3 --agent-file .agents/kimi-overseer.yaml

# 4. Monitor context health
./scripts/kimi-context-monitor.sh check sprint-3

# 5. At sprint end, archive and sync
./scripts/kimi-session-manager.sh archive sprint-3
python3 scripts/upload-project-files.py --sync
```

## 7. Troubleshooting

### API Key Issues

| Problem | Solution |
|---------|----------|
| "No API key found" | Run `./scripts/setup-project-api-key.sh create --key YOUR_KEY` |
| "401 Unauthorized" | Key is invalid — get a new one from platform.moonshot.ai |
| "403 Forbidden" | Key may be rate-limited or expired |
| Key from wrong source | Run `./scripts/setup-project-api-key.sh status` to check priority |

### Upload Failures

| Problem | Solution |
|---------|----------|
| "File not found" | Check the file path is relative to project root |
| Upload timeout | File may be too large — check MAX_FILE_SIZE (1 MB) |
| "Duplicate file" | Run `--sync` instead of `--initial` to handle updates |
| Corrupt tracking file | Delete `.ai/metrics/uploaded-files.json` and re-run `--initial` |

### Streaming Issues

| Problem | Solution |
|---------|----------|
| No output | Check API key and network connection |
| Garbled output | Ensure terminal supports UTF-8 |
| Incomplete output | Check for Kimi session timeout (5-hour budget) |

### General

```bash
# Check your setup
./scripts/setup-project-api-key.sh status
python3 scripts/moonshot-api-client.py validate
python3 scripts/upload-project-files.py --list
```

