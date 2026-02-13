#!/usr/bin/env python3
"""
=============================================================================
Open Artel — Wire Mode Coordination Daemon
=============================================================================

Persistent coordination daemon that bridges Git events with Kimi Code CLI
via Wire Mode (JSON-RPC 2.0 over stdin/stdout).

Architecture:
    Git Event → Daemon → JSON-RPC prompt → Kimi Wire Mode
                    ← JSON-RPC events ←
                    ← Approval requests ←
    Daemon → Handle approvals → Continue workflow

Usage:
    python scripts/wire-daemon.py                  # Start daemon
    python scripts/wire-daemon.py --status         # Check daemon status
    python scripts/wire-daemon.py --stop           # Stop daemon
    python scripts/wire-daemon.py --dry-run        # Start without Kimi
    python scripts/wire-daemon.py --help           # Show help

Requires:
    - Python 3.9+
    - Kimi Code CLI (kimi --wire)
    - Git repository

=============================================================================
"""

import argparse
import json
import logging
import os
import re
import signal
import subprocess
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Project root (parent of scripts/)
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent

# Daemon configuration
PID_FILE = PROJECT_ROOT / ".git" / "wire-daemon.pid"
LOG_FILE = PROJECT_ROOT / ".git" / "hooks" / "wire-daemon.log"
ENV_PROJECT_FILE = PROJECT_ROOT / ".env.project"
ENV_FILE = PROJECT_ROOT / ".env"

# Metrics configuration
METRICS_DIR = PROJECT_ROOT / ".ai" / "metrics"
WIRE_METRICS_FILE = METRICS_DIR / "wire-metrics.json"

# Wire protocol version
WIRE_PROTOCOL_VERSION = "1.3"

# Git watch interval (seconds)
GIT_WATCH_INTERVAL = 2

