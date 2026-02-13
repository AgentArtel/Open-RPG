## TASK-P4-04: Build real-time streaming chat via gateway API

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Type**: Modify
- **Depends on**: TASK-P4-01, TASK-P4-02
- **Blocks**: none

### Context

The Chat page currently sends messages via the eveng1 channel WebSocket (port 3377). This works but:
1. It goes through the channel plugin (indirect)
2. No streaming — waits for the full response
3. Can only talk to the agent assigned to the eveng1 channel
4. Opens a new WebSocket per message (one-off)

The OpenClaw gateway at `:18789` offers `chat.send` which:
1. Sends directly to any agent by ID
2. Streams response deltas as `chat` events
3. Uses the persistent WebSocket connection
4. Supports session management (chat history)

### Objective

The Chat page talks directly to OpenClaw agents via the gateway API. Messages stream in real-time (word by word). Users can select any agent to chat with (not just the eveng1-assigned one). Chat history persists.

### Specifications

#### 1. New Chat Hook: `use-openclaw-chat.ts`

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentId?: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface UseChatOptions {
  agentId: string;
  sessionKey?: string; // defaults to `agent:{agentId}:main`
}

function useOpenClawChat(options: UseChatOptions) {
  // Returns:
  return {
    messages: ChatMessage[];       // Chat history
    sendMessage: (text: string) => void;  // Send and stream
    isStreaming: boolean;          // Currently receiving response
    abort: () => void;            // Cancel current response
    clearHistory: () => void;     // Reset session
    loadHistory: () => void;      // Load from gateway
  };
}
```

#### 2. Streaming Implementation

When `sendMessage(text)` is called:

```typescript
// 1. Add user message to local state immediately
setMessages(prev => [...prev, { role: 'user', content: text, ... }]);

// 2. Add empty assistant message (will be filled by stream)
const assistantMsg = { id: genId(), role: 'assistant', content: '', isStreaming: true };
setMessages(prev => [...prev, assistantMsg]);

// 3. Call gateway chat.send with streaming
const sessionKey = `agent:${agentId}:main`;
gatewayApi.chat.send({
  sessionKey,
  message: text,
  agentId,
});

// 4. Listen for 'chat' events that match our sessionKey
onGatewayEvent('chat', (event) => {
  if (event.sessionKey !== sessionKey) return;

  if (event.state === 'delta') {
    // Append text to the streaming message
    setMessages(prev => prev.map(m =>
      m.id === assistantMsg.id
        ? { ...m, content: m.content + event.message.text }
        : m
    ));
  }

  if (event.state === 'final') {
    // Mark message as complete
    setMessages(prev => prev.map(m =>
      m.id === assistantMsg.id
        ? { ...m, isStreaming: false }
        : m
    ));
  }

  if (event.state === 'error') {
    // Show error in message
    setMessages(prev => prev.map(m =>
      m.id === assistantMsg.id
        ? { ...m, content: `Error: ${event.message.text}`, isStreaming: false }
        : m
    ));
  }
});
```

#### 3. Update Chat Page

In `Chat.tsx`:

- Replace `useEveng1Send()` with `useOpenClawChat()`
- Keep the "Chat with" selector — use the selected agent's `openclaw_agent_id`
- Show streaming indicator (typing dots → streaming text)
- Add "Stop generating" button that calls `abort()`
- Add "Load history" on mount to show previous conversations
- Show agent name in each message bubble

**"Chat with" dropdown behavior:**
- "Default" → use the agent with `channel_id = 'eveng1'`
- Specific agent → use that agent's `openclaw_agent_id`
- Workforce → use the workforce's default agent (for now)

**Fallback:** If the selected agent has no `openclaw_agent_id` (not synced to OpenClaw), show a warning: "This agent is not connected to OpenClaw. Create it in OpenClaw first."

#### 4. Session Key Format

OpenClaw session keys follow: `{channel}:{accountId}:{agentId}:{chatType}:{peerId}`

For dashboard chat: `dashboard:{userId}:{agentId}:dm:main`

This keeps dashboard sessions separate from eveng1 (glasses) sessions.

#### 5. Chat History

On page load or agent switch:
```typescript
const history = await gatewayApi.chat.history({ sessionKey, limit: 50 });
setMessages(history.map(toLocalMessage));
```

#### 6. Keep Eveng1 Channel

The eveng1 channel still works for glasses → agent communication. This task adds a parallel direct path from dashboard → agent. Both paths work simultaneously.

### Acceptance Criteria

- [ ] Chat page sends messages via gateway `chat.send` (not eveng1 WebSocket)
- [ ] Responses stream in real-time (word by word in the UI)
- [ ] "Chat with" selector picks the right OpenClaw agent ID
- [ ] Chat history loads from gateway on page mount
- [ ] "Stop generating" aborts the current response
- [ ] Multiple agents can be chatted with by switching the selector
- [ ] Graceful fallback if agent isn't in OpenClaw yet
- [ ] eveng1 channel still works independently (glasses path)
- [ ] Build passes

### Do NOT

- Remove `use-eveng1-channel.ts` (still needed for glasses communication)
- Modify the OpenClaw gateway codebase
- Change the Supabase schema
- Modify `src/components/ui/`

### Handoff Notes

_Updated by Cursor when complete._
