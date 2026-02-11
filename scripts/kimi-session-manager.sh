#!/usr/bin/env bash
# =============================================================================
# Open Artel — Kimi Session Manager
# =============================================================================
#
# Manages Kimi CLI sessions tied to sprints. Wraps Kimi's native session
# features (--continue, --session, /compact) with metadata tracking,
# sprint integration, and archival.
#
# Usage:
#   ./scripts/kimi-session-manager.sh create <name> [--sprint N]
#   ./scripts/kimi-session-manager.sh list [--all]
#   ./scripts/kimi-session-manager.sh resume <name>
#   ./scripts/kimi-session-manager.sh archive <name>
#   ./scripts/kimi-session-manager.sh delete <name>
#   ./scripts/kimi-session-manager.sh current
#   ./scripts/kimi-session-manager.sh help
#
# Session metadata is stored as JSON in:
#   .ai/sessions/active/<name>.json   — Active sessions
#   .ai/sessions/archived/<name>.json — Archived sessions
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Load .env.project first (project-specific, highest priority)
if [ -f .env.project ]; then
    set -a; source .env.project; set +a
fi
# Load .env (global fallback)
if [ -f .env ]; then
    set -a; source .env; set +a
fi

# Session storage directories
SESSIONS_DIR=".ai/sessions"
ACTIVE_DIR="${SESSIONS_DIR}/active"
ARCHIVED_DIR="${SESSIONS_DIR}/archived"

# Default agent file for Kimi
AGENT_FILE=".agents/kimi-overseer.yaml"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Sanitize session name: only alphanumeric, hyphens, and underscores allowed
sanitize_name() {
    local name="$1"
    # Replace any character that isn't alphanumeric, hyphen, or underscore
    echo "$name" | sed 's/[^a-zA-Z0-9_-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//'
}

# Get current ISO 8601 timestamp
now_iso() {
    date -u '+%Y-%m-%dT%H:%M:%SZ'
}

# Ensure session directories exist
ensure_dirs() {
    mkdir -p "$ACTIVE_DIR" "$ARCHIVED_DIR"
}

# ---------------------------------------------------------------------------
# JSON helpers — uses jq if available, falls back to python3, then raw echo
# ---------------------------------------------------------------------------

# Check which JSON tool is available (cached for performance)
_json_tool=""
detect_json_tool() {
    if [ -n "$_json_tool" ]; then
        echo "$_json_tool"
        return
    fi
    if command -v jq &>/dev/null; then
        _json_tool="jq"
    elif python3 -c "import json" &>/dev/null; then
        _json_tool="python3"
    else
        _json_tool="raw"
    fi
    echo "$_json_tool"
}

# Write a session metadata JSON file
# Usage: write_session_json <file> <name> <session_id> <sprint> <status> [<notes>]
write_session_json() {
    local file="$1"
    local name="$2"
    local session_id="$3"
    local sprint="$4"
    local status="$5"
    local notes="${6:-}"
    local created_at
    created_at="$(now_iso)"
    local tool
    tool="$(detect_json_tool)"

    case "$tool" in
        jq)
            jq -n \
                --arg name "$name" \
                --arg kimi_session_id "$session_id" \
                --arg created_at "$created_at" \
                --arg sprint "$sprint" \
                --arg agent_file "$AGENT_FILE" \
                --arg status "$status" \
                --arg notes "$notes" \
                '{name: $name, kimi_session_id: $kimi_session_id, created_at: $created_at, sprint: $sprint, agent_file: $agent_file, status: $status, notes: $notes}' \
                > "$file"
            ;;
        python3)
            python3 -c "
import json, sys
data = {
    'name': sys.argv[1],
    'kimi_session_id': sys.argv[2],
    'created_at': sys.argv[3],
    'sprint': sys.argv[4],
    'agent_file': sys.argv[5],
    'status': sys.argv[6],
    'notes': sys.argv[7]
}
print(json.dumps(data, indent=2))
" "$name" "$session_id" "$created_at" "$sprint" "$AGENT_FILE" "$status" "$notes" > "$file"
            ;;
        raw)
            cat > "$file" << RAWEOF
{
  "name": "$name",
  "kimi_session_id": "$session_id",
  "created_at": "$created_at",
  "sprint": "$sprint",
  "agent_file": "$AGENT_FILE",
  "status": "$status",
  "notes": "$notes"
}
RAWEOF
            ;;
    esac
}