# Commit message routing pattern
ROUTING_PATTERN = re.compile(
    r"\[AGENT:(\w+)\]\s*\[ACTION:(\w+)\]\s*\[TASK:([\w-]+)\]"
)

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configure logging to both file and console."""
    logger = logging.getLogger("wire-daemon")
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)

    # Console handler
    console = logging.StreamHandler()
    console.setLevel(logging.DEBUG if verbose else logging.INFO)
    console.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S"
    ))
    logger.addHandler(console)

    # File handler
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    file_handler = logging.FileHandler(str(LOG_FILE))
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    ))
    logger.addHandler(file_handler)

    return logger


# ---------------------------------------------------------------------------
# Environment loading
# ---------------------------------------------------------------------------

def load_env() -> dict[str, str]:
    """Load environment variables from .env.project (priority) then .env (fallback)."""
    env_vars = {}
    # Load .env first (lower priority — values can be overridden)
    if ENV_FILE.exists():
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    env_vars[key.strip()] = value.strip()
    # Load .env.project second (higher priority — overrides .env values)
    if ENV_PROJECT_FILE.exists():
        with open(ENV_PROJECT_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    env_vars[key.strip()] = value.strip()
    return env_vars


# ---------------------------------------------------------------------------
# JSON-RPC 2.0 Client
# ---------------------------------------------------------------------------

class JsonRpcClient:
    """
    JSON-RPC 2.0 client for communicating with Kimi Wire Mode.

    Kimi Wire Mode exposes a bidirectional JSON-RPC protocol over
    stdin/stdout. The client sends requests (initialize, prompt, cancel)
    and receives events (TurnBegin, TurnEnd, ToolCall, ApprovalRequest).
    """

    def __init__(self, logger: logging.Logger, dry_run: bool = False):
        self.logger = logger
        self.dry_run = dry_run
        self.process: Optional[subprocess.Popen] = None
        self.request_id = 0
        self._lock = threading.Lock()
        self._running = False
        self._reader_thread: Optional[threading.Thread] = None
        self._event_handlers: dict[str, list] = {}
        self._pending_requests: dict[str, threading.Event] = {}
        self._responses: dict[str, Any] = {}

    def start(self, work_dir: str = ".") -> bool:
        """Start the Kimi Wire Mode subprocess."""
        if self.dry_run:
            self.logger.info("DRY RUN — Kimi Wire Mode not started")
            self._running = True
            return True

        try:
            # Load environment
            env = os.environ.copy()
            env_vars = load_env()
            env.update(env_vars)

            # Start kimi --wire subprocess with agent file for full context
            agent_file = PROJECT_ROOT / ".agents" / "kimi-overseer.yaml"
            cmd = ["kimi", "--wire", "--work-dir", work_dir]
            if agent_file.exists():
                cmd.extend(["--agent-file", str(agent_file)])
            self.logger.info(f"Starting Kimi Wire Mode: {' '.join(cmd)}")

            self.process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                cwd=work_dir,
                text=True,
                bufsize=1  # Line-buffered
            )

            self._running = True

            # Start reader thread to process incoming messages
            self._reader_thread = threading.Thread(
                target=self._read_loop,
                daemon=True,
                name="wire-reader"
            )
            self._reader_thread.start()

            # Initialize the Wire protocol
            return self._initialize()

        except FileNotFoundError:
            self.logger.error("Kimi CLI not found. Install with: pipx install kimi-cli")
            return False
        except Exception as e:
            self.logger.error(f"Failed to start Kimi Wire Mode: {e}")
            return False

    def stop(self):
        """Stop the Kimi Wire Mode subprocess."""
        self._running = False
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
            self.logger.info("Kimi Wire Mode stopped")

    def _initialize(self) -> bool:
        """Send the initialize handshake to Kimi."""
        response = self.send_request("initialize", {
            "protocol_version": WIRE_PROTOCOL_VERSION,
            "client_info": {
                "name": "open-artel-wire-daemon",
                "version": "1.0.0"
            }
        })

        if response and not response.get("error"):
            self.logger.info("Wire protocol initialized successfully")
            return True
        else:
            error = response.get("error", {}) if response else {}
            self.logger.error(f"Wire protocol initialization failed: {error}")
            return False

    def send_request(self, method: str, params: dict = None) -> Optional[dict]:
        """
        Send a JSON-RPC request and wait for the response.

        Args:
            method: The JSON-RPC method name (e.g., 'initialize', 'prompt')
            params: Optional parameters for the method

        Returns:
            The JSON-RPC response dict, or None on error
        """
        if self.dry_run:
            self.logger.info(f"DRY RUN — would send: {method}({params})")
            return {"result": {"status": "dry_run"}}

        with self._lock:
            self.request_id += 1
            req_id = str(self.request_id)

        message = {
            "jsonrpc": "2.0",
            "method": method,
            "id": req_id,
        }
        if params:
            message["params"] = params

        # Set up response event
        event = threading.Event()
        self._pending_requests[req_id] = event

        # Send the message
        try:
            line = json.dumps(message) + "\n"
            self.process.stdin.write(line)
            self.process.stdin.flush()
            self.logger.debug(f"Sent: {method} (id={req_id})")
        except Exception as e:
            self.logger.error(f"Failed to send request: {e}")
            del self._pending_requests[req_id]
            return None

        # Wait for response (timeout: 120 seconds for long operations)
        if event.wait(timeout=120):
            response = self._responses.pop(req_id, None)
            del self._pending_requests[req_id]
            return response
        else:
            self.logger.warning(f"Request {req_id} ({method}) timed out")
            del self._pending_requests[req_id]
            return None

    def send_prompt(self, prompt: str) -> Optional[dict]:
        """
        Send a prompt to Kimi and wait for the turn to complete.

        Args:
            prompt: The user input / instruction for Kimi

        Returns:
            The final response dict, or None on error
        """
        return self.send_request("prompt", {
            "user_input": prompt
        })

    def cancel(self) -> Optional[dict]:
        """Cancel the current running turn."""
        return self.send_request("cancel", {})

    def on_event(self, event_type: str, handler):
        """
        Register an event handler for a specific event type.

        Args:
            event_type: Event type (e.g., 'TurnBegin', 'ToolCall', 'ApprovalRequest')
            handler: Callable that receives the event params dict
        """
        if event_type not in self._event_handlers:
            self._event_handlers[event_type] = []
        self._event_handlers[event_type].append(handler)

    def _read_loop(self):
        """Background thread that reads JSON-RPC messages from Kimi stdout."""
        while self._running and self.process and self.process.poll() is None:
            try:
                line = self.process.stdout.readline()
                if not line:
                    if self.process.poll() is not None:
                        self.logger.warning("Kimi process exited")
                        break
                    continue

                line = line.strip()
                if not line:
                    continue

                try:
                    message = json.loads(line)
                except json.JSONDecodeError:
                    self.logger.debug(f"Non-JSON output: {line[:100]}")
                    continue

                self._handle_message(message)

            except Exception as e:
                if self._running:
                    self.logger.error(f"Read loop error: {e}")
                break

        self.logger.debug("Read loop ended")

    def _handle_message(self, message: dict):
        """Route an incoming JSON-RPC message to the appropriate handler."""
        # Check if this is a response to a pending request
        msg_id = message.get("id")
        if msg_id and msg_id in self._pending_requests:
            self._responses[msg_id] = message
            self._pending_requests[msg_id].set()
            return

        # Handle events (notifications without id)
        method = message.get("method")
        params = message.get("params", {})

        if method == "event":
            event_type = params.get("type", "unknown")
            self.logger.debug(f"Event: {event_type}")

            # Dispatch to registered handlers
            handlers = self._event_handlers.get(event_type, [])
            for handler in handlers:
                try:
                    handler(params)
                except Exception as e:
                    self.logger.error(f"Event handler error ({event_type}): {e}")

        elif method == "request":
            # Handle approval requests
            request_type = params.get("type", "unknown")
            self.logger.info(f"Request: {request_type}")

            handlers = self._event_handlers.get("request", [])
            for handler in handlers:
                try:
                    handler(message)
                except Exception as e:
                    self.logger.error(f"Request handler error: {e}")


# ---------------------------------------------------------------------------
# Git Event Watcher
# ---------------------------------------------------------------------------

class GitWatcher:
    """
    Watches for Git events by monitoring .git/refs/heads/ for changes.

    When a new commit is detected on any branch, it parses the commit
    message for routing headers and dispatches the event.
    """

    def __init__(self, project_root: Path, logger: logging.Logger):
        self.project_root = project_root
        self.logger = logger
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._last_heads: dict[str, str] = {}
        self._callbacks: list = []

    def start(self):
        """Start watching for Git events."""
        self._running = True
        self._last_heads = self._get_current_heads()
        self._thread = threading.Thread(
            target=self._watch_loop,
            daemon=True,
            name="git-watcher"
        )
        self._thread.start()
        self.logger.info(f"Git watcher started (interval: {GIT_WATCH_INTERVAL}s)")

    def stop(self):
        """Stop watching for Git events."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    def on_commit(self, callback):
        """
        Register a callback for new commits.

        Callback receives: (branch, commit_hash, agent, action, task, message)
        """
        self._callbacks.append(callback)

    def _get_current_heads(self) -> dict[str, str]:
        """Get current HEAD commit for each branch."""
        heads = {}
        refs_dir = self.project_root / ".git" / "refs" / "heads"

        if not refs_dir.exists():
            return heads

        for ref_file in refs_dir.rglob("*"):
            if ref_file.is_file():
                branch = str(ref_file.relative_to(refs_dir))
                try:
                    commit_hash = ref_file.read_text().strip()
                    heads[branch] = commit_hash
                except Exception:
                    pass

        return heads

    def _watch_loop(self):
        """Background thread that polls for Git changes."""
        while self._running:
            try:
                current_heads = self._get_current_heads()

                for branch, commit_hash in current_heads.items():
                    old_hash = self._last_heads.get(branch)

                    if old_hash != commit_hash:
                        self.logger.debug(f"Change detected on {branch}: {old_hash} → {commit_hash}")
                        self._process_new_commit(branch, commit_hash)

                self._last_heads = current_heads

            except Exception as e:
                self.logger.error(f"Git watcher error: {e}")

            time.sleep(GIT_WATCH_INTERVAL)

    def _process_new_commit(self, branch: str, commit_hash: str):
        """Process a new commit on a branch."""
        try:
            # Get commit message
            result = subprocess.run(
                ["git", "log", "-1", "--pretty=%B", commit_hash],
                capture_output=True, text=True,
                cwd=str(self.project_root)
            )

            if result.returncode != 0:
                return

            message = result.stdout.strip()

            # Parse routing headers
            match = ROUTING_PATTERN.search(message)
            if not match:
                self.logger.debug(f"No routing headers in commit on {branch}")
                return

            agent, action, task = match.groups()
            self.logger.info(
                f"Routed commit: branch={branch} agent={agent} "
                f"action={action} task={task}"
            )

            # Dispatch to callbacks
            for callback in self._callbacks:
                try:
                    callback(branch, commit_hash, agent, action, task, message)
                except Exception as e:
                    self.logger.error(f"Commit callback error: {e}")

        except Exception as e:
            self.logger.error(f"Error processing commit {commit_hash}: {e}")


