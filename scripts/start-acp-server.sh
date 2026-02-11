#!/usr/bin/env bash
# =============================================================================
# Open Artel — ACP/Web Server Helper
# =============================================================================
#
# Helper script to start, stop, and manage Kimi ACP and Web servers.
#
# Usage:
#   ./scripts/start-acp-server.sh acp              # Start ACP server (background)
#   ./scripts/start-acp-server.sh web [OPTIONS]     # Start web interface
#   ./scripts/start-acp-server.sh status            # Check server status
#   ./scripts/start-acp-server.sh stop              # Stop all servers
#   ./scripts/start-acp-server.sh --help            # Show help
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colors and formatting
# ---------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
PID_DIR="$REPO_ROOT/.git/hooks"
ACP_PID_FILE="$PID_DIR/acp-server.pid"
WEB_PID_FILE="$PID_DIR/web-server.pid"

# ---------------------------------------------------------------------------
# Load environment
# ---------------------------------------------------------------------------

# Load .env.project first (project-specific, highest priority)
if [ -f "$REPO_ROOT/.env.project" ]; then
    set -a; source "$REPO_ROOT/.env.project"; set +a
fi
# Then .env (global fallback)
if [ -f "$REPO_ROOT/.env" ]; then
    set -a; source "$REPO_ROOT/.env"; set +a
fi

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

show_help() {
    echo ""
    echo "========================================="
    echo "  Open Artel — ACP/Web Server Helper"
    echo "========================================="
    echo ""
    echo "  Usage:"
    echo "    $0 acp                    Start ACP server (background, stdio)"
    echo "    $0 web [OPTIONS]          Start web interface"
    echo "    $0 status                 Check server status"
    echo "    $0 stop                   Stop all servers"
    echo "    $0 --help                 Show this help"
    echo ""
    echo "  Web Options (passed through to kimi web):"
    echo "    --port PORT               Port number (default: 5494)"
    echo "    --auth-token TOKEN        Bearer token for authentication"
    echo "    --network                 Bind to 0.0.0.0 for network access"
    echo "    --no-open                 Don't auto-open browser"
    echo ""
    echo "  Examples:"
    echo "    $0 web --port 8080 --no-open"
    echo "    $0 web --network --auth-token mysecret"
    echo ""
}

check_prerequisites() {
    # Check if kimi is installed
    if ! command -v kimi &>/dev/null; then
        echo -e "${RED}ERROR${NC}: Kimi CLI not found."
        echo "  Install with: pipx install kimi-cli"
        return 1
    fi

    # Check if authenticated
    if ! kimi info &>/dev/null; then
        echo -e "${RED}ERROR${NC}: Kimi CLI not authenticated."
        echo "  Run: kimi"
        echo "  Then: /login"
        return 1
    fi

    return 0
}

is_process_running() {
    local pid_file="$1"
    if [ -f "$pid_file" ]; then
        local pid
        pid=$(cat "$pid_file" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            # Stale PID file — clean up
            rm -f "$pid_file"
            return 1
        fi
    fi
    return 1
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

cmd_acp() {
    if ! check_prerequisites; then
        return 1
    fi

    if is_process_running "$ACP_PID_FILE"; then
        local pid
        pid=$(cat "$ACP_PID_FILE")
        echo -e "${YELLOW}ACP server already running${NC} (PID $pid)"
        return 0
    fi

    echo -e "${BLUE}Starting ACP server...${NC}"

    # ACP communicates via stdio, so we run it in the background
    # and redirect stdio to a named pipe or log
    mkdir -p "$PID_DIR"
    nohup kimi acp > "$PID_DIR/acp-server.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$ACP_PID_FILE"

    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${GREEN}ACP server started${NC} (PID $pid)"
        echo "  Log: $PID_DIR/acp-server.log"
    else
        echo -e "${RED}ACP server failed to start${NC}"
        rm -f "$ACP_PID_FILE"
        echo "  Check log: $PID_DIR/acp-server.log"
        return 1
    fi
}

cmd_web() {
    if ! check_prerequisites; then
        return 1
    fi

    if is_process_running "$WEB_PID_FILE"; then
        local pid
        pid=$(cat "$WEB_PID_FILE")
        echo -e "${YELLOW}Web server already running${NC} (PID $pid)"
        return 0
    fi

    echo -e "${BLUE}Starting web interface...${NC}"

    # Pass through any additional arguments to kimi web
    local web_args=("$@")

    mkdir -p "$PID_DIR"
    nohup kimi web "${web_args[@]}" > "$PID_DIR/web-server.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$WEB_PID_FILE"

    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${GREEN}Web interface started${NC} (PID $pid)"
        echo "  Log: $PID_DIR/web-server.log"

        # Try to determine the port
        local port="5494"
        for i in "${!web_args[@]}"; do
            if [ "${web_args[$i]}" = "--port" ] && [ -n "${web_args[$((i+1))]:-}" ]; then
                port="${web_args[$((i+1))]}"
            fi
        done
        echo "  URL: http://localhost:$port"
    else
        echo -e "${RED}Web interface failed to start${NC}"
        rm -f "$WEB_PID_FILE"
        echo "  Check log: $PID_DIR/web-server.log"
        return 1
    fi
}

cmd_status() {
    echo ""
    echo "========================================="
    echo "  ACP/Web Server Status"
    echo "========================================="
    echo ""

    # ACP status
    if is_process_running "$ACP_PID_FILE"; then
        local acp_pid
        acp_pid=$(cat "$ACP_PID_FILE")
        echo -e "  ACP Server:  ${GREEN}RUNNING${NC} (PID $acp_pid)"
    else
        echo -e "  ACP Server:  ${RED}STOPPED${NC}"
    fi

    # Web status
    if is_process_running "$WEB_PID_FILE"; then
        local web_pid
        web_pid=$(cat "$WEB_PID_FILE")
        echo -e "  Web Server:  ${GREEN}RUNNING${NC} (PID $web_pid)"
    else
        echo -e "  Web Server:  ${RED}STOPPED${NC}"
    fi

    # Kimi CLI info
    echo ""
    echo "  Kimi CLI:    $(kimi --version 2>/dev/null || echo 'not installed')"
    echo ""
}

cmd_stop() {
    local stopped=0

    if is_process_running "$ACP_PID_FILE"; then
        local pid
        pid=$(cat "$ACP_PID_FILE")
        kill "$pid" 2>/dev/null
        rm -f "$ACP_PID_FILE"
        echo -e "${GREEN}ACP server stopped${NC} (PID $pid)"
        stopped=1
    fi

    if is_process_running "$WEB_PID_FILE"; then
        local pid
        pid=$(cat "$WEB_PID_FILE")
        kill "$pid" 2>/dev/null
        rm -f "$WEB_PID_FILE"
        echo -e "${GREEN}Web server stopped${NC} (PID $pid)"
        stopped=1
    fi

    if [ "$stopped" -eq 0 ]; then
        echo "No servers running."
    fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

case "${1:-}" in
    acp)
        shift
        cmd_acp "$@"
        ;;
    web)
        shift
        cmd_web "$@"
        ;;
    status)
        cmd_status
        ;;
    stop)
        cmd_stop
        ;;
    --help|-h|"")
        show_help
        exit 0
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac

