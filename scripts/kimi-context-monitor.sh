#!/usr/bin/env bash
# =============================================================================
# Open Artel — Kimi Context Monitor
# =============================================================================
#
# Monitors and manages Kimi session context health using real, measurable
# metrics: token counts from context.jsonl, file sizes, session age, and
# file operations.
#
# Usage:
#   ./scripts/kimi-context-monitor.sh check [session-name]
#   ./scripts/kimi-context-monitor.sh auto-compact [session-name]
#   ./scripts/kimi-context-monitor.sh report
#   ./scripts/kimi-context-monitor.sh history [--limit N]
#   ./scripts/kimi-context-monitor.sh thresholds [--edit]
#   ./scripts/kimi-context-monitor.sh --help
#
# Context data is read from:
#   ~/.kimi/sessions/<workspace-hash>/<session-uuid>/context.jsonl
#
# Metrics are stored in:
#   .ai/metrics/thresholds.json       — Configurable thresholds
#   .ai/metrics/context-history.json  — Append-only measurement log
#
# =============================================================================

set -uo pipefail

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

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

METRICS_DIR=".ai/metrics"
THRESHOLDS_FILE="${METRICS_DIR}/thresholds.json"
HISTORY_FILE="${METRICS_DIR}/context-history.json"
SESSION_MGR="./scripts/kimi-session-manager.sh"
KIMI_DIR="${HOME}/.kimi"
KIMI_SESSIONS_DIR="${KIMI_DIR}/sessions"

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
# JSON helpers — jq -> python3 -> raw shell fallback chain (Phase 2 pattern)
# ---------------------------------------------------------------------------

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

# Read a field from a JSON file
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
            grep "\"$field\"" "$file" 2>/dev/null | awk -F'"' '{for(i=1;i<=NF;i++){if($i==": "){print $(i+1)}}}' | head -1 || echo ""
            ;;
    esac
}

# Read a numeric field from thresholds (with default)
read_threshold() {
    local field="$1"
    local default_val="$2"
    local tool
    tool="$(detect_json_tool)"

    if [ ! -f "$THRESHOLDS_FILE" ]; then
        echo "$default_val"
        return
    fi

    local val=""
    case "$tool" in
        jq)
            val=$(jq -r ".$field // empty" "$THRESHOLDS_FILE" 2>/dev/null)
            ;;
        python3)
            val=$(python3 -c "
import json, sys
try:
    data = json.load(open(sys.argv[1]))
    v = data.get(sys.argv[2])
    if v is not None: print(v)
except: pass
" "$THRESHOLDS_FILE" "$field" 2>/dev/null)
            ;;
        raw)
            val=$(grep "\"$field\"" "$THRESHOLDS_FILE" 2>/dev/null | awk -F: '{print $2}' | tr -d ' ,\n' || true)
            ;;
    esac

    if [ -n "$val" ] && [ "$val" != "null" ]; then
        echo "$val"
    else
        echo "$default_val"
    fi
}

# Append a measurement to context-history.json
append_to_history() {
    local measurement="$1"
    local tool
    tool="$(detect_json_tool)"

    mkdir -p "$METRICS_DIR"

    # Ensure history file exists and is valid
    if [ ! -f "$HISTORY_FILE" ] || [ ! -s "$HISTORY_FILE" ]; then
        echo "[]" > "$HISTORY_FILE"
    fi

    case "$tool" in
        jq)
            local tmp="${HISTORY_FILE}.tmp"
            echo "$measurement" | jq -s '.[0]' > /dev/null 2>&1 || { warn "Invalid measurement JSON"; return 1; }
            jq --argjson new "$measurement" '. + [$new]' "$HISTORY_FILE" > "$tmp" 2>/dev/null && mv "$tmp" "$HISTORY_FILE"
            ;;
        python3)
            python3 -c "
import json, sys
try:
    with open(sys.argv[1], 'r') as f:
        history = json.load(f)
except:
    history = []
try:
    measurement = json.loads(sys.argv[2])
    history.append(measurement)
    with open(sys.argv[1], 'w') as f:
        json.dump(history, f, indent=2)
        f.write('\n')
except Exception as e:
    print(f'Error appending: {e}', file=sys.stderr)
" "$HISTORY_FILE" "$measurement"
            ;;
        raw)
            # Simple append for raw mode — less safe but functional
            local tmp="${HISTORY_FILE}.tmp"
            if [ "$(wc -c < "$HISTORY_FILE" | tr -d ' ')" -le 3 ]; then
                echo "[$measurement]" > "$HISTORY_FILE"
            else
                # Remove trailing ] and newline, append new entry
                python3 -c "pass" 2>/dev/null && {
                    # Fallback to python3 even in raw mode for safe append
                    python3 -c "
import json
with open('$HISTORY_FILE', 'r') as f:
    h = json.load(f)
h.append(json.loads('$measurement'))
with open('$HISTORY_FILE', 'w') as f:
    json.dump(h, f, indent=2)
    f.write('\n')
"
                } || {
                    # Truly raw: just rewrite
                    echo "[$measurement]" > "$HISTORY_FILE"
                }
            fi
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Workspace hash and session resolution
# ---------------------------------------------------------------------------

# Get the workspace hash used by Kimi to store sessions
get_workspace_hash() {
    # Method 1: Look in kimi.json for our project path
    local kimi_json="${KIMI_DIR}/kimi.json"
    if [ -f "$kimi_json" ]; then
        local tool
        tool="$(detect_json_tool)"
        case "$tool" in
            jq)
                local hash_dir
                hash_dir=$(jq -r --arg path "$PROJECT_ROOT" '.work_dirs[] | select(.path == $path)' "$kimi_json" 2>/dev/null | head -1)
                ;;
        esac
    fi

    # Method 2: Find the workspace hash directory (most reliable)
    if [ -d "$KIMI_SESSIONS_DIR" ]; then
        # There's typically one hash directory per workspace
        local hash_dir
        hash_dir=$(ls -1 "$KIMI_SESSIONS_DIR" 2>/dev/null | head -1)
        if [ -n "$hash_dir" ]; then
            echo "$hash_dir"
            return
        fi
    fi

    # Method 3: Compute MD5 of project path
    if command -v md5 &>/dev/null; then
        echo -n "$PROJECT_ROOT" | md5
    elif command -v md5sum &>/dev/null; then
        echo -n "$PROJECT_ROOT" | md5sum | awk '{print $1}'
    else
        echo ""
    fi
}

# Get the last session ID from kimi.json
get_last_session_id() {
    local kimi_json="${KIMI_DIR}/kimi.json"
    if [ ! -f "$kimi_json" ]; then
        echo ""
        return
    fi

    local tool
    tool="$(detect_json_tool)"
    case "$tool" in
        jq)
            jq -r --arg path "$PROJECT_ROOT" '(.work_dirs[] | select(.path == $path) | .last_session_id) // empty' "$kimi_json" 2>/dev/null || echo ""
            ;;
        python3)
            python3 -c "
import json, sys
try:
    data = json.load(open(sys.argv[1]))
    for wd in data.get('work_dirs', []):
        if wd.get('path') == sys.argv[2]:
            print(wd.get('last_session_id', ''))
            break
except:
    print('')
" "$kimi_json" "$PROJECT_ROOT" 2>/dev/null || echo ""
            ;;
        raw)
            grep "last_session_id" "$kimi_json" 2>/dev/null | awk -F'"' '{print $4}' | head -1 || echo ""
            ;;
    esac
}

# Find the context.jsonl file for a session
# Tries: last_session_id from kimi.json, then most recently modified session
find_context_file() {
    local workspace_hash
    workspace_hash="$(get_workspace_hash)"

    if [ -z "$workspace_hash" ]; then
        echo ""
        return
    fi

    local sessions_path="${KIMI_SESSIONS_DIR}/${workspace_hash}"
    if [ ! -d "$sessions_path" ]; then
        echo ""
        return
    fi

    # Try last_session_id first
    local last_id
    last_id="$(get_last_session_id)"
    if [ -n "$last_id" ] && [ -f "${sessions_path}/${last_id}/context.jsonl" ]; then
        echo "${sessions_path}/${last_id}/context.jsonl"
        return
    fi

    # Fallback: find the most recently modified context.jsonl
    local latest=""
    local latest_time=0
    for ctx in "${sessions_path}"/*/context.jsonl; do
        [ -f "$ctx" ] || continue
        local mtime
        if stat --version &>/dev/null 2>&1; then
            mtime=$(stat -c %Y "$ctx" 2>/dev/null || echo "0")
        else
            mtime=$(stat -f %m "$ctx" 2>/dev/null || echo "0")
        fi
        if [ "$mtime" -gt "$latest_time" ]; then
            latest_time="$mtime"
            latest="$ctx"
        fi
    done

    echo "$latest"
}

# ---------------------------------------------------------------------------
# Metric extraction from context.jsonl
# ---------------------------------------------------------------------------

# Extract the latest token_count from _usage entries in context.jsonl
get_token_count() {
    local context_file="$1"

    if [ ! -f "$context_file" ] || [ ! -s "$context_file" ]; then
        echo "0"
        return
    fi

    local tool
    tool="$(detect_json_tool)"

    case "$tool" in
        jq)
            # Get the last _usage entry's token_count
            grep "_usage" "$context_file" 2>/dev/null | tail -1 | jq -r '.token_count // 0' 2>/dev/null || echo "0"
            ;;
        python3)
            python3 -c "
import json, sys
token_count = 0
try:
    with open(sys.argv[1], 'r') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                data = json.loads(line)
                if data.get('role') == '_usage' and 'token_count' in data:
                    token_count = data['token_count']
            except: pass
except: pass
print(token_count)
" "$context_file" 2>/dev/null || echo "0"
            ;;
        raw)
            # Grep for the last _usage line and extract token_count
            grep "_usage" "$context_file" 2>/dev/null | tail -1 | grep -o '"token_count": *[0-9]*' | awk -F: '{print $2}' | tr -d ' ' || echo "0"
            ;;
    esac
}

# Get file size in bytes
get_file_size() {
    local file="$1"
    if [ ! -f "$file" ]; then
        echo "0"
        return
    fi
    wc -c < "$file" | tr -d ' '
}

# Count file operations (files modified in .ai/ since a given timestamp)
count_file_operations() {
    local since_timestamp="$1"

    if [ -z "$since_timestamp" ] || [ "$since_timestamp" = "" ]; then
        echo "0"
        return
    fi

    # Convert ISO timestamp to a date format find understands
    local count=0
    if command -v gfind &>/dev/null; then
        count=$(gfind .ai/ -type f -newermt "$since_timestamp" 2>/dev/null | wc -l | tr -d ' ')
    elif find .ai/ -type f -newermt "$since_timestamp" &>/dev/null 2>&1; then
        count=$(find .ai/ -type f -newermt "$since_timestamp" 2>/dev/null | wc -l | tr -d ' ')
    else
        # macOS find doesn't support -newermt; use perl or python
        if python3 -c "pass" &>/dev/null; then
            count=$(python3 -c "
import os, sys
from datetime import datetime
try:
    ts_str = sys.argv[1].replace('Z', '+00:00')
    ts = datetime.fromisoformat(ts_str).timestamp()
    count = 0
    for root, dirs, files in os.walk('.ai/'):
        for f in files:
            path = os.path.join(root, f)
            try:
                if os.path.getmtime(path) > ts:
                    count += 1
            except: pass
    print(count)
except:
    print(0)
" "$since_timestamp" 2>/dev/null)
        else
            count=0
        fi
    fi

    echo "${count:-0}"
}

# Calculate session age in hours from created_at timestamp
get_session_age_hours() {
    local created_at="$1"

    if [ -z "$created_at" ] || [ "$created_at" = "" ]; then
        echo "0"
        return
    fi

    if python3 -c "pass" &>/dev/null; then
        python3 -c "
from datetime import datetime, timezone
import sys
try:
    ts_str = sys.argv[1].replace('Z', '+00:00')
    created = datetime.fromisoformat(ts_str)
    now = datetime.now(timezone.utc)
    hours = (now - created).total_seconds() / 3600
    print(f'{hours:.1f}')
except:
    print('0')
" "$created_at" 2>/dev/null || echo "0"
    else
        # Rough calculation using date command
        local now_epoch
        now_epoch=$(date +%s)
        local created_epoch
        created_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$created_at" "+%s" 2>/dev/null || echo "$now_epoch")
        local diff=$(( (now_epoch - created_epoch) / 3600 ))
        echo "$diff"
    fi
}

# ---------------------------------------------------------------------------
# Command: check
# ---------------------------------------------------------------------------

cmd_check() {
    local session_name="${1:-}"

    # Resolve session
    local created_at=""
    if [ -n "$session_name" ]; then
        local session_file=".ai/sessions/active/${session_name}.json"
        if [ -f "$session_file" ]; then
            created_at="$(read_json_field "$session_file" "created_at")"
        fi
    else
        # Find the current active session
        for sf in .ai/sessions/active/*.json; do
            [ -f "$sf" ] || continue
            session_name="$(basename "$sf" .json)"
            created_at="$(read_json_field "$sf" "created_at")"
            break
        done
    fi

    # Find context.jsonl
    local context_file
    context_file="$(find_context_file)"

    if [ -z "$context_file" ] || [ ! -f "$context_file" ]; then
        warn "No context.jsonl found for this workspace."
        echo "UNKNOWN"
        return 1
    fi

    # Collect metrics
    local token_count file_size session_age file_ops
    token_count="$(get_token_count "$context_file")"
    file_size="$(get_file_size "$context_file")"
    session_age="$(get_session_age_hours "$created_at")"
    file_ops="$(count_file_operations "$created_at")"

    # Ensure numeric values
    token_count="${token_count:-0}"
    file_size="${file_size:-0}"
    session_age="${session_age:-0}"
    file_ops="${file_ops:-0}"

    # Read thresholds (with defaults)
    local warn_tokens compact_tokens
    local warn_size compact_size
    local warn_age compact_age
    local warn_ops compact_ops

    warn_tokens="$(read_threshold "warn_token_count" 50000)"
    compact_tokens="$(read_threshold "compact_token_count" 100000)"
    warn_size="$(read_threshold "warn_context_size_bytes" 50000)"
    compact_size="$(read_threshold "compact_context_size_bytes" 100000)"
    warn_age="$(read_threshold "warn_session_age_hours" 4)"
    compact_age="$(read_threshold "compact_session_age_hours" 8)"
    warn_ops="$(read_threshold "warn_file_operations" 50)"
    compact_ops="$(read_threshold "compact_file_operations" 100)"

    # Determine status
    local status="HEALTHY"
    local reasons=""

    # Integer comparison for token count
    local tc_int=${token_count%%.*}
    if [ "$tc_int" -ge "$compact_tokens" ] 2>/dev/null; then
        status="CRITICAL"
        reasons="${reasons} tokens(${token_count}>=${compact_tokens})"
    elif [ "$tc_int" -ge "$warn_tokens" ] 2>/dev/null; then
        [ "$status" != "CRITICAL" ] && status="WARNING"
        reasons="${reasons} tokens(${token_count}>=${warn_tokens})"
    fi

    # File size check
    if [ "$file_size" -ge "$compact_size" ] 2>/dev/null; then
        status="CRITICAL"
        reasons="${reasons} size(${file_size}b>=${compact_size}b)"
    elif [ "$file_size" -ge "$warn_size" ] 2>/dev/null; then
        [ "$status" != "CRITICAL" ] && status="WARNING"
        reasons="${reasons} size(${file_size}b>=${warn_size}b)"
    fi

    # Session age check (compare as integers — truncate decimals)
    local age_int=${session_age%%.*}
    if [ "$age_int" -ge "$compact_age" ] 2>/dev/null; then
        status="CRITICAL"
        reasons="${reasons} age(${session_age}h>=${compact_age}h)"
    elif [ "$age_int" -ge "$warn_age" ] 2>/dev/null; then
        [ "$status" != "CRITICAL" ] && status="WARNING"
        reasons="${reasons} age(${session_age}h>=${warn_age}h)"
    fi

    # File operations check
    if [ "$file_ops" -ge "$compact_ops" ] 2>/dev/null; then
        status="CRITICAL"
        reasons="${reasons} ops(${file_ops}>=${compact_ops})"
    elif [ "$file_ops" -ge "$warn_ops" ] 2>/dev/null; then
        [ "$status" != "CRITICAL" ] && status="WARNING"
        reasons="${reasons} ops(${file_ops}>=${warn_ops})"
    fi

    # Output
    local status_color="$GREEN"
    [ "$status" = "WARNING" ] && status_color="$YELLOW"
    [ "$status" = "CRITICAL" ] && status_color="$RED"

    echo ""
    echo "========================================="
    echo "  Context Health Check"
    echo "========================================="
    echo ""
    [ -n "$session_name" ] && echo "  Session:        ${session_name}"
    echo "  Context file:   ${context_file}"
    echo ""
    echo "  Token count:    ${token_count}"
    echo "  File size:      ${file_size} bytes"
    echo "  Session age:    ${session_age} hours"
    echo "  File operations: ${file_ops}"
    echo ""
    echo -e "  Status:         ${status_color}${status}${NC}"
    [ -n "$reasons" ] && echo "  Reasons:       ${reasons}"
    echo ""

    # Append measurement to history
    local now_iso
    now_iso="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    local measurement
    measurement="{\"timestamp\":\"${now_iso}\",\"session\":\"${session_name:-unknown}\",\"token_count\":${tc_int},\"file_size_bytes\":${file_size},\"session_age_hours\":${age_int},\"file_operations\":${file_ops},\"status\":\"${status}\"}"

    append_to_history "$measurement"

    # Output the status string for scripts to capture
    echo "$status"
}

# ---------------------------------------------------------------------------
# Command: auto-compact
# ---------------------------------------------------------------------------

cmd_auto_compact() {
    local session_name="${1:-}"

    info "Running context health check..."
    local check_output
    check_output="$(cmd_check "$session_name" 2>&1)"
    local check_exit=$?

    # Extract status from the last line of check output
    local status
    status="$(echo "$check_output" | tail -1)"

    # Print the check output (minus the bare status line)
    echo "$check_output" | head -n -1

    if [ "$status" = "CRITICAL" ]; then
        warn "Context is CRITICAL — triggering compaction..."

        # Find the session name to archive
        if [ -z "$session_name" ]; then
            for sf in .ai/sessions/active/*.json; do
                [ -f "$sf" ] || continue
                session_name="$(basename "$sf" .json)"
                break
            done
        fi

        if [ -z "$session_name" ]; then
            error "No active session to compact."
            return 1
        fi

        if [ -x "$SESSION_MGR" ]; then
            info "Archiving session '$session_name' with compaction..."
            "$SESSION_MGR" archive "$session_name" --compact 2>&1 || {
                error "Compaction failed for session '$session_name'"
                return 1
            }
            success "Session '$session_name' compacted and archived."

            # Log compaction event
            local now_iso
            now_iso="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
            local event="{\"timestamp\":\"${now_iso}\",\"session\":\"${session_name}\",\"event\":\"auto-compact\",\"status\":\"CRITICAL\"}"
            append_to_history "$event"
        else
            error "Session manager not found: $SESSION_MGR"
            return 1
        fi
    elif [ "$status" = "WARNING" ]; then
        info "Context is WARNING — no action taken (below compact threshold)."
    else
        success "Context is HEALTHY — no action needed."
    fi
}

# ---------------------------------------------------------------------------
# Command: report
# ---------------------------------------------------------------------------

cmd_report() {
    if [ ! -f "$HISTORY_FILE" ] || [ ! -s "$HISTORY_FILE" ]; then
        info "No context history available yet."
        info "Run 'check' to start collecting measurements."
        return 0
    fi

    local tool
    tool="$(detect_json_tool)"

    echo ""
    echo "========================================="
    echo "  Context Metrics Report"
    echo "========================================="
    echo ""

    case "$tool" in
        jq)
            local total avg_tokens avg_size critical_count avg_age
            total=$(jq 'length' "$HISTORY_FILE" 2>/dev/null || echo "0")
            avg_tokens=$(jq '[.[] | select(.token_count != null) | .token_count] | if length > 0 then (add / length | floor) else 0 end' "$HISTORY_FILE" 2>/dev/null || echo "0")
            avg_size=$(jq '[.[] | select(.file_size_bytes != null) | .file_size_bytes] | if length > 0 then (add / length | floor) else 0 end' "$HISTORY_FILE" 2>/dev/null || echo "0")
            critical_count=$(jq '[.[] | select(.status == "CRITICAL")] | length' "$HISTORY_FILE" 2>/dev/null || echo "0")
            avg_age=$(jq '[.[] | select(.session_age_hours != null) | .session_age_hours] | if length > 0 then (add / length | floor) else 0 end' "$HISTORY_FILE" 2>/dev/null || echo "0")

            echo "  Total measurements:      $total"
            echo "  Average token count:     $avg_tokens"
            echo "  Average file size:       $avg_size bytes"
            echo "  Average session age:     ${avg_age}h"
            echo "  CRITICAL events:         $critical_count"
            echo "  Compact frequency:       ${critical_count}/${total} checks"
            echo ""
            ;;
        python3)
            python3 -c "
import json, sys
try:
    with open(sys.argv[1]) as f:
        history = json.load(f)
except:
    history = []

total = len(history)
tokens = [h['token_count'] for h in history if 'token_count' in h]
sizes = [h['file_size_bytes'] for h in history if 'file_size_bytes' in h]
ages = [h['session_age_hours'] for h in history if 'session_age_hours' in h]
critical = sum(1 for h in history if h.get('status') == 'CRITICAL')

avg_t = int(sum(tokens) / len(tokens)) if tokens else 0
avg_s = int(sum(sizes) / len(sizes)) if sizes else 0
avg_a = int(sum(ages) / len(ages)) if ages else 0

print(f'  Total measurements:      {total}')
print(f'  Average token count:     {avg_t}')
print(f'  Average file size:       {avg_s} bytes')
print(f'  Average session age:     {avg_a}h')
print(f'  CRITICAL events:         {critical}')
print(f'  Compact frequency:       {critical}/{total} checks')
print()
" "$HISTORY_FILE" 2>/dev/null || info "Could not parse history file."
            ;;
        raw)
            local total
            total=$(grep -c "timestamp" "$HISTORY_FILE" 2>/dev/null || echo "0")
            echo "  Total measurements: $total"
            echo "  (Install jq or python3 for detailed report)"
            echo ""
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Command: history
# ---------------------------------------------------------------------------

cmd_history() {
    local limit=10

    while [ $# -gt 0 ]; do
        case "$1" in
            --limit|-l)
                limit="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done

    if [ ! -f "$HISTORY_FILE" ] || [ ! -s "$HISTORY_FILE" ]; then
        info "No context history available yet."
        return 0
    fi

    echo ""
    echo "========================================="
    echo "  Context Measurement History (last $limit)"
    echo "========================================="
    echo ""

    local tool
    tool="$(detect_json_tool)"

    case "$tool" in
        jq)
            jq -r ".[-${limit}:] | .[] | \"  \\(.timestamp)  tokens=\\(.token_count // \"?\")  size=\\(.file_size_bytes // \"?\")b  age=\\(.session_age_hours // \"?\")h  status=\\(.status // \"?\")\"" "$HISTORY_FILE" 2>/dev/null
            ;;
        python3)
            python3 -c "
import json, sys
try:
    with open(sys.argv[1]) as f:
        history = json.load(f)
except:
    history = []

limit = int(sys.argv[2])
for h in history[-limit:]:
    ts = h.get('timestamp', '?')
    tc = h.get('token_count', '?')
    sz = h.get('file_size_bytes', '?')
    age = h.get('session_age_hours', '?')
    st = h.get('status', '?')
    ev = h.get('event', '')
    if ev:
        print(f'  {ts}  event={ev}  session={h.get(\"session\",\"?\")}')
    else:
        print(f'  {ts}  tokens={tc}  size={sz}b  age={age}h  status={st}')
" "$HISTORY_FILE" "$limit" 2>/dev/null
            ;;
        raw)
            tail -"$limit" "$HISTORY_FILE" 2>/dev/null
            ;;
    esac

    echo ""
}

# ---------------------------------------------------------------------------
# Command: thresholds
# ---------------------------------------------------------------------------

cmd_thresholds() {
    local edit=false

    while [ $# -gt 0 ]; do
        case "$1" in
            --edit|-e)
                edit=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done

    if [ "$edit" = true ]; then
        local editor="${EDITOR:-vi}"
        if [ -f "$THRESHOLDS_FILE" ]; then
            info "Opening $THRESHOLDS_FILE in $editor..."
            "$editor" "$THRESHOLDS_FILE"
        else
            error "Thresholds file not found: $THRESHOLDS_FILE"
            return 1
        fi
        return 0
    fi

    echo ""
    echo "========================================="
    echo "  Context Thresholds"
    echo "========================================="
    echo ""

    if [ ! -f "$THRESHOLDS_FILE" ]; then
        warn "Thresholds file not found: $THRESHOLDS_FILE"
        info "Using defaults."
        echo ""
        printf "  %-30s %-10s %-10s\n" "Metric" "Warn" "Compact"
        printf "  %-30s %-10s %-10s\n" "------------------------------" "----------" "----------"
        printf "  %-30s %-10s %-10s\n" "Token count" "50000" "100000"
        printf "  %-30s %-10s %-10s\n" "Context file size (bytes)" "50000" "100000"
        printf "  %-30s %-10s %-10s\n" "Session age (hours)" "4" "8"
        printf "  %-30s %-10s %-10s\n" "File operations" "50" "100"
        echo ""
        return 0
    fi

    local wt ct ws cs wa ca wo co
    wt="$(read_threshold "warn_token_count" 50000)"
    ct="$(read_threshold "compact_token_count" 100000)"
    ws="$(read_threshold "warn_context_size_bytes" 50000)"
    cs="$(read_threshold "compact_context_size_bytes" 100000)"
    wa="$(read_threshold "warn_session_age_hours" 4)"
    ca="$(read_threshold "compact_session_age_hours" 8)"
    wo="$(read_threshold "warn_file_operations" 50)"
    co="$(read_threshold "compact_file_operations" 100)"

    printf "  %-30s %-10s %-10s\n" "Metric" "Warn" "Compact"
    printf "  %-30s %-10s %-10s\n" "------------------------------" "----------" "----------"
    printf "  %-30s %-10s %-10s\n" "Token count" "$wt" "$ct"
    printf "  %-30s %-10s %-10s\n" "Context file size (bytes)" "$ws" "$cs"
    printf "  %-30s %-10s %-10s\n" "Session age (hours)" "$wa" "$ca"
    printf "  %-30s %-10s %-10s\n" "File operations" "$wo" "$co"
    echo ""
    echo "  File: $THRESHOLDS_FILE"
    echo "  Edit: $0 thresholds --edit"
    echo ""
}

# ---------------------------------------------------------------------------
# Command: help
# ---------------------------------------------------------------------------

cmd_help() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  check [session-name]"
    echo "      Check context health for a session (or current active session)."
    echo "      Outputs HEALTHY, WARNING, or CRITICAL with details."
    echo "      Appends measurement to .ai/metrics/context-history.json."
    echo ""
    echo "  auto-compact [session-name]"
    echo "      Run check and auto-compact if status is CRITICAL."
    echo "      Archives the session via kimi-session-manager.sh with --compact."
    echo ""
    echo "  report"
    echo "      Generate a summary report from context measurement history."
    echo "      Shows averages, trends, and compact frequency."
    echo ""
    echo "  history [--limit N]"
    echo "      Show recent context measurements (default: last 10)."
    echo ""
    echo "  thresholds [--edit]"
    echo "      Show current thresholds. Use --edit to open in editor."
    echo ""
    echo "  --help, -h"
    echo "      Show this help message."
    echo ""
    echo "Metrics measured:"
    echo "  - Token count (from context.jsonl _usage entries)"
    echo "  - Context file size (bytes)"
    echo "  - Session age (hours since creation)"
    echo "  - File operations (files modified in .ai/ since session start)"
    echo ""
    echo "Health statuses:"
    echo "  HEALTHY  — All metrics below warn thresholds"
    echo "  WARNING  — Any metric above warn but below compact threshold"
    echo "  CRITICAL — Any metric above compact threshold"
    echo ""
    echo "Files:"
    echo "  Thresholds: .ai/metrics/thresholds.json"
    echo "  History:    .ai/metrics/context-history.json"
    echo ""
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
    local command="${1:-}"
    shift 2>/dev/null || true

    case "$command" in
        check)          cmd_check "$@" ;;
        auto-compact)   cmd_auto_compact "$@" ;;
        report)         cmd_report "$@" ;;
        history)        cmd_history "$@" ;;
        thresholds)     cmd_thresholds "$@" ;;
        --help|-h|help) cmd_help ;;
        "")             cmd_help ;;
        *)
            error "Unknown command: $command"
            echo "Use '$0 --help' for usage information."
            exit 1
            ;;
    esac
}

main "$@"