# Read a field from a JSON file
# Usage: read_json_field <file> <field>
read_json_field() {
    local file="$1"
    local field="$2"
    local tool
    tool="$(detect_json_tool)"

    if [ ! -f "$file" ]; then
        echo ""
        return
    fi

    case "$tool" in
        jq)
            jq -r ".$field // empty" "$file" 2>/dev/null || echo ""
            ;;
        python3)
            python3 -c "
import json, sys
try:
    data = json.load(open(sys.argv[1]))
    print(data.get(sys.argv[2], ''))
except:
    print('')
" "$file" "$field" 2>/dev/null || echo ""
            ;;
        raw)
            # Basic grep-based extraction for simple JSON
            grep "\"$field\"" "$file" 2>/dev/null | sed 's/.*: *"\(.*\)".*/\1/' | head -1 || echo ""
            ;;
    esac
}

# Add a field to an existing JSON file
# Usage: add_json_field <file> <field> <value>
add_json_field() {
    local file="$1"
    local field="$2"
    local value="$3"
    local tool
    tool="$(detect_json_tool)"

    if [ ! -f "$file" ]; then
        return 1
    fi

    case "$tool" in
        jq)
            local tmp="${file}.tmp"
            jq --arg field "$field" --arg value "$value" '. + {($field): $value}' "$file" > "$tmp" && mv "$tmp" "$file"
            ;;
        python3)
            python3 -c "
import json, sys
data = json.load(open(sys.argv[1]))
data[sys.argv[2]] = sys.argv[3]
with open(sys.argv[1], 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
" "$file" "$field" "$value"
            ;;
        raw)
            # For raw mode, insert before the closing brace
            local tmp="${file}.tmp"
            sed '$d' "$file" > "$tmp"
            echo "  ,\"$field\": \"$value\"" >> "$tmp"
            echo "}" >> "$tmp"
            mv "$tmp" "$file"
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Command: create
# ---------------------------------------------------------------------------

cmd_create() {
    local name=""
    local sprint=""
    local launch=false

    # Parse arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --sprint|-s)
                sprint="$2"
                shift 2
                ;;
            --launch|-l)
                launch=true
                shift
                ;;
            -*)
                error "Unknown option: $1"
                return 1
                ;;
            *)
                name="$1"
                shift
                ;;
        esac
    done

    if [ -z "$name" ]; then
        error "Session name required. Usage: $0 create <name> [--sprint N]"
        return 1
    fi

    # Sanitize the name
    local safe_name
    safe_name="$(sanitize_name "$name")"
    if [ "$safe_name" != "$name" ]; then
        warn "Session name sanitized: '$name' → '$safe_name'"
    fi

    ensure_dirs

    local session_file="${ACTIVE_DIR}/${safe_name}.json"

    # Check if session already exists
    if [ -f "$session_file" ]; then
        warn "Session '$safe_name' already exists — updating metadata"
    fi

    # Use the session name as the Kimi session ID
    # Kimi CLI uses the --session flag with an arbitrary string
    local session_id="$safe_name"
    local notes="Session created"
    [ -n "$sprint" ] && notes="Sprint $sprint session"

    write_session_json "$session_file" "$safe_name" "$session_id" "${sprint:-}" "active" "$notes"

    # Record initial context baseline for context monitoring (Phase 4)
    local context_monitor="${SCRIPT_DIR}/kimi-context-monitor.sh"
    if [ -x "$context_monitor" ]; then
        local initial_size=0
        # Try to read current context file size
        initial_size=$("$context_monitor" check "$safe_name" 2>/dev/null | grep "File size:" | awk '{print $3}' || echo "0")
        initial_size="${initial_size:-0}"
        add_json_field "$session_file" "initial_context_size_bytes" "$initial_size"
    fi

    success "Session '$safe_name' created: $session_file"
    info "Resume with: $0 resume $safe_name"

    # Optionally launch Kimi with this session
    if [ "$launch" = true ]; then
        info "Launching Kimi session..."
        cmd_resume "$safe_name"
    fi
}

# ---------------------------------------------------------------------------
# Command: list
# ---------------------------------------------------------------------------

