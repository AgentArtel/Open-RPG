## TASK-008: Wire up voice → STT → OpenClaw → G1 display pipeline

- **Status**: DONE
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Type**: Implement
- **Depends on**: TASK-006, TASK-007
- **Blocks**: None (completes Phase 1 proof of concept)

### Context

TASK-006 implemented the Flutter WebSocket bridge that connects to the OpenClaw gateway. TASK-007 implemented the channel-specific WebSocket server that handles messages directly. Now we need to wire up the complete end-to-end pipeline:

1. **Voice Input**: User speaks into Even G1 glasses → BLE audio capture
2. **Speech-to-Text**: Android STT transcribes voice → text string
3. **OpenClaw Processing**: Text sent to eveng1 channel → agent processes → response generated
4. **G1 Display**: Agent response paginated and sent to glasses via BLE

Currently, the Flutter app (`evenai.dart`) uses `OpenClawBridgeService` which connects to the gateway WebSocket (`ws://localhost:18789`). We need to update it to connect to the channel-specific WebSocket server (port `3377`) and handle the new message protocol from TASK-007.

### Required Reading (read these FIRST!)

1. **Current Flutter bridge implementation**:
   - `glasses-apps/EvenDemoApp/lib/services/openclaw_bridge.dart` — TASK-006 implementation
   - Currently connects to gateway WebSocket and uses `send` method
   - Needs to be updated to connect to channel WebSocket (port 3377)

2. **Voice → STT flow**:
   - `glasses-apps/EvenDemoApp/lib/services/evenai.dart` (lines 122-164)
   - `recordOverByOS()` handles recording end, gets STT text, calls `OpenClawBridgeService.sendMessage()`
   - Response is displayed via `startSendReply()` which uses `Proto.sendEvenAIData()`

3. **TASK-007 message protocol**:
   - Inbound: `{ type: "message", text: string }`
   - Outbound: `{ type: "response", text: string, pages: string[], messageId: string }`
   - Error: `{ type: "error", error: string, messageId?: string }`

4. **BLE text display**:
   - `glasses-apps/EvenDemoApp/lib/services/proto.dart` — `sendEvenAIData()` method
   - `glasses-apps/EvenDemoApp/lib/services/evenai.dart` — `startSendReply()` and pagination logic
   - G1 display constraints: 5 lines per screen, ~25 chars per line

### Objective

Update the Flutter app to:
1. Connect to the eveng1 channel WebSocket server (port 3377) instead of gateway
2. Send voice-transcribed text using the TASK-007 message protocol
3. Receive and handle paginated agent responses
4. Display responses on the G1 glasses using existing BLE protocol

### Implementation Steps

1. **Update `OpenClawBridgeService` to connect to channel WebSocket**:
   - Change `_wsUrl` from `ws://localhost:18789` to `ws://localhost:3377`
   - Remove gateway handshake (`_sendConnectRequest`) — channel WebSocket doesn't need it
   - Simplify connection logic (no protocol negotiation needed)

2. **Update message sending to use TASK-007 protocol**:
   - Replace gateway `send` method with direct JSON message:
     ```json
     {
       "type": "message",
       "text": "user's transcribed voice input"
     }
     ```
   - Remove request/response ID matching (channel handles it differently)

3. **Update message receiving to handle TASK-007 response format**:
   - Parse `{ type: "response", text: string, pages: string[], messageId: string }`
   - Extract `pages` array for pagination
   - Handle `{ type: "error", error: string }` for error cases
   - Return full text or pages to caller

4. **Update `evenai.dart` to handle paginated responses**:
   - Modify `recordOverByOS()` to receive paginated response
   - Use `pages` array from response instead of manually paginating
   - Pass pages to `startSendReply()` for display on glasses

5. **Preserve existing BLE display logic**:
   - Keep `Proto.sendEvenAIData()` calls
   - Keep `startSendReply()` pagination display logic
   - Ensure compatibility with existing G1 display constraints

### Files to Modify

1. **`glasses-apps/EvenDemoApp/lib/services/openclaw_bridge.dart`**:
   - Update `_wsUrl` to port 3377
   - Remove gateway handshake logic
   - Update `sendMessage()` to use TASK-007 message protocol
   - Update `_handleMessage()` to parse TASK-007 response format
   - Return paginated pages along with full text

