#!/usr/bin/env bash
# =============================================================================
# Open Artel — Project API Key Setup
# =============================================================================
#
# Manages project-specific Moonshot/Kimi API keys stored in .env.project.
# This file takes priority over the global .env when sourced by other scripts.
#
# Usage:
#   ./scripts/setup-project-api-key.sh create [--key KEY]  # Create .env.project
#   ./scripts/setup-project-api-key.sh validate             # Test API key
#   ./scripts/setup-project-api-key.sh remove               # Delete .env.project
#   ./scripts/setup-project-api-key.sh status               # Show key source
#   ./scripts/setup-project-api-key.sh --help               # Show help
#
# Priority order (highest to lowest):
#   1. .env.project  (project-specific)
#   2. .env          (global)
#   3. KIMI_API_KEY  (environment variable)
#
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ENV_PROJECT=".env.project"
ENV_GLOBAL=".env"
GITIGNORE=".gitignore"
MOONSHOT_API_BASE="https://api.moonshot.ai/v1"

# Colors (if terminal supports them)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' CYAN='' BLUE='' NC=''
fi

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Resolve API key with priority chain
# ---------------------------------------------------------------------------

resolve_api_key() {
    local key=""

    # Priority 1: .env.project
    if [ -f "$ENV_PROJECT" ]; then
        key=$(grep "^KIMI_API_KEY=" "$ENV_PROJECT" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
        if [ -n "$key" ]; then
            echo "$key"
            return 0
        fi
    fi

    # Priority 2: .env
    if [ -f "$ENV_GLOBAL" ]; then
        key=$(grep "^KIMI_API_KEY=" "$ENV_GLOBAL" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
        if [ -n "$key" ]; then
            echo "$key"
            return 0
        fi
    fi

    # Priority 3: Environment variable
    if [ -n "${KIMI_API_KEY:-}" ]; then
        echo "$KIMI_API_KEY"
        return 0
    fi

    echo ""
    return 1
}

# Get the source of the active API key
get_key_source() {
    if [ -f "$ENV_PROJECT" ]; then
        local key
        key=$(grep "^KIMI_API_KEY=" "$ENV_PROJECT" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
        if [ -n "$key" ]; then
            echo ".env.project"
            return
        fi
    fi

    if [ -f "$ENV_GLOBAL" ]; then
        local key
        key=$(grep "^KIMI_API_KEY=" "$ENV_GLOBAL" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
        if [ -n "$key" ]; then
            echo ".env"
            return
        fi
    fi

    if [ -n "${KIMI_API_KEY:-}" ]; then
        echo "environment variable"
        return
    fi

    echo "none"
}

# Mask API key for display (show first 8 and last 4 chars)
mask_key() {
    local key="$1"
    local len=${#key}
    if [ "$len" -le 12 ]; then
        echo "****"
    else
        echo "${key:0:8}...${key: -4}"
    fi
}

# ---------------------------------------------------------------------------
# Ensure .env.project is in .gitignore
# ---------------------------------------------------------------------------

ensure_gitignore() {
    if [ ! -f "$GITIGNORE" ]; then
        echo ".env.project" > "$GITIGNORE"
        info "Created $GITIGNORE with .env.project"
        return
    fi

    if grep -qF ".env.project" "$GITIGNORE" 2>/dev/null; then
        return  # Already there
    fi

    # Add .env.project to the environment section
    echo "" >> "$GITIGNORE"
    echo "# Project-specific environment" >> "$GITIGNORE"
    echo ".env.project" >> "$GITIGNORE"
    info "Added .env.project to $GITIGNORE"
}

# ---------------------------------------------------------------------------
# Validate API key by calling Moonshot API /v1/models
# ---------------------------------------------------------------------------

validate_api_key() {
    local key="$1"

    if [ -z "$key" ]; then
        error "No API key provided"
        return 1
    fi

    if ! command -v curl &>/dev/null; then
        # Fallback to python3 urllib
        if python3 -c "pass" &>/dev/null; then
            local result
            result=$(python3 -c "
import urllib.request, json, sys
try:
    req = urllib.request.Request(
        '${MOONSHOT_API_BASE}/models',
        headers={'Authorization': f'Bearer {sys.argv[1]}'}
    )
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read().decode())
    if 'data' in data:
        print('OK:' + str(len(data['data'])))
    else:
        print('ERROR:unexpected response')
except urllib.error.HTTPError as e:
    print(f'ERROR:{e.code}:{e.reason}')
except Exception as e:
    print(f'ERROR:{e}')
" "$key" 2>/dev/null)

            if echo "$result" | grep -q "^OK:"; then
                local model_count
                model_count=$(echo "$result" | cut -d: -f2)
                return 0
            else
                local err_msg
                err_msg=$(echo "$result" | cut -d: -f2-)
                error "API validation failed: $err_msg"
                return 1
            fi
        else
            warn "Neither curl nor python3 available — cannot validate API key"
            return 2
        fi
    fi

    # Use curl to validate
    local http_code
    local response
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $key" \
        "${MOONSHOT_API_BASE}/models" 2>/dev/null)

    http_code=$(echo "$response" | tail -1)
    local body
    body=$(echo "$response" | head -n -1)

    case "$http_code" in
        200)
            return 0
            ;;
        401)
            error "API key is invalid (401 Unauthorized)"
            return 1
            ;;
        403)
            error "API key is forbidden (403 Forbidden)"
            return 1
            ;;
        *)
            error "API validation failed (HTTP $http_code)"
            if [ -n "$body" ]; then
                echo "  Response: $(echo "$body" | head -1)"
            fi
            return 1
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Command: create
# ---------------------------------------------------------------------------

cmd_create() {
    local key=""

    # Parse arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --key|-k)
                key="$2"
                shift 2
                ;;
            -*)
                error "Unknown option: $1"
                return 1
                ;;
            *)
                shift
                ;;
        esac
    done

    # If no key provided, check if we should read from stdin
    if [ -z "$key" ]; then
        # Check if there's already a key we can use
        local existing
        existing=$(resolve_api_key)
        if [ -n "$existing" ]; then
            local source
            source=$(get_key_source)
            info "Found existing API key from $source"
            printf "  Use this key for .env.project? [Y/n]: "
            read -r confirm < /dev/tty 2>/dev/null || confirm="y"
            if [ "$confirm" = "n" ] || [ "$confirm" = "N" ]; then
                printf "  Enter Moonshot API key: "
                read -r key < /dev/tty 2>/dev/null || {
                    error "Could not read from terminal. Use --key flag instead."
                    return 1
                }
            else
                key="$existing"
            fi
        else
            printf "  Enter Moonshot API key: "
            read -r key < /dev/tty 2>/dev/null || {
                error "Could not read from terminal. Use --key flag instead."
                return 1
            }
        fi
    fi

    if [ -z "$key" ]; then
        error "API key cannot be empty"
        return 1
    fi

    # Validate the key
    info "Validating API key..."
    if validate_api_key "$key"; then
        success "API key is valid"
    else
        warn "API key validation failed — saving anyway (may be a network issue)"
    fi

    # Write .env.project
    echo "KIMI_API_KEY=$key" > "$ENV_PROJECT"
    success "Created $ENV_PROJECT"

    # Ensure .gitignore includes .env.project
    ensure_gitignore

    info "Key source priority: .env.project > .env > env var"
    info "All scripts will now use this project-specific key."
}