# ---------------------------------------------------------------------------
# Approval Handler
# ---------------------------------------------------------------------------

class ApprovalHandler:
    """
    Handles ApprovalRequest events from Kimi Wire Mode.

    In CI/CD mode: auto-approves all requests.
    In local mode: prompts the human for approval.
    """

    def __init__(self, logger: logging.Logger, auto_approve: bool = False):
        self.logger = logger
        self.auto_approve = auto_approve
        self._approval_log: list[dict] = []

    def handle_request(self, message: dict):
        """
        Handle an incoming approval request from Kimi.

        Args:
            message: The full JSON-RPC request message
        """
        params = message.get("params", {})
        request_id = message.get("id")
        request_type = params.get("type", "unknown")
        description = params.get("description", "No description")
        tool_name = params.get("tool_name", "unknown")

        self.logger.info(
            f"Approval request: type={request_type} tool={tool_name} "
            f"desc={description[:80]}"
        )

        # Log the request
        self._approval_log.append({
            "timestamp": datetime.now().isoformat(),
            "type": request_type,
            "tool": tool_name,
            "description": description,
            "approved": None  # Will be set below
        })

        if self.auto_approve:
            self.logger.info(f"Auto-approving: {tool_name}")
            self._approval_log[-1]["approved"] = True
            return {"approved": True}
        else:
            # In local mode, prompt the human
            return self._prompt_human(request_type, tool_name, description)

    def _prompt_human(self, request_type: str, tool_name: str, description: str) -> dict:
        """Prompt the human for approval via terminal."""
        print(f"\n{'='*60}")
        print(f"  APPROVAL REQUEST")
        print(f"{'='*60}")
        print(f"  Type: {request_type}")
        print(f"  Tool: {tool_name}")
        print(f"  Description: {description}")
        print(f"{'='*60}")

        try:
            response = input("  Approve? [Y/n]: ").strip().lower()
            approved = response in ("", "y", "yes")
        except (EOFError, KeyboardInterrupt):
            approved = False

        self._approval_log[-1]["approved"] = approved
        self.logger.info(f"Human {'approved' if approved else 'rejected'}: {tool_name}")

        return {"approved": approved}

    def get_log(self) -> list[dict]:
        """Return the approval log."""
        return self._approval_log


