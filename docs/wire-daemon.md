# Wire Mode Daemon

> **Status**: Experimental — Phase 7 of the Open Artel roadmap

The Wire Mode Daemon is a persistent coordination layer that bridges Git events with Kimi Code CLI via the Wire protocol (JSON-RPC 2.0 over stdin/stdout). Instead of spawning a new Kimi process for each commit (Print Mode), the daemon maintains a persistent connection for faster, stateful interactions.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Git Events  │────▶│  Wire Daemon     │────▶│  Kimi Wire Mode  │
│  (commits)   │     │  (Python)        │◀────│  (JSON-RPC 2.0)  │
└─────────────┘     └──────────────────┘     └──────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │  Approval Handler │
                    │  (auto/manual)    │
                    └──────────────────┘
```

**Flow**:
1. Agent commits code with routing headers: `[AGENT:x] [ACTION:y] [TASK:z]`
2. Git Watcher detects the new commit by polling `.git/refs/heads/`
3. Daemon parses the commit message and routes to the appropriate action
4. JSON-RPC client sends a prompt to Kimi Wire Mode
5. Kimi processes the request (review, merge, report, etc.)
6. Approval requests are handled automatically (CI) or via human prompt (local)

## Components

### JsonRpcClient

The JSON-RPC 2.0 client manages the bidirectional communication with `kimi --wire`:

- **`start(work_dir)`** — Spawns the Kimi subprocess and initializes the protocol
- **`send_request(method, params)`** — Sends a request and waits for the response
- **`send_prompt(prompt)`** — Sends a user prompt to Kimi
- **`cancel()`** — Cancels the current running turn
- **`on_event(type, handler)`** — Registers event handlers for Kimi events

Events handled: `TurnBegin`, `TurnEnd`, `ToolCall`, `ToolResult`, `ApprovalRequest`

### GitWatcher

Monitors `.git/refs/heads/` for branch updates:

- Polls every 2 seconds (configurable via `GIT_WATCH_INTERVAL`)
- Detects new commits by comparing HEAD hashes
- Parses commit messages for `[AGENT:x] [ACTION:y] [TASK:z]` routing headers
- Dispatches to registered callbacks

### ApprovalHandler

Handles `ApprovalRequest` events from Kimi:

- **Auto-approve mode** (`--auto-approve`): Approves all requests automatically (for CI/CD)
- **Manual mode**: Prompts the human via terminal for each approval
- Logs all approval decisions for audit

### WireDaemon

The main coordinator that ties everything together:

- Starts Kimi Wire Mode and Git Watcher
- Routes Git commits to appropriate Kimi prompts
- Manages the daemon lifecycle (PID file, signal handling)

## Installation

### Prerequisites

- Python 3.9+
- Kimi Code CLI (`pipx install kimi-cli`)
- Git repository
- `.env` file with `KIMI_API_KEY`

### Quick Start

```bash
# Start the daemon directly
python3 scripts/wire-daemon.py

# Start in dry-run mode (no Kimi connection)
python3 scripts/wire-daemon.py --dry-run

# Start with auto-approve (CI/CD mode)
python3 scripts/wire-daemon.py --auto-approve

# Start in background
python3 scripts/wire-daemon.py --background
```

### Install as System Service

```bash
# Install (macOS: launchd, Linux: systemd)
./scripts/install-wire-daemon.sh

# Start the service
./scripts/install-wire-daemon.sh --start

# Check status
./scripts/install-wire-daemon.sh --status

# Stop the service
./scripts/install-wire-daemon.sh --stop

# Remove the service
./scripts/install-wire-daemon.sh --remove
```

**macOS**: Installs as a launchd agent in `~/Library/LaunchAgents/`
**Linux**: Installs as a systemd user service in `~/.config/systemd/user/`

## Usage

### Daemon Commands

```bash
python3 scripts/wire-daemon.py                  # Start daemon (foreground)
python3 scripts/wire-daemon.py --background     # Start daemon (background)
python3 scripts/wire-daemon.py --status         # Check if running
python3 scripts/wire-daemon.py --stop           # Stop running daemon
python3 scripts/wire-daemon.py --dry-run        # Test without Kimi
python3 scripts/wire-daemon.py --auto-approve   # Auto-approve all requests
python3 scripts/wire-daemon.py --verbose        # Verbose logging
python3 scripts/wire-daemon.py --help           # Show help
```

### Making Commits

The daemon watches for commits with routing headers:

```bash
# Submit work for review
git commit -m "[AGENT:cursor] [ACTION:submit] [TASK:TASK-001] Implement feature X"

