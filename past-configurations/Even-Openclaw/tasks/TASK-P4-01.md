## TASK-P4-01: Build OpenClaw Gateway API client hook

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Type**: Create
- **Depends on**: none
- **Blocks**: TASK-P4-02, TASK-P4-03, TASK-P4-04

### Context

The existing `use-gateway-connection.ts` connects to the OpenClaw gateway WebSocket at `:18789` but only performs `connect` + `health`. The gateway exposes a rich WebSocket API with agent CRUD, skill management, chat, and config — all via JSON-RPC-style `{ type: 'req', id, method, params }` messages.

We need a proper gateway API client that:
- Maintains a persistent WebSocket connection (already done)
- Supports request/response pattern with promise resolution
- Supports event streaming (for `chat.send` which streams deltas)
- Exposes typed methods for each gateway API endpoint

### Objective

A reusable `useGatewayApi()` hook that wraps the existing gateway connection and exposes typed async methods for all OpenClaw gateway API calls. Cursor can also refactor this as a service class + thin hook if preferred.

### Specifications

#### Core API Client

Build on top of the existing `use-gateway-connection.ts`. Either extend it or create a new `use-gateway-api.ts` that imports the connection.

**Request/Response Pattern:**
```typescript
// Send a request and wait for the matching response
async function callGateway<T = unknown>(method: string, params?: Record<string, any>): Promise<T> {
  // 1. Generate request ID
  // 2. Send { type: 'req', id, method, params }
  // 3. Wait for { type: 'res', id: <matching>, ok, payload } or { error }
  // 4. Return payload or throw error
  // 5. Timeout after 30s (configurable)
}
```

**Streaming Pattern (for chat):**
```typescript
// Send a request that returns streaming events
function callGatewayStreaming(
  method: string,
  params: Record<string, any>,
  onEvent: (event: ChatStreamEvent) => void,
): { abort: () => void; done: Promise<void> }
```

#### Methods to Expose

**Agent Management:**
```typescript
// List all OpenClaw agents
agents.list(): Promise<OpenClawAgent[]>

// Create agent in OpenClaw
agents.create(params: { name: string; workspace?: string; emoji?: string }): Promise<OpenClawAgent>

// Update agent
agents.update(params: { agentId: string; name?: string; model?: string }): Promise<void>

// Delete agent
agents.delete(params: { agentId: string; deleteFiles?: boolean }): Promise<void>

// Read agent file (SKILL.md, SOUL.md, etc)
agents.files.get(params: { agentId: string; name: string }): Promise<{ content: string }>

// Write agent file
agents.files.set(params: { agentId: string; name: string; content: string }): Promise<void>
```

**Chat:**
```typescript
// Send message and stream response
chat.send(params: {
  sessionKey: string;
  message: string;
  agentId?: string;
  thinking?: string;
  timeout?: number;
}): StreamingResult<ChatEvent>

// Get chat history
chat.history(params: { sessionKey: string; limit?: number }): Promise<ChatMessage[]>

// Abort running chat
chat.abort(params: { sessionKey: string }): Promise<void>
```

**Skills:**
```typescript
// Get skill status for an agent
skills.status(params: { agentId?: string }): Promise<SkillStatus[]>

// Install a skill
skills.install(params: { name: string; installId?: string }): Promise<void>

// Configure skill
skills.update(params: { skillKey: string; enabled?: boolean; apiKey?: string }): Promise<void>
```

**Config:**
```typescript
// Get current config (redacted)
config.get(): Promise<{ config: OpenClawConfig; hash: string }>

// Patch config (merge)
config.patch(params: { config: Partial<OpenClawConfig>; baseHash: string }): Promise<void>
```

**Other:**
```typescript
health(): Promise<HealthStatus>
status(): Promise<SystemStatus>
models.list(): Promise<Model[]>
sessions.list(params?: { agentId?: string }): Promise<Session[]>
```

#### Event Handling

The gateway sends events (type: 'event') that aren't responses to requests:
- `tick` — heartbeat (already handled)
- `chat` — streaming chat response chunks: `{ runId, sessionKey, seq, state: 'delta'|'final'|'error', message }`
- `agent.status` — agent state changes

Subscribe to events:
```typescript
function onGatewayEvent(event: string, callback: (payload: any) => void): () => void;
```

#### Auth Scopes

The `connect` request currently asks for `['operator.read', 'operator.write']`. To use agent CRUD and skill management, upgrade to:
```typescript
scopes: ['operator.read', 'operator.write', 'operator.admin']
```

### Acceptance Criteria

- [ ] `callGateway()` sends request and resolves/rejects with typed response
- [ ] `callGatewayStreaming()` handles streaming chat events
- [ ] `agents.list()` returns list of OpenClaw agents
- [ ] `chat.send()` sends a message and streams back response events
- [ ] Connect request includes `operator.admin` scope
- [ ] All methods are exposed from the hook
- [ ] TypeScript types for all request/response shapes
- [ ] Build passes (`npm run build`, `npx tsc --noEmit`)

### Do NOT

- Remove the existing `use-gateway-connection.ts` — extend or wrap it
- Modify the eveng1 channel plugin
- Touch Supabase hooks or schema
- Add new npm dependencies (use native WebSocket)

### Handoff Notes

_Updated by Cursor when complete._