# ---------------------------------------------------------------------------
# Wire Metrics Tracker
# ---------------------------------------------------------------------------

class WireMetrics:
    """
    Tracks Wire Mode operational metrics and persists them to disk.

    Metrics tracked:
    - Tool call counts (per tool name)
    - Turn durations (start/end timestamps)
    - Step counts
    - Error counts
    - Session start time
    """

    def __init__(self, logger: logging.Logger):
        self.logger = logger
        self._lock = threading.Lock()
        self.tool_call_count = 0
        self.tool_calls_by_name: dict[str, int] = {}
        self.turn_count = 0
        self.turn_durations: list[float] = []
        self.step_count = 0
        self.error_count = 0
        self.session_start = datetime.now()
        self._current_turn_start: Optional[datetime] = None

    def record_tool_call(self, tool_name: str):
        """Record a tool call event."""
        with self._lock:
            self.tool_call_count += 1
            self.tool_calls_by_name[tool_name] = (
                self.tool_calls_by_name.get(tool_name, 0) + 1
            )

    def record_turn_begin(self):
        """Record the start of a turn."""
        with self._lock:
            self._current_turn_start = datetime.now()
            self.turn_count += 1

    def record_turn_end(self):
        """Record the end of a turn and calculate duration."""
        with self._lock:
            if self._current_turn_start:
                duration = (datetime.now() - self._current_turn_start).total_seconds()
                self.turn_durations.append(duration)
                self._current_turn_start = None

    def record_step(self):
        """Record a step event."""
        with self._lock:
            self.step_count += 1

    def record_error(self):
        """Record an error event."""
        with self._lock:
            self.error_count += 1

    def get_summary(self) -> dict:
        """Get a summary of all metrics."""
        with self._lock:
            uptime = (datetime.now() - self.session_start).total_seconds()
            avg_turn_duration = (
                sum(self.turn_durations) / len(self.turn_durations)
                if self.turn_durations else 0
            )
            return {
                "timestamp": datetime.now().isoformat(),
                "uptime_seconds": round(uptime, 1),
                "tool_call_count": self.tool_call_count,
                "tool_calls_by_name": dict(self.tool_calls_by_name),
                "turn_count": self.turn_count,
                "turn_duration_avg_seconds": round(avg_turn_duration, 2),
                "turn_duration_max_seconds": round(
                    max(self.turn_durations) if self.turn_durations else 0, 2
                ),
                "step_count": self.step_count,
                "error_count": self.error_count,
            }

    def save_to_disk(self):
        """Persist metrics to .ai/metrics/wire-metrics.json."""
        try:
            METRICS_DIR.mkdir(parents=True, exist_ok=True)
            summary = self.get_summary()

            # Append to history (load existing, add new entry)
            history = []
            if WIRE_METRICS_FILE.exists():
                try:
                    with open(WIRE_METRICS_FILE) as f:
                        content = f.read().strip()
                        if content:
                            history = json.loads(content)
                            if not isinstance(history, list):
                                history = [history]
                except (json.JSONDecodeError, ValueError):
                    self.logger.warning("Corrupt wire-metrics.json — resetting")
                    history = []

            history.append(summary)

            # Keep last 100 entries to prevent unbounded growth
            if len(history) > 100:
                history = history[-100:]

            with open(WIRE_METRICS_FILE, "w") as f:
                json.dump(history, f, indent=2)

            self.logger.debug(f"Metrics saved: {self.tool_call_count} tool calls, "
                            f"{self.turn_count} turns, {self.error_count} errors")
        except Exception as e:
            self.logger.error(f"Failed to save metrics: {e}")


