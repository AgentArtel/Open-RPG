## TASK-007: Build barebones eveng1 channel adapter (receive text, send text)

- **Status**: DONE
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Type**: Implement
- **Depends on**: TASK-003a, TASK-006
- **Blocks**: TASK-008

### Context

TASK-003a completed the plugin skeleton with placeholder implementations. TASK-006 implemented the Flutter WebSocket bridge that connects to the OpenClaw gateway. Now we need to implement the server-side channel adapter that:

1. **Receives text** from the Flutter app (inbound: user → agent)
2. **Sends text** to the Flutter app (outbound: agent → user)

The Flutter app (TASK-006) connects to the OpenClaw gateway WebSocket at `ws://localhost:18789` and sends messages using the gateway's `send` method. However, for the eveng1 channel to work properly, we need a dedicated WebSocket server that the Flutter app can connect to directly, or we need to handle messages routed through the gateway.

### Required Reading (read these FIRST!)

1. **Nostr channel example** — shows how to handle inbound messages:
   - `ai-agent-backend/openclaw/extensions/nostr/src/channel.ts` (lines 226-240)
   - Uses `runtime.channel.reply.handleInboundMessage()` to forward user messages to agents
   - The `reply` callback sends agent responses back to the channel

2. **Gateway send handler** — shows how outbound messages are routed:
   - `ai-agent-backend/openclaw/src/gateway/server-methods/send.ts` (lines 45-364)
   - Routes to channel plugin's `outbound.sendText()` method
   - Uses `deliverOutboundPayloads()` which calls the channel adapter

3. **Voice-call WebSocket server** — example of channel-specific WebSocket server:
   - `ai-agent-backend/openclaw/extensions/voice-call/src/webhook.ts` (lines 159-200)
   - Shows HTTP server with WebSocket upgrade handling
   - Uses `ws` package for WebSocket connections

4. **DisplayFormatter** — already implemented in TASK-003:
   - `ai-agent-backend/extensions/eveng1/display-formatter.ts`
   - Use `formatForDisplay(text)` to paginate agent responses for G1 display constraints

### Objective

Implement the barebones WebSocket server and message routing so that:
- Flutter app can send voice-transcribed text → OpenClaw agents receive it
- OpenClaw agents can send responses → Flutter app receives them (formatted for G1 display)

### Architecture Decision

**Option A (Recommended for TASK-007):** Create a dedicated WebSocket server in `gateway.startAccount` that listens on a separate port (e.g., `3377` or configurable via `config-schema.ts`). The Flutter app connects to this channel-specific WebSocket instead of (or in addition to) the main gateway WebSocket.

**Option B (Alternative):** Use the gateway's `send` method for outbound, but we still need a way to receive inbound messages. This would require the Flutter app to use a different gateway method or the channel plugin to register a custom gateway method.

**For TASK-007, implement Option A** — it's cleaner and matches the project vision ("Exposes a local HTTP/WebSocket endpoint that the modified Even app connects to").

### Implementation Steps

1. **Create WebSocket server in `gateway.startAccount`**:
   - Import `ws` package (already in `package.json`)
   - Create `WebSocketServer` instance
   - Listen on port from config (default: `3377` or use `config.port` if different from gateway port)
   - Store the server instance and connected clients in module-level variables