2. **`glasses-apps/EvenDemoApp/lib/services/evenai.dart`**:
   - Update `recordOverByOS()` to handle paginated response from bridge
   - Use response pages for display instead of manual pagination
   - Ensure error handling for connection failures

### Message Protocol (TASK-007)

**Inbound (Flutter → Channel):**
```json
{
  "type": "message",
  "text": "user's transcribed voice input"
}
```

**Outbound (Channel → Flutter):**
```json
{
  "type": "response",
  "text": "full agent response text",
  "pages": ["page 1 text", "page 2 text", ...],
  "messageId": "msg-1234567890"
}
```

**Error (Channel → Flutter):**
```json
{
  "type": "error",
  "error": "error message",
  "messageId": "msg-1234567890"
}
```

### Configuration

- WebSocket URL: `ws://localhost:3377` (channel-specific server from TASK-007)
- For remote access (Tailscale/WireGuard), update URL to use server IP
- Consider making URL configurable via environment variable or app settings

### Acceptance Criteria

- [ ] Flutter app connects to channel WebSocket (port 3377) instead of gateway
- [ ] Voice input → STT → text sent to channel using TASK-007 protocol
- [ ] Agent responses received with paginated pages
- [ ] Responses displayed on G1 glasses using existing BLE protocol
- [ ] Error messages displayed on glasses when connection fails
- [ ] Pagination works correctly (5 lines per screen, ~25 chars per line)
- [ ] Existing BLE display logic preserved and functional
- [ ] Flutter app builds and runs without errors
- [ ] End-to-end test: voice command → agent response appears on glasses

### Testing Notes

1. **Local testing**:
   - Run OpenClaw gateway with eveng1 channel plugin
   - Run Flutter app on Galaxy S24
   - Connect Even G1 glasses via BLE
   - Test voice input → agent response flow

2. **Connection testing**:
   - Verify WebSocket connection to port 3377
   - Test reconnection logic if connection drops
   - Test error handling for malformed responses

3. **Display testing**:
   - Verify pagination works correctly
   - Test long responses (multiple pages)
   - Test short responses (single page)
   - Verify text fits G1 display constraints

### Do NOT

- Modify BLE protocol handling (preserve existing `Proto` methods)
- Modify STT implementation (use existing Android speech recognition)
- Modify OpenClaw channel plugin (TASK-007 is complete)
- Add new dependencies unless necessary
- Change existing pagination display logic (only update data source)

### Handoff Notes

**Status**: DONE (2026-02-08) — APPROVED by Claude Code

**Implementation Summary**:
- Removed gateway handshake logic (channel WS doesn't need protocol negotiation)
- Switched from `Map<String, Completer>` (multi-request) to single `_currentRequest` completer — simpler model matching channel's one-at-a-time design
- New `OpenClawResponse` class with `text`, `pages[]`, and `messageId`
- `sendMessage()` now sends TASK-007 protocol: `{ type: "message", text: ... }`
- `_handleMessage()` parses TASK-007 response format: `{ type: "response", text, pages, messageId }`
- URL now comes from `AppConfig.openClawWsUrl` — configurable per build mode (later reverted to localhost for simplicity)
- `recordOverByOS()` gets `OpenClawResponse`, extracts `answer` and `pages`
- `startSendReply(answer, pages: pages)` — passes pre-paginated pages
- `startSendReply()` signature: `Future startSendReply(String text, {List<String>? pages})` — optional named parameter, backward compatible
- If `pages` provided, uses them directly; otherwise falls back to manual `measureStringList()` pagination

**Files Modified**:
- `glasses-apps/EvenDemoApp/lib/services/openclaw_bridge.dart` — protocol update (257 lines)
- `glasses-apps/EvenDemoApp/lib/services/evenai.dart` — paginated response handling
- `glasses-apps/EvenDemoApp/lib/config/app_config.dart` — environment-based URL config (later reverted)

**Code Review (Claude Code)**: ✅ APPROVED — Clean protocol update, good separation between pre-paginated and fallback paths

**End-to-End Flow**: ✅ Complete
1. Voice input → BLE audio capture
2. Android STT → text transcription
3. Flutter app → channel WebSocket (TASK-007 protocol)
4. OpenClaw agent → processes and responds
5. Channel server → paginates with DisplayFormatter
6. Flutter app → receives paginated pages
7. G1 glasses → displays via BLE protocol

**Phase 1 Proof of Concept**: ✅ COMPLETE

