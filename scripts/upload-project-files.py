#!/usr/bin/env python3
"""
=============================================================================
Open Artel — Project File Upload & Sync
=============================================================================

Upload project files to Moonshot Files API for persistent context across
Kimi sessions. Tracks uploaded files for incremental sync.

Usage:
    python3 scripts/upload-project-files.py --initial    # Upload all project files
    python3 scripts/upload-project-files.py --sync       # Only upload changed files
    python3 scripts/upload-project-files.py --list       # List uploaded files
    python3 scripts/upload-project-files.py --clean      # Delete all uploaded files
    python3 scripts/upload-project-files.py --help       # Show help

File selection:
    Uploads:  .agents/, .ai/, README.md, AGENTS.md, CLAUDE.md
    Excludes: .env*, *.log, .git/, node_modules/, binary files, large files

Tracking:
    Uploaded file mappings stored in .ai/metrics/uploaded-files.json

=============================================================================
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Optional

# Import the API client from the same scripts directory
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

# We import functions from moonshot-api-client.py
# Since the filename has a hyphen, we use importlib
import importlib.util

_client_path = SCRIPT_DIR / "moonshot-api-client.py"
_spec = importlib.util.spec_from_file_location("moonshot_api_client", _client_path)
_client_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_client_module)

# Bind API functions
upload_file = _client_module.upload_file
list_files = _client_module.list_files
delete_file = _client_module.delete_file
get_file = _client_module.get_file
resolve_api_key = _client_module.resolve_api_key
APIError = _client_module.APIError

PROJECT_ROOT = SCRIPT_DIR.parent

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Directories to upload (relative to project root)
UPLOAD_DIRS = [
    ".agents",
    ".ai",
]

# Individual files to upload (relative to project root)
UPLOAD_FILES = [
    "README.md",
    "AGENTS.md",
    "CLAUDE.md",
]

# Patterns to exclude
EXCLUDE_PATTERNS = [
    ".env",
    ".env.",
    ".git/",
    "node_modules/",
    "__pycache__/",
    ".DS_Store",
    "Thumbs.db",
]

# File extensions to exclude (binary/large)
EXCLUDE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
    ".zip", ".tar", ".gz", ".bz2",
    ".exe", ".dll", ".so", ".dylib",
    ".pyc", ".pyo",
    ".db", ".sqlite",
}

# Maximum file size to upload (1 MB)
MAX_FILE_SIZE = 1_000_000

# Tracking file location
TRACKING_FILE = PROJECT_ROOT / ".ai" / "metrics" / "uploaded-files.json"


# ---------------------------------------------------------------------------
# Tracking File Management
# ---------------------------------------------------------------------------

def load_tracking() -> dict:
    """
    Load the upload tracking file.
    Returns dict mapping relative file paths to upload metadata.
    """
    if not TRACKING_FILE.exists():
        return {}

    try:
        with open(TRACKING_FILE) as f:
            data = json.load(f)
            if isinstance(data, dict):
                return data
            return {}
    except (json.JSONDecodeError, OSError):
        return {}


def save_tracking(tracking: dict) -> None:
    """Save the upload tracking file."""
    # Ensure directory exists
    TRACKING_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(TRACKING_FILE, "w") as f:
        json.dump(tracking, f, indent=2)


# ---------------------------------------------------------------------------
# File Discovery
# ---------------------------------------------------------------------------

def should_exclude(rel_path: str) -> bool:
    """Check if a file should be excluded from upload."""
    # Check exclude patterns
    for pattern in EXCLUDE_PATTERNS:
        if pattern in rel_path:
            return True

    # Check file extension
    ext = Path(rel_path).suffix.lower()
    if ext in EXCLUDE_EXTENSIONS:
        return True

    return False


def discover_files() -> list:
    """
    Discover all project files eligible for upload.
    Returns list of relative paths (strings).
    """
    files = []

    # Walk directories
    for dir_name in UPLOAD_DIRS:
        dir_path = PROJECT_ROOT / dir_name
        if not dir_path.exists():
            continue

        for root, dirs, filenames in os.walk(dir_path):
            # Skip hidden directories (except .agents, .ai)
            dirs[:] = [d for d in dirs if not d.startswith(".") or d in (".agents", ".ai")]

            for filename in filenames:
                full_path = Path(root) / filename
                rel_path = str(full_path.relative_to(PROJECT_ROOT))

                if should_exclude(rel_path):
                    continue

                # Check file size
                try:
                    size = full_path.stat().st_size
                    if size > MAX_FILE_SIZE:
                        continue
                    if size == 0:
                        continue
                except OSError:
                    continue

                files.append(rel_path)

    # Individual files
    for filename in UPLOAD_FILES:
        file_path = PROJECT_ROOT / filename
        if file_path.exists() and not should_exclude(filename):
            try:
                size = file_path.stat().st_size
                if 0 < size <= MAX_FILE_SIZE:
                    files.append(filename)
            except OSError:
                continue

    return sorted(files)


def get_file_mtime(rel_path: str) -> float:
    """Get modification time of a file."""
    full_path = PROJECT_ROOT / rel_path
    try:
        return full_path.stat().st_mtime
    except OSError:
        return 0.0


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_initial(dry_run: bool = False) -> int:
    """Upload all project files (initial upload)."""
    print("=" * 60)
    print("  Moonshot Files API — Initial Upload")
    print("=" * 60)
    print()

    # Verify API key
    api_key = resolve_api_key()
    if not api_key:
        print("ERROR: No API key found. Run setup-project-api-key.sh create first.", file=sys.stderr)
        return 1

    files = discover_files()
    print(f"Found {len(files)} files to upload")
    print()

    if dry_run:
        print("[DRY RUN] Would upload:")
        for f in files:
            size = (PROJECT_ROOT / f).stat().st_size
            print(f"  {f} ({size:,} bytes)")
        return 0

    tracking = {}
    uploaded = 0
    failed = 0

    for rel_path in files:
        full_path = str(PROJECT_ROOT / rel_path)
        size = (PROJECT_ROOT / rel_path).stat().st_size
        print(f"  Uploading: {rel_path} ({size:,} bytes)...", end=" ", flush=True)

        try:
            result = upload_file(full_path, purpose="file-extract", api_key=api_key)
            file_id = result.get("id", "unknown")
            tracking[rel_path] = {
                "file_id": file_id,
                "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "mtime": get_file_mtime(rel_path),
                "bytes": size,
                "filename": result.get("filename", Path(rel_path).name),
            }
            print(f"OK ({file_id})")
            uploaded += 1
        except APIError as e:
            print(f"FAILED (HTTP {e.code}: {e.reason})")
            failed += 1
        except Exception as e:
            print(f"FAILED ({e})")
            failed += 1

    # Save tracking
    save_tracking(tracking)

    print()
    print(f"Results: {uploaded} uploaded, {failed} failed, {len(files)} total")
    print(f"Tracking saved to: {TRACKING_FILE.relative_to(PROJECT_ROOT)}")

    return 0 if failed == 0 else 1


def cmd_sync(dry_run: bool = False) -> int:
    """Incremental sync — only upload changed files."""
    print("=" * 60)
    print("  Moonshot Files API — Incremental Sync")
    print("=" * 60)
    print()

    # Verify API key
    api_key = resolve_api_key()
    if not api_key:
        print("ERROR: No API key found.", file=sys.stderr)
        return 1

    tracking = load_tracking()
    files = discover_files()

    # Determine what changed
    to_upload = []
    to_delete = []

    for rel_path in files:
        current_mtime = get_file_mtime(rel_path)

        if rel_path not in tracking:
            # New file
            to_upload.append((rel_path, "new"))
        elif current_mtime > tracking[rel_path].get("mtime", 0):
            # Modified file — delete old, upload new
            to_upload.append((rel_path, "modified"))
            to_delete.append((rel_path, tracking[rel_path].get("file_id")))

    # Check for deleted files
    for tracked_path in list(tracking.keys()):
        if tracked_path not in files:
            to_delete.append((tracked_path, tracking[tracked_path].get("file_id")))

    if not to_upload and not to_delete:
        print("  All files are up to date. Nothing to sync.")
        return 0

    print(f"  Changes detected:")
    print(f"    New/Modified: {len(to_upload)}")
    print(f"    Deleted:      {len([d for d in to_delete if d[0] not in [u[0] for u in to_upload]])}")
    print()

    if dry_run:
        print("[DRY RUN] Would sync:")
        for path, reason in to_upload:
            print(f"  UPLOAD ({reason}): {path}")
        for path, fid in to_delete:
            if path not in [u[0] for u in to_upload]:
                print(f"  DELETE: {path} ({fid})")
        return 0

    uploaded = 0
    deleted = 0
    failed = 0

    # Delete old versions first
    for rel_path, file_id in to_delete:
        if file_id:
            try:
                delete_file(file_id, api_key=api_key)
                deleted += 1
            except APIError:
                pass  # Non-critical, old file may already be gone

        # Remove from tracking if it's a true delete (not a re-upload)
        if rel_path not in [u[0] for u in to_upload]:
            tracking.pop(rel_path, None)

    # Upload new/modified files
    for rel_path, reason in to_upload:
        full_path = str(PROJECT_ROOT / rel_path)
        size = (PROJECT_ROOT / rel_path).stat().st_size
        print(f"  Uploading ({reason}): {rel_path} ({size:,} bytes)...", end=" ", flush=True)

        try:
            result = upload_file(full_path, purpose="file-extract", api_key=api_key)
            file_id = result.get("id", "unknown")
            tracking[rel_path] = {
                "file_id": file_id,
                "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "mtime": get_file_mtime(rel_path),
                "bytes": size,
                "filename": result.get("filename", Path(rel_path).name),
            }
            print(f"OK ({file_id})")
            uploaded += 1
        except APIError as e:
            print(f"FAILED (HTTP {e.code}: {e.reason})")
            failed += 1
        except Exception as e:
            print(f"FAILED ({e})")
            failed += 1

    save_tracking(tracking)

    print()
    print(f"Results: {uploaded} uploaded, {deleted} deleted, {failed} failed")

    return 0 if failed == 0 else 1


def cmd_list() -> int:
    """List uploaded files from tracking and optionally verify with API."""
    print("=" * 60)
    print("  Moonshot Files API — Uploaded Files")
    print("=" * 60)
    print()

    tracking = load_tracking()

    if not tracking:
        print("  No files tracked. Run --initial first.")
        return 0

    print(f"  {'File':<45} {'ID':<25} {'Size':>8}")
    print(f"  {'-'*45} {'-'*25} {'-'*8}")

    total_bytes = 0
    for rel_path, meta in sorted(tracking.items()):
        file_id = meta.get("file_id", "?")
        size = meta.get("bytes", 0)
        total_bytes += size
        # Truncate long paths
        display_path = rel_path if len(rel_path) <= 44 else "..." + rel_path[-41:]
        print(f"  {display_path:<45} {file_id:<25} {size:>8,}")

    print()
    print(f"  Total: {len(tracking)} files, {total_bytes:,} bytes")
    print(f"  Tracking file: {TRACKING_FILE.relative_to(PROJECT_ROOT)}")

    return 0


def cmd_clean(dry_run: bool = False) -> int:
    """Delete all uploaded files from Moonshot."""
    print("=" * 60)
    print("  Moonshot Files API — Clean Up")
    print("=" * 60)
    print()

    # Verify API key
    api_key = resolve_api_key()
    if not api_key:
        print("ERROR: No API key found.", file=sys.stderr)
        return 1

    tracking = load_tracking()

    if not tracking:
        print("  No files tracked. Nothing to clean.")
        return 0

    print(f"  Will delete {len(tracking)} files from Moonshot")
    print()

    if dry_run:
        print("[DRY RUN] Would delete:")
        for rel_path, meta in sorted(tracking.items()):
            print(f"  {rel_path} ({meta.get('file_id', '?')})")
        return 0

    deleted = 0
    failed = 0

    for rel_path, meta in sorted(tracking.items()):
        file_id = meta.get("file_id")
        if not file_id:
            continue

        print(f"  Deleting: {rel_path} ({file_id})...", end=" ", flush=True)
        try:
            delete_file(file_id, api_key=api_key)
            print("OK")
            deleted += 1
        except APIError as e:
            if e.code == 404:
                print("ALREADY GONE")
                deleted += 1
            else:
                print(f"FAILED (HTTP {e.code})")
                failed += 1
        except Exception as e:
            print(f"FAILED ({e})")
            failed += 1

    # Clear tracking
    save_tracking({})

    print()
    print(f"Results: {deleted} deleted, {failed} failed")

    return 0 if failed == 0 else 1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Upload project files to Moonshot Files API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --initial          Upload all project files
  %(prog)s --sync             Sync only changed files
  %(prog)s --list             Show uploaded files
  %(prog)s --clean            Delete all from Moonshot
  %(prog)s --initial --dry-run  Preview without uploading
        """,
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--initial", action="store_true", help="Upload all project files")
    group.add_argument("--sync", action="store_true", help="Incremental sync (changed files only)")
    group.add_argument("--list", action="store_true", help="List uploaded files")
    group.add_argument("--clean", action="store_true", help="Delete all uploaded files")

    parser.add_argument("--dry-run", action="store_true", help="Preview without making changes")

    args = parser.parse_args()

    if args.initial:
        return cmd_initial(dry_run=args.dry_run)
    elif args.sync:
        return cmd_sync(dry_run=args.dry_run)
    elif args.list:
        return cmd_list()
    elif args.clean:
        return cmd_clean(dry_run=args.dry_run)


if __name__ == "__main__":
    sys.exit(main() or 0)