# ---------------------------------------------------------------------------
# Wire Daemon (Main Coordinator)
# ---------------------------------------------------------------------------

class WireDaemon:
    """
    Main coordination daemon that ties together:
    - Kimi Wire Mode (JSON-RPC client)
    - Git event watcher
    - Approval handler
    - Action routing (submit, approve, report, evaluate)
    """

    def __init__(
        self,
        project_root: Path,
        logger: logging.Logger,
        dry_run: bool = False,
        auto_approve: bool = False
    ):
        self.project_root = project_root
        self.logger = logger
        self.dry_run = dry_run
        self._running = False

        # Components
        self.kimi = JsonRpcClient(logger, dry_run=dry_run)
        self.watcher = GitWatcher(project_root, logger)
        self.approvals = ApprovalHandler(logger, auto_approve=auto_approve)
        self.metrics = WireMetrics(logger)

        # Auto-restart configuration
        self._max_restart_attempts = 3
        self._restart_delay_base = 2  # seconds (exponential backoff)
        self._restart_count = 0

        # Register event handlers
        self.kimi.on_event("TurnBegin", self._on_turn_begin)
        self.kimi.on_event("TurnEnd", self._on_turn_end)
        self.kimi.on_event("ToolCall", self._on_tool_call)
        self.kimi.on_event("ToolResult", self._on_tool_result)
        self.kimi.on_event("ApprovalRequest", self._on_approval_request)
        self.kimi.on_event("request", self._on_request)
        # Step-level event handlers (if Kimi emits them)
        self.kimi.on_event("StepBegin", self._on_step_begin)
        self.kimi.on_event("StepEnd", self._on_step_end)
        # Content streaming handler
        self.kimi.on_event("ContentPart", self._on_content_part)

        # Register Git commit handler
        self.watcher.on_commit(self._on_git_commit)

    def start(self) -> bool:
        """Start the daemon: connect to Kimi and start watching Git."""
        self.logger.info("Starting Wire Daemon...")
        self.logger.info(f"Project root: {self.project_root}")
        self.logger.info(f"Dry run: {self.dry_run}")

        # Write PID file
        self._write_pid()

        # Start Kimi Wire Mode
        if not self.kimi.start(str(self.project_root)):
            if not self.dry_run:
                self.logger.error("Failed to start Kimi Wire Mode")
                return False

        # Start Git watcher
        self.watcher.start()

        self._running = True
        self.logger.info("Wire Daemon started successfully")
        return True

    def stop(self):
        """Stop the daemon gracefully and save final metrics."""
        self.logger.info("Stopping Wire Daemon...")
        self._running = False
        self.metrics.save_to_disk()
        self.watcher.stop()
        self.kimi.stop()
        self._remove_pid()
        self.logger.info("Wire Daemon stopped")

    def _attempt_restart(self) -> bool:
        """Attempt to restart the Kimi Wire Mode connection with exponential backoff."""
        if self._restart_count >= self._max_restart_attempts:
            self.logger.error(
                f"Max restart attempts ({self._max_restart_attempts}) reached. Giving up."
            )
            return False

        self._restart_count += 1
        delay = self._restart_delay_base ** self._restart_count
        self.logger.warning(
            f"Kimi process exited. Restart attempt {self._restart_count}/"
            f"{self._max_restart_attempts} in {delay}s..."
        )
        self.metrics.record_error()
        time.sleep(delay)

        # Stop old connection and start new one
        self.kimi.stop()
        if self.kimi.start(str(self.project_root)):
            self.logger.info("Kimi Wire Mode reconnected successfully")
            self._restart_count = 0  # Reset counter on success
            return True
        else:
            self.logger.error(f"Restart attempt {self._restart_count} failed")
            return False

    def run(self):
        """Run the daemon main loop (blocks until interrupted)."""
        if not self.start():
            return

        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGTERM, lambda *_: self.stop())
        signal.signal(signal.SIGINT, lambda *_: self.stop())

        self.logger.info("Wire Daemon running. Press Ctrl+C to stop.")

        try:
            while self._running:
                time.sleep(1)

                # Check if Kimi process is still alive (auto-restart)
                if (not self.dry_run and self.kimi.process
                        and self.kimi.process.poll() is not None):
                    self.logger.warning("Kimi process exited unexpectedly")
                    if not self._attempt_restart():
                        self.logger.error("Auto-restart failed. Shutting down.")
                        break
        except KeyboardInterrupt:
            pass
        finally:
            self.stop()

    # -----------------------------------------------------------------------
    # Git commit handler
    # -----------------------------------------------------------------------

    def _on_git_commit(
        self, branch: str, commit_hash: str,
        agent: str, action: str, task: str, message: str
    ):
        """Handle a new Git commit with routing headers."""
        self.logger.info(
            f"Processing: [{agent}] [{action}] [{task}] on {branch}"
        )

        if action == "submit":
            self._handle_submit(agent, task, commit_hash)
        elif action == "approve":
            self._handle_approve(agent, task, commit_hash)
        elif action == "report":
            self._handle_report(agent, task, message)
        elif action == "evaluate":
            self._handle_evaluate(task)
        else:
            self.logger.info(f"Action '{action}' — no automation triggered")

    def _handle_submit(self, agent: str, task: str, commit_hash: str):
        """Handle a submit action — trigger review."""
        prompt = (
            f"You are reviewing a code submission for task {task} from agent {agent}.\n\n"
            f"Your review process:\n"
            f"1. Read the task brief from .ai/tasks/{task}.md to understand the acceptance criteria.\n"
            f"2. Run: git diff HEAD~1 -- to see what changed in this commit.\n"
            f"3. Check each acceptance criterion — mark as MET or UNMET.\n"
            f"4. Check file boundary compliance against .ai/boundaries.md.\n"
            f"5. Check the commit message format follows [AGENT:x] [ACTION:y] [TASK:z] convention.\n\n"
            f"Write your review to .ai/reviews/{task}-review.md using the structure "
            f"from .ai/templates/review.md.\n"
            f"Set the verdict to APPROVED, CHANGES_REQUESTED, or REJECTED."
        )
        self.logger.info(f"Sending review request for {task}...")
        response = self.kimi.send_prompt(prompt)
        if response:
            self.logger.info(f"Review for {task} completed")
        else:
            self.logger.error(f"Review for {task} failed")

    def _handle_approve(self, agent: str, task: str, commit_hash: str):
        """Handle an approve action — trigger merge."""
        prompt = (
            f"The reviewer has approved task {task}. Perform the following steps:\n\n"
            f"1. Check if branch {agent}/{task} exists.\n"
            f"2. Switch to the pre-mortal branch: git checkout pre-mortal\n"
            f"3. Merge the agent branch: git merge {agent}/{task} --no-ff\n"
            f"4. If merge conflicts, write a report and abort.\n"
            f"5. If merge succeeds, update .ai/status.md to mark {task} as DONE.\n"
            f"6. Switch back to the original branch.\n"
        )
        self.logger.info(f"Sending merge request for {task}...")
        response = self.kimi.send_prompt(prompt)
        if response:
            self.logger.info(f"Merge for {task} completed")
        else:
            self.logger.error(f"Merge for {task} failed")

    def _handle_report(self, agent: str, task: str, message: str):
        """Handle a report action — update sprint reports."""
        prompt = (
            f"An agent ({agent}) has submitted a report commit for {task}.\n\n"
            f"Commit message:\n{message}\n\n"
            f"Append a structured summary to .ai/reports/sprint-current.md."
        )
        self.logger.info(f"Sending report update for {task}...")
        response = self.kimi.send_prompt(prompt)
        if response:
            self.logger.info(f"Report for {task} updated")

    def _handle_evaluate(self, task: str):
        """Handle an evaluate action — trigger sprint evaluation."""
        eval_script = self.project_root / "scripts" / "generate-evaluation.sh"
        if eval_script.exists():
            self.logger.info("Triggering sprint evaluation...")
            try:
                subprocess.run(
                    [str(eval_script), "--baseline"],
                    cwd=str(self.project_root),
                    timeout=300
                )
                self.logger.info("Sprint evaluation completed")
            except Exception as e:
                self.logger.error(f"Sprint evaluation failed: {e}")

    # -----------------------------------------------------------------------
    # Kimi event handlers
    # -----------------------------------------------------------------------

    def _on_turn_begin(self, params: dict):
        """Handle TurnBegin event — track turn start for duration metrics."""
        self.metrics.record_turn_begin()
        self.logger.debug("Turn started")

    def _on_turn_end(self, params: dict):
        """Handle TurnEnd event — record turn duration and save metrics."""
        self.metrics.record_turn_end()
        self.metrics.save_to_disk()
        self.logger.debug("Turn ended")

    def _on_tool_call(self, params: dict):
        """Handle ToolCall event — track tool usage by name."""
        tool_name = params.get("name", "unknown")
        self.metrics.record_tool_call(tool_name)
        self.logger.debug(f"Tool call: {tool_name}")

    def _on_tool_result(self, params: dict):
        """Handle ToolResult event — track errors."""
        is_error = params.get("is_error", False)
        if is_error:
            self.metrics.record_error()
            self.logger.warning(f"Tool error: {params.get('output', '')[:100]}")

    def _on_approval_request(self, params: dict):
        """Handle ApprovalRequest event."""
        self.approvals.handle_request({"params": params})

    def _on_request(self, message: dict):
        """Handle generic request from Kimi (e.g., approval)."""
        self.approvals.handle_request(message)

    def _on_step_begin(self, params: dict):
        """Handle StepBegin event — track step count."""
        self.metrics.record_step()
        step_num = params.get("n", "?")
        self.logger.debug(f"Step {step_num} started")

    def _on_step_end(self, params: dict):
        """Handle StepEnd event."""
        step_num = params.get("n", "?")
        self.logger.debug(f"Step {step_num} ended")

    def _on_content_part(self, params: dict):
        """Handle ContentPart event — streaming content from Kimi."""
        content_type = params.get("type", "text")
        self.logger.debug(f"Content part: {content_type}")

    # -----------------------------------------------------------------------
    # PID file management
    # -----------------------------------------------------------------------

    def _write_pid(self):
        """Write the daemon PID to the PID file."""
        PID_FILE.parent.mkdir(parents=True, exist_ok=True)
        PID_FILE.write_text(str(os.getpid()))

    def _remove_pid(self):
        """Remove the PID file."""
        if PID_FILE.exists():
            PID_FILE.unlink()


