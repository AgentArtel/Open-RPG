#!/usr/bin/env bash
# =============================================================================
# Open Artel — Wire Daemon Installation & Management
# =============================================================================
#
# Installs the Wire Mode daemon as a background service:
#   - macOS: launchd plist (~/Library/LaunchAgents/)
#   - Linux: systemd user service (~/.config/systemd/user/)
#
# Usage:
#   ./scripts/install-wire-daemon.sh              # Install as service
#   ./scripts/install-wire-daemon.sh --start      # Start the daemon
#   ./scripts/install-wire-daemon.sh --stop       # Stop the daemon
#   ./scripts/install-wire-daemon.sh --restart    # Restart the daemon
#   ./scripts/install-wire-daemon.sh --status     # Check daemon status
#   ./scripts/install-wire-daemon.sh --remove     # Remove the service
#   ./scripts/install-wire-daemon.sh --help       # Show help
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DAEMON_SCRIPT="$PROJECT_ROOT/scripts/wire-daemon.py"

# Service identifiers
SERVICE_NAME="dev.open-artel.wire-daemon"
LAUNCHD_PLIST="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"
SYSTEMD_SERVICE="$HOME/.config/systemd/user/${SERVICE_NAME}.service"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }

detect_os() {
    case "$(uname -s)" in
        Darwin*) echo "macos" ;;
        Linux*)  echo "linux" ;;
        *)       echo "unknown" ;;
    esac
}

# ---------------------------------------------------------------------------
# Prerequisites check
# ---------------------------------------------------------------------------

check_prerequisites() {
    info "Checking prerequisites..."

    # Check Python 3.9+
    if command -v python3 &>/dev/null; then
        local py_version
        py_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
        local py_major py_minor
        py_major=$(echo "$py_version" | cut -d. -f1)
        py_minor=$(echo "$py_version" | cut -d. -f2)
        if [ "$py_major" -ge 3 ] && [ "$py_minor" -ge 9 ]; then
            success "Python $py_version found"
        else
            error "Python 3.9+ required (found $py_version)"
            return 1
        fi
    else
        error "Python 3 not found"
        return 1
    fi

    # Check Kimi CLI
    if command -v kimi &>/dev/null; then
        local kimi_version
        kimi_version=$(kimi --version 2>/dev/null || echo "unknown")
        success "Kimi CLI found ($kimi_version)"
    else
        warn "Kimi CLI not found — daemon will start but cannot connect to Kimi"
        warn "Install with: pipx install kimi-cli"
    fi

    # Check daemon script
    if [ -f "$DAEMON_SCRIPT" ]; then
        success "Daemon script found: $DAEMON_SCRIPT"
    else
        error "Daemon script not found: $DAEMON_SCRIPT"
        return 1
    fi

    # Check Git repo
    if git -C "$PROJECT_ROOT" rev-parse --git-dir &>/dev/null; then
        success "Git repository found"
    else
        error "Not a Git repository: $PROJECT_ROOT"
        return 1
    fi

    # Check .env file
    if [ -f "$PROJECT_ROOT/.env" ]; then
        success ".env file found"
    else
        warn ".env file not found — Kimi API key may not be available"
    fi
}

# ---------------------------------------------------------------------------
# macOS: launchd installation
# ---------------------------------------------------------------------------

install_macos() {
    info "Installing launchd service for macOS..."

    mkdir -p "$(dirname "$LAUNCHD_PLIST")"

    # Generate the plist file
    cat > "$LAUNCHD_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_NAME}</string>

    <key>ProgramArguments</key>
    <array>
        <string>$(which python3)</string>
        <string>${DAEMON_SCRIPT}</string>
        <string>--auto-approve</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${PROJECT_ROOT}</string>

    <key>RunAtLoad</key>
    <false/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>

    <key>StandardOutPath</key>
    <string>${PROJECT_ROOT}/.git/hooks/wire-daemon-stdout.log</string>

    <key>StandardErrorPath</key>
    <string>${PROJECT_ROOT}/.git/hooks/wire-daemon-stderr.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:$(dirname "$(which python3)"):$(dirname "$(which kimi 2>/dev/null || echo /usr/local/bin/kimi)")</string>
    </dict>
</dict>
</plist>
EOF

    success "Launchd plist created: $LAUNCHD_PLIST"

    # Load the service (but don't start it)
    launchctl load "$LAUNCHD_PLIST" 2>/dev/null || true
    success "Service loaded (not started)"
    info "Start with: $0 --start"
}

remove_macos() {
    info "Removing launchd service..."

    if [ -f "$LAUNCHD_PLIST" ]; then
        launchctl unload "$LAUNCHD_PLIST" 2>/dev/null || true
        rm -f "$LAUNCHD_PLIST"
        success "Launchd service removed"
    else
        info "Launchd service not installed"
    fi
}

start_macos() {
    if [ -f "$LAUNCHD_PLIST" ]; then
        launchctl start "$SERVICE_NAME" 2>/dev/null
        success "Daemon started via launchd"
    else
        warn "Service not installed. Starting directly..."
        python3 "$DAEMON_SCRIPT" --auto-approve --background
    fi
}

stop_macos() {
    if [ -f "$LAUNCHD_PLIST" ]; then
        launchctl stop "$SERVICE_NAME" 2>/dev/null || true
        success "Daemon stopped via launchd"
    else
        python3 "$DAEMON_SCRIPT" --stop
    fi
}

# ---------------------------------------------------------------------------
# Linux: systemd installation
# ---------------------------------------------------------------------------