cmd_list() {
    local show_all=false

    while [ $# -gt 0 ]; do
        case "$1" in
            --all|-a)
                show_all=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done

    ensure_dirs

    echo ""
    echo "========================================="
    echo "  Kimi Sessions"
    echo "========================================="
    echo ""

    # List active sessions
    local active_count=0
    printf "  ${GREEN}Active Sessions:${NC}\n"
    printf "  %-20s %-12s %-24s %s\n" "Name" "Sprint" "Created" "Notes"
    printf "  %-20s %-12s %-24s %s\n" "--------------------" "------------" "------------------------" "-----"

    for session_file in "$ACTIVE_DIR"/*.json; do
        [ -f "$session_file" ] || continue
        local s_name s_sprint s_created s_notes
        s_name="$(read_json_field "$session_file" "name")"
        s_sprint="$(read_json_field "$session_file" "sprint")"
        s_created="$(read_json_field "$session_file" "created_at")"
        s_notes="$(read_json_field "$session_file" "notes")"
        printf "  %-20s %-12s %-24s %s\n" "${s_name:-?}" "${s_sprint:--}" "${s_created:--}" "${s_notes:--}"
        active_count=$((active_count + 1))
    done

    if [ "$active_count" -eq 0 ]; then
        echo "  (none)"
    fi
    echo ""

    # List archived sessions if --all
    if [ "$show_all" = true ]; then
        local archived_count=0
        printf "  ${YELLOW}Archived Sessions:${NC}\n"
        printf "  %-20s %-12s %-24s %-24s %s\n" "Name" "Sprint" "Created" "Archived" "Notes"
        printf "  %-20s %-12s %-24s %-24s %s\n" "--------------------" "------------" "------------------------" "------------------------" "-----"

        for session_file in "$ARCHIVED_DIR"/*.json; do
            [ -f "$session_file" ] || continue
            local s_name s_sprint s_created s_archived s_notes
            s_name="$(read_json_field "$session_file" "name")"
            s_sprint="$(read_json_field "$session_file" "sprint")"
            s_created="$(read_json_field "$session_file" "created_at")"
            s_archived="$(read_json_field "$session_file" "archived_at")"
            s_notes="$(read_json_field "$session_file" "notes")"
            printf "  %-20s %-12s %-24s %-24s %s\n" "${s_name:-?}" "${s_sprint:--}" "${s_created:--}" "${s_archived:--}" "${s_notes:--}"
            archived_count=$((archived_count + 1))
        done

        if [ "$archived_count" -eq 0 ]; then
            echo "  (none)"
        fi
        echo ""
    fi

    echo "  Total active: $active_count"
    echo ""
}

# ---------------------------------------------------------------------------
# Command: resume
# ---------------------------------------------------------------------------

cmd_resume() {
    local name="${1:-}"

    if [ -z "$name" ]; then
        error "Session name required. Usage: $0 resume <name>"
        return 1
    fi

    local safe_name
    safe_name="$(sanitize_name "$name")"

    ensure_dirs

    local session_file="${ACTIVE_DIR}/${safe_name}.json"

    if [ ! -f "$session_file" ]; then
        # Check archived sessions too
        if [ -f "${ARCHIVED_DIR}/${safe_name}.json" ]; then
            error "Session '$safe_name' is archived. Use 'list --all' to see archived sessions."
        else
            error "Session '$safe_name' not found. Use 'list' to see available sessions."
        fi
        return 1
    fi

    local session_id
    session_id="$(read_json_field "$session_file" "kimi_session_id")"

    if [ -z "$session_id" ]; then
        error "Session '$safe_name' has no kimi_session_id in metadata."
        return 1
    fi

    # Check if kimi is available
    if ! command -v kimi &>/dev/null; then
        error "Kimi CLI not found. Install with: pipx install kimi-cli"
        return 1
    fi

    # Build the kimi command
    local agent_arg=""
    if [ -f "$PROJECT_ROOT/$AGENT_FILE" ]; then
        agent_arg="--agent-file $PROJECT_ROOT/$AGENT_FILE"
    fi

    info "Resuming session '$safe_name' (Kimi session: $session_id)"
    info "Command: kimi --session $session_id $agent_arg"

    # Launch Kimi with the session
    exec kimi --session "$session_id" $agent_arg
}

# ---------------------------------------------------------------------------
# Command: archive
# ---------------------------------------------------------------------------

cmd_archive() {
    local name="${1:-}"
    local compact=false

    # Parse arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --compact|-c)
                compact=true
                shift
                ;;
            -*)
                shift
                ;;
            *)
                if [ -z "$name" ]; then
                    name="$1"
                fi
                shift
                ;;
        esac
    done

    if [ -z "$name" ]; then
        error "Session name required. Usage: $0 archive <name> [--compact]"
        return 1
    fi

    local safe_name
    safe_name="$(sanitize_name "$name")"

    ensure_dirs

    local active_file="${ACTIVE_DIR}/${safe_name}.json"
    local archived_file="${ARCHIVED_DIR}/${safe_name}.json"

    if [ ! -f "$active_file" ]; then
        if [ -f "$archived_file" ]; then
            warn "Session '$safe_name' is already archived."
            return 0
        fi
        error "Session '$safe_name' not found in active sessions."
        return 1
    fi

    # Optionally run /compact before archiving
    # Phase 4: Check context health first — only compact if CRITICAL
    if [ "$compact" = true ]; then
        local context_monitor="${SCRIPT_DIR}/kimi-context-monitor.sh"
        local should_compact=true

        if [ -x "$context_monitor" ]; then
            local health_status
            health_status=$("$context_monitor" check "$safe_name" 2>/dev/null | tail -1)
            if [ "$health_status" = "HEALTHY" ]; then
                info "Context is HEALTHY — skipping compaction (not needed)"
                should_compact=false
            elif [ "$health_status" = "WARNING" ]; then
                info "Context is WARNING — compacting as requested"
            else
                info "Context is CRITICAL — compacting"
            fi
        fi

        if [ "$should_compact" = true ]; then
            local session_id
            session_id="$(read_json_field "$active_file" "kimi_session_id")"

            if command -v kimi &>/dev/null && [ -n "$session_id" ]; then
                info "Compacting session context before archive..."
                kimi --session "$session_id" --print -p "/compact" 2>/dev/null || warn "Compaction failed (non-critical)"
                add_json_field "$active_file" "compacted" "true"
            else
                warn "Kimi CLI not available — skipping compaction"
            fi
        fi
    fi

    # Add archive metadata
    add_json_field "$active_file" "archived_at" "$(now_iso)"
    add_json_field "$active_file" "status" "archived"

    # Count completed tasks for the sprint
    local tasks_done=0
    local sprint_num
    sprint_num="$(read_json_field "$active_file" "sprint")"
    if [ -f .ai/status.md ]; then
        tasks_done=$(grep -cE '\|\s*(TASK-|—)\s*\|.*\|\s*DONE' .ai/status.md 2>/dev/null || echo "0")
    fi
    add_json_field "$active_file" "tasks_completed" "$tasks_done"

    # Move to archived directory
    mv "$active_file" "$archived_file"

    success "Session '$safe_name' archived: $archived_file"
    info "Tasks completed in session: $tasks_done"
}

# ---------------------------------------------------------------------------
# Command: delete
# ---------------------------------------------------------------------------

cmd_delete() {
    local name="${1:-}"

    if [ -z "$name" ]; then
        error "Session name required. Usage: $0 delete <name>"
        return 1
    fi

    local safe_name
    safe_name="$(sanitize_name "$name")"

    ensure_dirs

    local active_file="${ACTIVE_DIR}/${safe_name}.json"
    local archived_file="${ARCHIVED_DIR}/${safe_name}.json"
    local deleted=false

    if [ -f "$active_file" ]; then
        local status
        status="$(read_json_field "$active_file" "status")"
        if [ "$status" = "active" ]; then
            warn "Deleting active session '$safe_name'"
        fi
        rm -f "$active_file"
        success "Deleted active session: $safe_name"
        deleted=true
    fi

    if [ -f "$archived_file" ]; then
        rm -f "$archived_file"
        success "Deleted archived session: $safe_name"
        deleted=true
    fi

    if [ "$deleted" = false ]; then
        error "Session '$safe_name' not found."
        return 1
    fi
}

# ---------------------------------------------------------------------------
# Command: current
# ---------------------------------------------------------------------------

cmd_current() {
    ensure_dirs

    # Find the most recently modified .json file in active/
    local latest=""
    local latest_time=0

    for session_file in "$ACTIVE_DIR"/*.json; do
        [ -f "$session_file" ] || continue

        # Get modification time (cross-platform)
        local mtime
        if stat --version &>/dev/null 2>&1; then
            # GNU stat (Linux)
            mtime=$(stat -c %Y "$session_file" 2>/dev/null || echo "0")
        else
            # BSD stat (macOS)
            mtime=$(stat -f %m "$session_file" 2>/dev/null || echo "0")
        fi

        if [ "$mtime" -gt "$latest_time" ]; then
            latest_time="$mtime"
            latest="$session_file"
        fi
    done

    if [ -z "$latest" ]; then
        info "No active sessions."
        return 0
    fi

    local s_name s_sprint s_created s_session_id s_notes
    s_name="$(read_json_field "$latest" "name")"
    s_sprint="$(read_json_field "$latest" "sprint")"
    s_created="$(read_json_field "$latest" "created_at")"
    s_session_id="$(read_json_field "$latest" "kimi_session_id")"
    s_notes="$(read_json_field "$latest" "notes")"

    echo ""
    echo "========================================="
    echo "  Current Kimi Session"
    echo "========================================="
    echo ""
    echo "  Name:       ${s_name:-?}"
    echo "  Sprint:     ${s_sprint:--}"
    echo "  Session ID: ${s_session_id:--}"
    echo "  Created:    ${s_created:--}"
    echo "  Notes:      ${s_notes:--}"
    echo "  File:       $latest"
    # Phase 4: Show context health if monitor is available
    local context_monitor="${SCRIPT_DIR}/kimi-context-monitor.sh"
    if [ -x "$context_monitor" ]; then
        local health_output
        health_output=$("$context_monitor" check "$s_name" 2>/dev/null)
        local health_status
        health_status=$(echo "$health_output" | tail -1)
        local token_line
        token_line=$(echo "$health_output" | grep "Token count:" | awk '{print $3}')
        echo "  Context:"
        echo "    Tokens:   ${token_line:-?}"
        echo "    Health:   ${health_status:-unknown}"
    fi
    echo ""
    echo "  Resume: $0 resume ${s_name}"
    echo ""
}

# ---------------------------------------------------------------------------
# Command: help
# ---------------------------------------------------------------------------

cmd_help() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create <name> [--sprint N] [--launch]"
    echo "      Create a new session. Optionally tie to a sprint number."
    echo "      --launch: Also start Kimi with this session immediately."
    echo ""
    echo "  list [--all]"
    echo "      List active sessions. Use --all to include archived."
    echo ""
    echo "  resume <name>"
    echo "      Resume a session by launching Kimi with --session <id>."
    echo ""
    echo "  archive <name> [--compact]"
    echo "      Archive a session. Moves metadata from active/ to archived/."
    echo "      --compact: Run /compact before archiving to compress context."
    echo ""
    echo "  delete <name>"
    echo "      Delete a session's metadata (active or archived)."
    echo ""
    echo "  current"
    echo "      Show the most recently active session."
    echo ""
    echo "  help"
    echo "      Show this help message."
    echo ""
    echo "Session Storage:"
    echo "  Active:   .ai/sessions/active/<name>.json"
    echo "  Archived: .ai/sessions/archived/<name>.json"
    echo ""
    echo "Examples:"
    echo "  $0 create sprint-3 --sprint 3"
    echo "  $0 resume sprint-3"
    echo "  $0 archive sprint-3 --compact"
    echo "  $0 list --all"
    echo ""
}

# ---------------------------------------------------------------------------
# Main — route to subcommand
# ---------------------------------------------------------------------------

main() {
    local command="${1:-help}"
    shift 2>/dev/null || true

    case "$command" in
        create)   cmd_create "$@" ;;
        list)     cmd_list "$@" ;;
        resume)   cmd_resume "$@" ;;
        archive)  cmd_archive "$@" ;;
        delete)   cmd_delete "$@" ;;
        current)  cmd_current "$@" ;;
        help|--help|-h)
            cmd_help
            ;;
        *)
            error "Unknown command: $command"
            echo "Use '$0 help' for usage information."
            exit 1
            ;;
    esac
}

main "$@"