# ---------------------------------------------------------------------------
# Daemon management functions
# ---------------------------------------------------------------------------

def get_daemon_status() -> dict:
    """Check if the daemon is running."""
    if not PID_FILE.exists():
        return {"running": False, "pid": None}

    try:
        pid = int(PID_FILE.read_text().strip())
        # Check if process is running
        os.kill(pid, 0)
        return {"running": True, "pid": pid}
    except (ValueError, ProcessLookupError, PermissionError):
        # PID file exists but process is not running
        PID_FILE.unlink(missing_ok=True)
        return {"running": False, "pid": None}


def stop_daemon() -> bool:
    """Stop a running daemon."""
    status = get_daemon_status()
    if not status["running"]:
        print("Wire Daemon is not running.")
        return False

    pid = status["pid"]
    try:
        os.kill(pid, signal.SIGTERM)
        # Wait for process to exit
        for _ in range(10):
            try:
                os.kill(pid, 0)
                time.sleep(0.5)
            except ProcessLookupError:
                PID_FILE.unlink(missing_ok=True)
                print(f"Wire Daemon (PID {pid}) stopped.")
                return True

        # Force kill if still running
        os.kill(pid, signal.SIGKILL)
        PID_FILE.unlink(missing_ok=True)
        print(f"Wire Daemon (PID {pid}) force-killed.")
        return True

    except ProcessLookupError:
        PID_FILE.unlink(missing_ok=True)
        print("Wire Daemon was not running.")
        return False
    except PermissionError:
        print(f"Permission denied to stop PID {pid}.")
        return False