# Approve and merge
git commit -m "[AGENT:kimi] [ACTION:approve] [TASK:TASK-001] Review passed"

# Submit a report
git commit -m "[AGENT:claude] [ACTION:report] [TASK:SPRINT-1] Sprint summary"

# Trigger evaluation
git commit -m "[AGENT:kimi] [ACTION:evaluate] [TASK:SPRINT-EVAL] Sprint evaluation"
```

### Logs

The daemon logs to `.git/hooks/wire-daemon.log`:

```bash
# View logs
cat .git/hooks/wire-daemon.log

# Follow logs in real-time
tail -f .git/hooks/wire-daemon.log
```

## Wire Protocol

The daemon communicates with Kimi using JSON-RPC 2.0:

### Initialize

```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": "1",
  "params": {
    "protocol_version": "1.3",
    "client_info": {
      "name": "open-artel-wire-daemon",
      "version": "1.0.0"
    }
  }
}
```

### Send Prompt

```json
{
  "jsonrpc": "2.0",
  "method": "prompt",
  "id": "2",
  "params": {
    "user_input": "Review the submission for TASK-001..."
  }
}
```

### Events (from Kimi)

```json
{"jsonrpc": "2.0", "method": "event", "params": {"type": "TurnBegin"}}
{"jsonrpc": "2.0", "method": "event", "params": {"type": "ToolCall", "name": "read_file"}}
{"jsonrpc": "2.0", "method": "event", "params": {"type": "TurnEnd"}}
```

### Approval Request

```json
{
  "jsonrpc": "2.0",
  "method": "request",
  "id": "req-1",
  "params": {
    "type": "tool_approval",
    "tool_name": "write_file",
    "description": "Write review to .ai/reviews/TASK-001-review.md"
  }
}
```

## Testing

```bash
# Run the full test suite
./scripts/test-wire-daemon.sh

# Quick tests (skip live Wire Mode)
./scripts/test-wire-daemon.sh --quick

# Verbose output
./scripts/test-wire-daemon.sh --verbose
```

Test categories:
1. **Prerequisites** — Python, Kimi CLI, Git, .env
2. **Daemon script** — Syntax, imports, classes, help flag
3. **Daemon management** — Start, stop, status, PID file
4. **Git event detection** — Routing pattern parsing, refs reading
5. **Approval handler** — Auto-approve, logging
6. **Installation script** — Syntax, help, status
7. **Live Wire Mode** — Connection test (optional)
8. **Evaluation integration** — Script and template existence

## Comparison: Print Mode vs Wire Mode

| Feature | Print Mode (Phase 5) | Wire Mode (Phase 7) |
|---------|----------------------|----------------------|
| Connection | New process per commit | Persistent connection |
| Latency | Higher (startup overhead) | Lower (reuses connection) |
| State | Stateless | Stateful (conversation context) |
| Complexity | Simple (bash) | Complex (Python daemon) |
| Reliability | High (isolated) | Medium (daemon must stay running) |
| Use case | Simple review/merge | Complex multi-step workflows |

## Troubleshooting

### Daemon won't start

```bash
# Check if already running
python3 scripts/wire-daemon.py --status

# Check prerequisites
./scripts/install-wire-daemon.sh --status

# Try dry-run mode
python3 scripts/wire-daemon.py --dry-run --verbose
```

### Kimi connection fails

```bash
# Verify API key
echo $KIMI_API_KEY

# Test Kimi CLI directly
kimi --print -p "Say hello"

# Check .env file
cat .env
```

### No events detected

```bash
# Check Git refs
ls -la .git/refs/heads/

# Verify commit has routing headers
git log -1 --pretty=%B

# Check daemon logs
tail -20 .git/hooks/wire-daemon.log
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `KIMI_API_KEY` | (from .env) | Kimi/Moonshot API key |
| `GIT_WATCH_INTERVAL` | 2 seconds | How often to poll for Git changes |
| `WIRE_PROTOCOL_VERSION` | 1.3 | JSON-RPC protocol version |

## Files

| File | Purpose |
|------|---------|
| `scripts/wire-daemon.py` | Main daemon script |
| `scripts/install-wire-daemon.sh` | Service installation/management |
| `scripts/test-wire-daemon.sh` | Test suite |
| `.git/wire-daemon.pid` | PID file (when running) |
| `.git/hooks/wire-daemon.log` | Daemon log file |
| `.git/hooks/wire-daemon-stdout.log` | Service stdout (when installed) |
| `.git/hooks/wire-daemon-stderr.log` | Service stderr (when installed) |

