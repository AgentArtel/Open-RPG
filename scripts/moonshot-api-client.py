#!/usr/bin/env python3
"""
=============================================================================
Open Artel — Moonshot Files API Client
=============================================================================

Python stdlib-only client for the Moonshot Files API. Uses urllib.request
for HTTP calls — no external dependencies required.

Base URL: https://api.moonshot.ai/v1
Compatibility: OpenAI-compatible REST API

Usage:
    python3 scripts/moonshot-api-client.py upload <file> [--purpose assistants]
    python3 scripts/moonshot-api-client.py list [--purpose assistants]
    python3 scripts/moonshot-api-client.py get <file-id>
    python3 scripts/moonshot-api-client.py delete <file-id>
    python3 scripts/moonshot-api-client.py content <file-id>
    python3 scripts/moonshot-api-client.py validate
    python3 scripts/moonshot-api-client.py --help

API key priority:
    1. .env.project  (project-specific)
    2. .env          (global)
    3. KIMI_API_KEY  (environment variable)

=============================================================================
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional
import uuid
import mimetypes

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "https://api.moonshot.ai/v1"
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent


# ---------------------------------------------------------------------------
# API Key Resolution
# ---------------------------------------------------------------------------

def resolve_api_key() -> Optional[str]:
    """
    Resolve API key with priority chain:
    1. .env.project (project-specific)
    2. .env (global)
    3. KIMI_API_KEY environment variable
    """
    # Priority 1: .env.project
    env_project = PROJECT_ROOT / ".env.project"
    if env_project.exists():
        key = _read_key_from_env_file(env_project)
        if key:
            return key

    # Priority 2: .env
    env_global = PROJECT_ROOT / ".env"
    if env_global.exists():
        key = _read_key_from_env_file(env_global)
        if key:
            return key

    # Priority 3: Environment variable
    key = os.environ.get("KIMI_API_KEY", "")
    if key:
        return key

    return None


def _read_key_from_env_file(filepath: Path) -> Optional[str]:
    """Read KIMI_API_KEY from a .env file."""
    try:
        with open(filepath) as f:
            for line in f:
                line = line.strip()
                if line.startswith("KIMI_API_KEY="):
                    value = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if value:
                        return value
    except (OSError, IOError):
        pass
    return None


# ---------------------------------------------------------------------------
# HTTP Helpers (stdlib only)
# ---------------------------------------------------------------------------

def _make_request(
    method: str,
    endpoint: str,
    api_key: str,
    data: Optional[bytes] = None,
    headers: Optional[dict] = None,
    content_type: Optional[str] = None,
) -> dict:
    """
    Make an HTTP request to the Moonshot API.
    Returns parsed JSON response or raises an exception.
    """
    url = f"{BASE_URL}{endpoint}"
    req_headers = {
        "Authorization": f"Bearer {api_key}",
    }
    if headers:
        req_headers.update(headers)
    if content_type:
        req_headers["Content-Type"] = content_type

    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            if body:
                return json.loads(body)
            return {"status": "ok", "http_code": resp.status}
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8")
        except Exception:
            pass
        raise APIError(e.code, e.reason, error_body) from e
    except urllib.error.URLError as e:
        raise APIError(0, str(e.reason), "") from e


def _multipart_upload(
    endpoint: str,
    api_key: str,
    file_path: str,
    purpose: str = "file-extract",
) -> dict:
    """
    Upload a file using multipart/form-data (stdlib implementation).
    """
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex[:16]}"
    file_path_obj = Path(file_path)
    filename = file_path_obj.name

    # Detect MIME type
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        mime_type = "application/octet-stream"

    # Read file content
    with open(file_path_obj, "rb") as f:
        file_content = f.read()

    # Build multipart body
    body_parts = []

    # Purpose field
    body_parts.append(f"--{boundary}\r\n".encode())
    body_parts.append(b'Content-Disposition: form-data; name="purpose"\r\n\r\n')
    body_parts.append(f"{purpose}\r\n".encode())

    # File field
    body_parts.append(f"--{boundary}\r\n".encode())
    body_parts.append(
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode()
    )
    body_parts.append(f"Content-Type: {mime_type}\r\n\r\n".encode())
    body_parts.append(file_content)
    body_parts.append(b"\r\n")

    # Closing boundary
    body_parts.append(f"--{boundary}--\r\n".encode())

    body = b"".join(body_parts)

    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8")
        except Exception:
            pass
        raise APIError(e.code, e.reason, error_body) from e
    except urllib.error.URLError as e:
        raise APIError(0, str(e.reason), "") from e


class APIError(Exception):
    """Moonshot API error with HTTP status code and details."""

    def __init__(self, code: int, reason: str, body: str):
        self.code = code
        self.reason = reason
        self.body = body
        super().__init__(f"HTTP {code}: {reason}")


# ---------------------------------------------------------------------------
# API Operations
# ---------------------------------------------------------------------------

def upload_file(file_path: str, purpose: str = "file-extract", api_key: Optional[str] = None) -> dict:
    """
    Upload a file to Moonshot Files API.

    Args:
        file_path: Path to the file to upload
        purpose: File purpose (default: "file-extract" for document Q&A)
        api_key: Optional API key override

    Returns:
        dict with file metadata (id, filename, bytes, created_at, purpose)
    """
    if not api_key:
        api_key = resolve_api_key()
    if not api_key:
        raise ValueError("No API key available. Run setup-project-api-key.sh create first.")

    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    return _multipart_upload("/files", api_key, file_path, purpose)


def list_files(purpose: Optional[str] = None, api_key: Optional[str] = None) -> list:
    """
    List files uploaded to Moonshot.

    Args:
        purpose: Optional filter by purpose
        api_key: Optional API key override

    Returns:
        List of file metadata dicts
    """
    if not api_key:
        api_key = resolve_api_key()
    if not api_key:
        raise ValueError("No API key available.")

    result = _make_request("GET", "/files", api_key)
    files = result.get("data", [])

    if purpose:
        files = [f for f in files if f.get("purpose") == purpose]

    return files


def get_file(file_id: str, api_key: Optional[str] = None) -> dict:
    """
    Get metadata for a specific file.

    Args:
        file_id: The Moonshot file ID
        api_key: Optional API key override

    Returns:
        dict with file metadata
    """
    if not api_key:
        api_key = resolve_api_key()
    if not api_key:
        raise ValueError("No API key available.")

    return _make_request("GET", f"/files/{file_id}", api_key)


def delete_file(file_id: str, api_key: Optional[str] = None) -> bool:
    """
    Delete a file from Moonshot.

    Args:
        file_id: The Moonshot file ID
        api_key: Optional API key override

    Returns:
        True if deleted successfully
    """
    if not api_key:
        api_key = resolve_api_key()
    if not api_key:
        raise ValueError("No API key available.")

    result = _make_request("DELETE", f"/files/{file_id}", api_key)
    return result.get("deleted", False) or result.get("status") == "ok"


def get_file_content(file_id: str, api_key: Optional[str] = None) -> str:
    """
    Get the content of an uploaded file.

    Args:
        file_id: The Moonshot file ID
        api_key: Optional API key override

    Returns:
        File content as string
    """
    if not api_key:
        api_key = resolve_api_key()
    if not api_key:
        raise ValueError("No API key available.")

    url = f"{BASE_URL}/files/{file_id}/content"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {api_key}"},
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8")
        except Exception:
            pass
        raise APIError(e.code, e.reason, error_body) from e


def validate_key(api_key: Optional[str] = None) -> dict:
    """
    Validate an API key by listing models.

    Args:
        api_key: Optional API key override

    Returns:
        dict with model list if valid
    """
    if not api_key:
        api_key = resolve_api_key()
    if not api_key:
        raise ValueError("No API key available.")

    return _make_request("GET", "/models", api_key)


# ---------------------------------------------------------------------------
# CLI Interface
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Moonshot Files API Client (stdlib only)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s upload README.md
  %(prog)s list
  %(prog)s get cnco1234567890
  %(prog)s delete cnco1234567890
  %(prog)s content cnco1234567890
  %(prog)s validate
        """,
    )
    subparsers = parser.add_subparsers(dest="command", help="API operation")

    # Upload
    upload_parser = subparsers.add_parser("upload", help="Upload a file")
    upload_parser.add_argument("file", help="Path to file to upload")
    upload_parser.add_argument(
        "--purpose", default="file-extract", help="File purpose (default: file-extract)"
    )

    # List
    list_parser = subparsers.add_parser("list", help="List uploaded files")
    list_parser.add_argument("--purpose", default=None, help="Filter by purpose")

    # Get
    get_parser = subparsers.add_parser("get", help="Get file metadata")
    get_parser.add_argument("file_id", help="Moonshot file ID")

    # Delete
    delete_parser = subparsers.add_parser("delete", help="Delete a file")
    delete_parser.add_argument("file_id", help="Moonshot file ID")

    # Content
    content_parser = subparsers.add_parser("content", help="Get file content")
    content_parser.add_argument("file_id", help="Moonshot file ID")

    # Validate
    subparsers.add_parser("validate", help="Validate API key")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    try:
        if args.command == "upload":
            result = upload_file(args.file, args.purpose)
            print(json.dumps(result, indent=2))

        elif args.command == "list":
            files = list_files(args.purpose)
            print(json.dumps(files, indent=2))

        elif args.command == "get":
            result = get_file(args.file_id)
            print(json.dumps(result, indent=2))

        elif args.command == "delete":
            success = delete_file(args.file_id)
            print(json.dumps({"deleted": success}))

        elif args.command == "content":
            content = get_file_content(args.file_id)
            print(content)

        elif args.command == "validate":
            result = validate_key()
            models = result.get("data", [])
            print(f"API key is valid. {len(models)} model(s) available:")
            for m in models:
                print(f"  - {m.get('id', 'unknown')}")

    except APIError as e:
        print(f"API Error (HTTP {e.code}): {e.reason}", file=sys.stderr)
        if e.body:
            try:
                detail = json.loads(e.body)
                print(f"  Detail: {detail.get('error', {}).get('message', e.body)}", file=sys.stderr)
            except json.JSONDecodeError:
                print(f"  Body: {e.body[:200]}", file=sys.stderr)
        sys.exit(1)

    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