# ---------------------------------------------------------------------------
# Command: validate
# ---------------------------------------------------------------------------

cmd_validate() {
    local key
    key=$(resolve_api_key)

    if [ -z "$key" ]; then
        error "No API key found. Run '$0 create' first or set KIMI_API_KEY."
        return 1
    fi

    local source
    source=$(get_key_source)
    info "Validating key from $source..."
    info "Key: $(mask_key "$key")"

    if validate_api_key "$key"; then
        success "API key is valid (from $source)"
        return 0
    else
        return 1
    fi
}

# ---------------------------------------------------------------------------
# Command: remove
# ---------------------------------------------------------------------------

cmd_remove() {
    if [ ! -f "$ENV_PROJECT" ]; then
        warn "$ENV_PROJECT does not exist — nothing to remove"
        return 0
    fi

    rm -f "$ENV_PROJECT"
    success "Removed $ENV_PROJECT"

    # Check what key source remains
    local remaining_source
    remaining_source=$(get_key_source)
    if [ "$remaining_source" = "none" ]; then
        warn "No API key configured. Set one in .env or KIMI_API_KEY env var."
    else
        info "Falling back to key from: $remaining_source"
    fi
}

# ---------------------------------------------------------------------------
# Command: status
# ---------------------------------------------------------------------------

