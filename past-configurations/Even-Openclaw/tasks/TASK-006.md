## TASK-006: Implement minimal WebSocket bridge in Flutter

- **Status**: DONE
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Type**: Create
- **Depends on**: TASK-002
- **Blocks**: TASK-007

### Context

The Flutter glasses app (EvenDemoApp) needs a WebSocket bridge to communicate
with the OpenClaw gateway instead of calling the DeepSeek API directly.

### Objective

Replace the direct `ApiDeepSeekService` HTTP calls with a WebSocket connection
to the OpenClaw gateway, enabling real-time bidirectional communication between
the glasses app and the AI agent hub.

### What was implemented (per Cursor's report)

1. **Added dependency**: `web_socket_channel: ^3.0.1` in `pubspec.yaml`
2. **New file**: `lib/services/openclaw_bridge.dart`
   - Singleton pattern matching codebase convention (`OpenClawBridgeService.get`)
   - WebSocket connection to `ws://localhost:18789`
   - OpenClaw protocol handshake (connect request/response)
   - Request/response matching with message IDs
   - Exponential backoff reconnection (max 3 attempts)
   - Connection status stream for UI monitoring
   - 30-second message response timeout
3. **Modified**: `lib/services/evenai.dart`
   - Replaced `ApiDeepSeekService().sendChatRequest()` with `OpenClawBridgeService.get.sendMessage()`
   - Added error handling (shows error on glasses on failure)
4. **Modified**: `lib/main.dart`
   - Bridge initialization in `main()` (non-blocking)

### Acceptance Criteria

- [x] WebSocket connection to OpenClaw gateway
- [x] Voice input routed through bridge instead of direct API
- [x] Error handling for connection failures
- [x] Flutter analyze passes
- [x] Dependencies install cleanly

### Handoff Notes

**Status**: DONE (2026-02-08) — APPROVED by Claude Code

**Implementation Summary** (from code review at commit `43fd112`):
- **`lib/services/openclaw_bridge.dart`** (266 lines):
  - Clean singleton pattern matching `EvenAI.get` / `BleManager.get()` convention
  - `_pendingRequests` map with `Completer<String?>` for request/response correlation
  - Exponential backoff: 1s, 2s, 4s (bit-shift `1 << (_reconnectAttempts - 1)`)
  - 30-second timeout per request with proper cleanup
  - Gateway handshake protocol with `minProtocol: 3, maxProtocol: 3` matching OpenClaw gateway spec
  - `_handleMessage` correctly routes: `res` with ID → complete pending request, `event` → log, `res` without ID → connect response
  - `connectionStatus` broadcast stream for UI monitoring
  - `disconnect()` properly cleans up all pending requests
- **`lib/services/evenai.dart`** — Minimal, correct change at lines 148-156: replaced `ApiDeepSeekService().sendChatRequest(combinedText)` with `OpenClawBridgeService.get().sendMessage(combinedText)`, null check for connection errors
- **`lib/main.dart`** — Bridge init added after `BleManager.get()`, non-blocking `.then()` pattern
- **`pubspec.yaml`** — Added `web_socket_channel: ^3.0.1`

**Code Review (Claude Code)**: ✅ APPROVED — Clean, minimal, follows codebase patterns

**Files Modified**:
- `glasses-apps/EvenDemoApp/lib/services/openclaw_bridge.dart` — complete WebSocket bridge implementation
- `glasses-apps/EvenDemoApp/lib/services/evenai.dart` — integration point
- `glasses-apps/EvenDemoApp/lib/main.dart` — bridge initialization
- `glasses-apps/EvenDemoApp/pubspec.yaml` — dependency added

**Note**: Submodule fork issue resolved — EvenDemoApp now points to `AgentArtel/EvenDemoApp` fork