install_linux() {
    info "Installing systemd user service for Linux..."

    mkdir -p "$(dirname "$SYSTEMD_SERVICE")"

    cat > "$SYSTEMD_SERVICE" << EOF
[Unit]
Description=Open Artel Wire Mode Coordination Daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=${PROJECT_ROOT}
ExecStart=$(which python3) ${DAEMON_SCRIPT} --auto-approve
Restart=on-failure
RestartSec=10
StandardOutput=append:${PROJECT_ROOT}/.git/hooks/wire-daemon-stdout.log
StandardError=append:${PROJECT_ROOT}/.git/hooks/wire-daemon-stderr.log

# Environment
Environment=PATH=/usr/local/bin:/usr/bin:/bin:$(dirname "$(which python3)")

[Install]
WantedBy=default.target
EOF

    success "Systemd service created: $SYSTEMD_SERVICE"

    # Reload systemd
    systemctl --user daemon-reload
    success "Systemd reloaded"
    info "Start with: $0 --start"
}

remove_linux() {
    info "Removing systemd service..."

    if [ -f "$SYSTEMD_SERVICE" ]; then
        systemctl --user stop "$SERVICE_NAME" 2>/dev/null || true
        systemctl --user disable "$SERVICE_NAME" 2>/dev/null || true
        rm -f "$SYSTEMD_SERVICE"
        systemctl --user daemon-reload
        success "Systemd service removed"
    else
        info "Systemd service not installed"
    fi
}

start_linux() {
    if [ -f "$SYSTEMD_SERVICE" ]; then
        systemctl --user start "$SERVICE_NAME"
        success "Daemon started via systemd"
    else
        warn "Service not installed. Starting directly..."
        python3 "$DAEMON_SCRIPT" --auto-approve --background
    fi
}

stop_linux() {
    if [ -f "$SYSTEMD_SERVICE" ]; then
        systemctl --user stop "$SERVICE_NAME" 2>/dev/null || true
        success "Daemon stopped via systemd"
    else
        python3 "$DAEMON_SCRIPT" --stop
    fi
}

# ---------------------------------------------------------------------------
# Status display
# ---------------------------------------------------------------------------

show_status() {
    echo ""
    echo "========================================="
    echo "  Open Artel — Wire Daemon Status"
    echo "========================================="
    echo ""

    local os_type
    os_type=$(detect_os)

    # Check service installation
    case "$os_type" in
        macos)
            if [ -f "$LAUNCHD_PLIST" ]; then
                success "Service installed (launchd): $LAUNCHD_PLIST"
                # Check if running via launchctl
                if launchctl list 2>/dev/null | grep -q "$SERVICE_NAME"; then
                    success "Service is loaded in launchd"
                else
                    info "Service is not loaded"
                fi
            else
                info "Service not installed (launchd)"
            fi
            ;;
        linux)
            if [ -f "$SYSTEMD_SERVICE" ]; then
                success "Service installed (systemd): $SYSTEMD_SERVICE"
                systemctl --user status "$SERVICE_NAME" --no-pager 2>/dev/null || true
            else
                info "Service not installed (systemd)"
            fi
            ;;
    esac

    echo ""

    # Check daemon process via PID file
    python3 "$DAEMON_SCRIPT" --status 2>/dev/null || true

    # Check prerequisites
    echo ""
    check_prerequisites
    echo ""
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
    local action="${1:-install}"
    local os_type
    os_type=$(detect_os)

    case "$action" in
        --install|install)
            echo ""
            echo "========================================="
            echo "  Open Artel — Wire Daemon Installation"
            echo "========================================="
            echo ""

            check_prerequisites || exit 1
            echo ""

            case "$os_type" in
                macos)  install_macos ;;
                linux)  install_linux ;;
                *)
                    error "Unsupported OS. Use the daemon directly:"
                    echo "  python3 $DAEMON_SCRIPT --background"
                    exit 1
                    ;;
            esac

            echo ""
            success "Installation complete!"
            echo ""
            echo "  Start:   $0 --start"
            echo "  Stop:    $0 --stop"
            echo "  Status:  $0 --status"
            echo "  Remove:  $0 --remove"
            echo ""
            ;;

        --start|start)
            case "$os_type" in
                macos)  start_macos ;;
                linux)  start_linux ;;
                *)      python3 "$DAEMON_SCRIPT" --auto-approve --background ;;
            esac
            ;;

        --stop|stop)
            case "$os_type" in
                macos)  stop_macos ;;
                linux)  stop_linux ;;
                *)      python3 "$DAEMON_SCRIPT" --stop ;;
            esac
            ;;

        --restart|restart)
            case "$os_type" in
                macos)  stop_macos; sleep 1; start_macos ;;
                linux)  stop_linux; sleep 1; start_linux ;;
                *)      python3 "$DAEMON_SCRIPT" --stop; sleep 1; python3 "$DAEMON_SCRIPT" --auto-approve --background ;;
            esac
            ;;

        --status|status)
            show_status
            ;;

        --remove|remove)
            case "$os_type" in
                macos)  remove_macos ;;
                linux)  remove_linux ;;
                *)      info "No service to remove on this OS" ;;
            esac
            ;;

        --help|-h|help)
            echo "Usage: $0 [COMMAND]"
            echo ""
            echo "Commands:"
            echo "  install (default)   Install as system service"
            echo "  --start             Start the daemon"
            echo "  --stop              Stop the daemon"
            echo "  --restart           Restart the daemon"
            echo "  --status            Show daemon status"
            echo "  --remove            Remove the service"
            echo "  --help              Show this help"
            echo ""
            echo "The daemon watches for Git commits with routing headers and"
            echo "routes them to Kimi Code CLI via Wire Mode (JSON-RPC 2.0)."
            echo ""
            echo "On macOS: installs as launchd agent"
            echo "On Linux: installs as systemd user service"
            echo ""
            ;;

        *)
            error "Unknown command: $action"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
}

main "$@"