def show_status():
    """Display daemon status."""
    status = get_daemon_status()

    print()
    print("=========================================")
    print("  Open Artel — Wire Daemon Status")
    print("=========================================")
    print()

    if status["running"]:
        print(f"  Status: RUNNING (PID {status['pid']})")
    else:
        print("  Status: STOPPED")

    print(f"  PID file: {PID_FILE}")
    print(f"  Log file: {LOG_FILE}")

    if LOG_FILE.exists():
        lines = LOG_FILE.read_text().strip().split("\n")
        print(f"  Log entries: {len(lines)}")
        print()
        print("  Last 5 log entries:")
        for line in lines[-5:]:
            print(f"    {line}")
    else:
        print("  Log file: none")

    print()


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Open Artel Wire Mode Coordination Daemon",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/wire-daemon.py                  # Start daemon
  python scripts/wire-daemon.py --status         # Check status
  python scripts/wire-daemon.py --stop           # Stop daemon
  python scripts/wire-daemon.py --dry-run        # Start without Kimi
  python scripts/wire-daemon.py --auto-approve   # Auto-approve all requests
        """
    )

    parser.add_argument(
        "--status", action="store_true",
        help="Show daemon status"
    )
    parser.add_argument(
        "--stop", action="store_true",
        help="Stop the running daemon"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Start without connecting to Kimi (for testing)"
    )
    parser.add_argument(
        "--auto-approve", action="store_true",
        help="Auto-approve all Kimi requests (CI/CD mode)"
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Enable verbose logging"
    )
    parser.add_argument(
        "--background", "-b", action="store_true",
        help="Run in background (daemonize)"
    )

    args = parser.parse_args()

    # Handle status and stop commands
    if args.status:
        show_status()
        return

    if args.stop:
        stop_daemon()
        return

    # Check if already running
    status = get_daemon_status()
    if status["running"]:
        print(f"Wire Daemon is already running (PID {status['pid']}).")
        print("Use --stop to stop it first.")
        sys.exit(1)

    # Set up logging
    logger = setup_logging(verbose=args.verbose)

    # Background mode
    if args.background:
        # Fork to background
        pid = os.fork()
        if pid > 0:
            print(f"Wire Daemon started in background (PID {pid})")
            sys.exit(0)
        # Child process continues
        os.setsid()

    # Create and run daemon
    daemon = WireDaemon(
        project_root=PROJECT_ROOT,
        logger=logger,
        dry_run=args.dry_run,
        auto_approve=args.auto_approve
    )

    daemon.run()


if __name__ == "__main__":
    main()