2. **Handle inbound messages** (Flutter app → OpenClaw):
   - On WebSocket `message` event, parse JSON
   - Extract `text` field (user's voice-transcribed input)
   - Call `runtime.channel.reply.handleInboundMessage()` with:
     - `channel: "eveng1"`
     - `accountId: "default"`
     - `senderId: "glasses-user"` (or derive from connection)
     - `chatType: "direct"`
     - `chatId: "default"` (single-user channel)
     - `text: <parsed text>`
     - `reply: async (responseText: string) => { /* send to WebSocket */ }`

3. **Handle outbound messages** (OpenClaw → Flutter app):
   - In `outbound.sendText()`, get the connected WebSocket client
   - Use `DisplayFormatter` to paginate the text
   - Send paginated pages to the WebSocket client
   - Return `{ channel: "eveng1", messageId: <generated id> }`

4. **Handle connection lifecycle**:
   - On `connection` event, store client reference
   - On `close` event, remove client reference
   - In `gateway.stopAccount`, close WebSocket server and all connections

5. **Error handling**:
   - Log connection errors
   - Handle malformed JSON messages gracefully
   - Return error responses to Flutter app when needed

### Files to Modify

1. **`eveng1-channel.ts`**:
   - Implement `gateway.startAccount()` — create WebSocket server
   - Implement `gateway.stopAccount()` — close WebSocket server
   - Implement `outbound.sendText()` — send formatted text to WebSocket client
   - Add module-level variables for server and client tracking

2. **`runtime.ts`** (already exists):
   - No changes needed (already provides `getEvenG1Runtime()`)

3. **`display-formatter.ts`** (already exists):
   - No changes needed (use existing `DisplayFormatter` class)

### Message Protocol

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
  "text": "agent response text",
  "pages": ["page 1", "page 2", ...],
  "messageId": "msg-1234567890"
}
```

**Error Response:**
```json
{
  "type": "error",
  "error": "error message",
  "messageId": "msg-1234567890"
}
```

### Configuration

Use `config-schema.ts` for WebSocket server settings:
- `host: "127.0.0.1"` (default, localhost only for security)
- `port: 3377` (or separate from gateway port 18789)
- Or reuse `config.port` if it's meant to be the channel port

### Acceptance Criteria

- [ ] WebSocket server starts in `gateway.startAccount()` on configured port
- [ ] Flutter app can connect to the WebSocket server
- [ ] Inbound messages from Flutter are forwarded to OpenClaw via `handleInboundMessage()`
- [ ] Outbound messages from OpenClaw are sent to Flutter via WebSocket
- [ ] Text is paginated using `DisplayFormatter` before sending to Flutter
- [ ] WebSocket server closes cleanly in `gateway.stopAccount()`
- [ ] Connection errors are logged appropriately
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] No `any` types used

### Testing Notes

Since the Flutter app (TASK-006) currently connects to the gateway WebSocket, you may need to:
1. Update the Flutter app to connect to the channel-specific WebSocket (port 3377), OR
2. Test the channel WebSocket separately using a simple test client

For TASK-007, focus on the server-side implementation. TASK-008 will wire up the full pipeline.

### Do NOT

- Modify `display-formatter.ts` or `gesture-mapper.ts` (approved as-is)
- Modify `config-schema.ts` (Claude Code's domain) — read values only
- Implement gesture handling (TASK-008)
- Implement multi-agent routing (future task)
- Modify files in `ai-agent-backend/openclaw/` (read-only submodule)

### Handoff Notes

**Status**: DONE (2026-02-08) — APPROVED by Claude Code

**Implementation Summary**:
- WebSocket server on port 3377 via `ws` package — correct separation from gateway port 18789
- Single-client model — `connectedClient` variable, graceful replacement if second client connects
- Inbound pipeline uses real OpenClaw runtime APIs:
  - `runtime.channel.routing.resolveAgentRoute()` — resolves which agent handles the message
  - `runtime.channel.reply.formatAgentEnvelope()` — formats the message body
  - `runtime.channel.reply.finalizeInboundContext()` — builds full context payload
  - `runtime.channel.session.recordInboundSession()` — creates session for conversation continuity
  - `runtime.channel.reply.createReplyDispatcherWithTyping()` — handles agent typing + response
  - `runtime.channel.reply.dispatchReplyFromConfig()` — triggers the full reply pipeline
- DisplayFormatter integration — paginated output for G1 display constraints
- Error handling — JSON parse errors, send failures, connection errors all handled with try/catch and error responses
- Clean shutdown — `stopAccount` closes client and server with callback
- Port fallback logic: `channelConfig.port === 18789 ? 3377 : (channelConfig.port ?? 3377)` — smart guard against accidentally binding to gateway port
- Uses `ctx.log?.info/warn/error/debug` throughout — good use of OpenClaw's logging system

**Files Modified**:
- `ai-agent-backend/extensions/eveng1/eveng1-channel.ts` — complete WebSocket server implementation (309 lines)

**Code Review (Claude Code)**: ✅ APPROVED — Correctly read Nostr channel and voice-call examples, proper use of OpenClaw runtime APIs

**Ready for**: TASK-008 integration

