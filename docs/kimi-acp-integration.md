# Kimi ACP, Web, and Term Integration Guide

## Overview

Kimi Code CLI provides three interface modes beyond the standard CLI, Wire, and Print modes:

| Mode | Command | Purpose |
|------|---------|---------|
| **ACP** | `kimi acp` | Agent Communication Protocol — stdio-based server for IDE integration |
| **Web** | `kimi web` | Browser-based web interface with REST API |
| **Term** | `kimi term` | Terminal UI (TUI) backed by ACP server |

These modes complement the existing workflow:

- **ACP**: For IDE plugins (Zed, JetBrains) that speak the ACP protocol
- **Web**: For browser-based access with authentication and network controls
- **Term**: For a rich terminal UI experience

## ACP Mode

### What Is ACP?

ACP (Agent Communication Protocol) is a stdio-based protocol for IDE integration. When you run `kimi acp`, Kimi starts a server that communicates via stdin/stdout using a JSON-RPC-like protocol, similar to Wire mode but with IDE-specific capabilities.

### Starting ACP

```bash
# Start ACP server (communicates via stdin/stdout)
kimi acp
```

ACP has no additional CLI options — it reads from stdin and writes to stdout. IDEs connect to it by spawning the process and communicating over the stdio streams.

### IDE Integration

#### Zed Editor

Zed has native support for ACP-compatible agents. To configure:

1. Open Zed settings
2. Add Kimi as an ACP agent provider
3. Point to the `kimi acp` command

#### JetBrains IDEs

JetBrains IDEs can integrate via plugins that support the ACP protocol:

1. Install an ACP-compatible plugin
2. Configure the agent command as `kimi acp`
3. Set the working directory to your project root

#### Custom Integration

Any tool that can spawn a subprocess and communicate via stdin/stdout can use ACP:

```bash
# Example: pipe a request to ACP
echo '{"method":"initialize","params":{}}' | kimi acp
```

## Web Mode

### What Is Web Mode?

`kimi web` starts a browser-accessible web interface for Kimi, running on `localhost:5494` by default. It provides a chat-like UI with full agent capabilities.

### Starting the Web Interface

```bash
# Start with defaults (localhost:5494, opens browser)
kimi web

# Start on a specific port without opening browser
kimi web --port 8080 --no-open

# Enable network access (bind to 0.0.0.0)
kimi web --network --port 8080

# With authentication
kimi web --auth-token "your-secret-token"

# Restrict sensitive APIs (safer for shared environments)
kimi web --restrict-sensitive-apis
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `--host` | `127.0.0.1` | IP address to bind to |
| `--port` | `5494` | Port number |
| `--network` | off | Bind to `0.0.0.0` for network access |
| `--open / --no-open` | open | Auto-open browser |
| `--auth-token` | none | Bearer token for API authentication |
| `--allowed-origins` | none | CORS allowed origins (comma-separated) |
| `--restrict-sensitive-apis` | off | Disable config write, file access limits |
| `--lan-only / --public` | lan-only | Network access scope |
| `--reload` | off | Auto-reload on changes |
| `--dangerously-omit-auth` | off | Disable auth (dangerous on public networks) |

### Security Considerations

- **Default**: Only accessible from localhost (safe)
- **`--network`**: Accessible from LAN — use `--auth-token` for security
- **`--public`**: Accessible from internet — always use `--auth-token`
- **`--dangerously-omit-auth`**: Never use on public networks

### Use Cases

- **Team demos**: Share a Kimi session via browser with `--network --auth-token`
- **Remote development**: Access Kimi from another machine on your network
- **Non-technical users**: Provide a browser-based interface for project managers

## Term Mode

### What Is Term Mode?

`kimi term` launches a rich Terminal UI (TUI) powered by the Toad framework, backed by an ACP server. It provides a more visual terminal experience than the standard CLI.

### Starting Term Mode

```bash
# Start the TUI
kimi term
```

Term mode has no additional CLI options. It starts an ACP server internally and renders a TUI on top of it.

## Helper Script

A helper script is provided at `scripts/start-acp-server.sh` to manage ACP and Web servers:

```bash
# Start ACP server in background
./scripts/start-acp-server.sh acp

# Start web interface
./scripts/start-acp-server.sh web

# Start web with custom port and auth
./scripts/start-acp-server.sh web --port 8080 --auth-token mytoken

# Check status
./scripts/start-acp-server.sh status

# Stop all servers
./scripts/start-acp-server.sh stop
```

## Integration with Open Artel Workflow

### When to Use Each Mode

| Scenario | Recommended Mode |
|----------|-----------------|
| Automated CI/CD | Print mode (`kimi --print`) |
| Git hook automation | Print mode or Wire mode |
| IDE integration | ACP mode (`kimi acp`) |
| Browser-based access | Web mode (`kimi web`) |
| Rich terminal UI | Term mode (`kimi term`) |
| Persistent daemon | Wire mode (`kimi --wire`) |

### Combining with Existing Tools

All modes respect:

- Agent files (`--agent-file .agents/kimi-overseer.yaml` for Print/Wire)
- Session management (sessions are shared across modes)
- Project configuration (`~/.kimi/config.toml`)
- API key priority (`.env.project` > `.env` > env var)

## Troubleshooting

### ACP Server Not Responding

1. Verify Kimi CLI is installed: `kimi --version`
2. Verify authentication: `kimi info`
3. Check if another ACP process is running: `ps aux | grep "kimi acp"`

### Web Interface Port Conflict

```bash
# Check what's using port 5494
lsof -i :5494

# Use a different port
kimi web --port 8080
```

### Term Mode Display Issues

Term mode requires a terminal that supports modern TUI rendering. If display is garbled:

1. Try a different terminal emulator
2. Ensure terminal supports UTF-8
3. Check terminal size (minimum ~80x24)