cmd_status() {
    echo ""
    echo "========================================="
    echo "  API Key Status"
    echo "========================================="
    echo ""

    local active_source
    active_source=$(get_key_source)

    # Check each source
    local p_key="" g_key="" e_key=""

    if [ -f "$ENV_PROJECT" ]; then
        p_key=$(grep "^KIMI_API_KEY=" "$ENV_PROJECT" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    fi

    if [ -f "$ENV_GLOBAL" ]; then
        g_key=$(grep "^KIMI_API_KEY=" "$ENV_GLOBAL" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    fi

    e_key="${KIMI_API_KEY:-}"

    printf "  %-20s %-10s %-20s\n" "Source" "Status" "Key"
    printf "  %-20s %-10s %-20s\n" "--------------------" "----------" "--------------------"

    if [ -n "$p_key" ]; then
        local marker=""
        [ "$active_source" = ".env.project" ] && marker=" (ACTIVE)"
        printf "  %-20s %-10s %-20s\n" ".env.project" "SET${marker}" "$(mask_key "$p_key")"
    else
        printf "  %-20s %-10s %-20s\n" ".env.project" "NOT SET" "—"
    fi

    if [ -n "$g_key" ]; then
        local marker=""
        [ "$active_source" = ".env" ] && marker=" (ACTIVE)"
        printf "  %-20s %-10s %-20s\n" ".env" "SET${marker}" "$(mask_key "$g_key")"
    else
        printf "  %-20s %-10s %-20s\n" ".env" "NOT SET" "—"
    fi

    if [ -n "$e_key" ]; then
        local marker=""
        [ "$active_source" = "environment variable" ] && marker=" (ACTIVE)"
        printf "  %-20s %-10s %-20s\n" "env var" "SET${marker}" "$(mask_key "$e_key")"
    else
        printf "  %-20s %-10s %-20s\n" "env var" "NOT SET" "—"
    fi

    echo ""
    echo "  Active source: $active_source"
    echo ""

    if [ "$active_source" = "none" ]; then
        warn "No API key configured!"
        echo "  Run: $0 create --key YOUR_KEY"
        echo ""
        return 1
    fi

    return 0
}

# ---------------------------------------------------------------------------
# Command: help
# ---------------------------------------------------------------------------

cmd_help() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Manage project-specific Moonshot/Kimi API keys."
    echo ""
    echo "Commands:"
    echo "  create [--key KEY]    Create .env.project with API key"
    echo "                        If --key not provided, prompts interactively"
    echo "  validate              Test the active API key against Moonshot API"
    echo "  remove                Delete .env.project"
    echo "  status                Show which key source is active"
    echo "  --help, -h            Show this help message"
    echo ""
    echo "Priority order (highest to lowest):"
    echo "  1. .env.project  (project-specific)"
    echo "  2. .env          (global)"
    echo "  3. KIMI_API_KEY  (environment variable)"
    echo ""
    echo "Examples:"
    echo "  $0 create --key sk-abc123def456"
    echo "  $0 validate"
    echo "  $0 status"
    echo "  $0 remove"
    echo ""
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
    local command="${1:-}"
    shift 2>/dev/null || true

    case "$command" in
        create)     cmd_create "$@" ;;
        validate)   cmd_validate ;;
        remove)     cmd_remove ;;
        status)     cmd_status ;;
        --help|-h|help) cmd_help ;;
        "")         cmd_help ;;
        *)
            error "Unknown command: $command"
            echo "Use '$0 --help' for usage information."
            exit 1
            ;;
    esac
}

main "$@"

