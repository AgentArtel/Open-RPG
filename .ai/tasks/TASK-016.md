## TASK-016: Agent Conversation Log GUI

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 5 (Polish)
- **Type**: Create + Modify
- **Depends on**: TASK-008 (AgentRunner stores messages in memory), TASK-012 (Supabase memory)
- **Blocks**: Nothing

### Context

Players interact with AI NPCs but have no way to review past conversations. Once the
modal dialog closes, the text is gone. The agent memory system (`IAgentMemory`) already
stores every message exchanged — we just need a GUI to expose it.

The builder dashboard (`main/gui/builder-dashboard.vue`) proves the pattern: a Vue
component registered in `main/gui/`, opened via hotkey, with Tailwind styling and RPGJS
injections. The conversation log follows the same pattern.

### Objective

A toggleable side panel GUI that displays conversation history between the player and
AI NPCs. Open/close via hotkey ('L'). Shows messages grouped by NPC with timestamps,
scrollable, non-blocking (player can move while it's open).

### Specifications

**Create files:**
- `main/gui/conversation-log.vue` — Conversation log panel (~150-200 lines)

**Modify files:**
- `rpg.toml` — Add keybind for conversation log (`l` key)
- `src/agents/core/AgentManager.ts` — Add method to retrieve conversation data for a player

**Keybind (`rpg.toml`):**

```toml
[inputs.conversation-log]
    name = "conversation-log"
    bind = "l"
```

**Conversation Log Component (`main/gui/conversation-log.vue`):**

Layout:
```
┌─────────────────────────────────┐
│  Conversation Log          [X]  │
├─────────────────────────────────┤
│  [Elder Theron] [Guard] [All]   │  ← NPC filter tabs
├─────────────────────────────────┤
│  Elder Theron          10:32 AM │
│  "Welcome, traveler."           │
│                                 │
│  You                   10:32 AM │
│  (pressed action key)           │
│                                 │
│  Elder Theron          10:32 AM │
│  "The forest grows dark..."     │
│                                 │
│  ─── 2 minutes ago ───          │
│                                 │
│  Guard                 10:30 AM │
│  "Halt! State your business."   │
│                                 │
└─────────────────────────────────┘
```

Key behaviors:
- Opens/closes via 'L' key (toggle)
- Non-blocking — player can move while panel is open
- Fixed panel on the left side of the screen (~360px wide)
- NPC filter tabs at top — click to filter by specific NPC, "All" shows everything
- Messages sorted newest-first (most recent at top)
- Each message shows: NPC name or "You", timestamp, message text
- Role styling: `assistant` messages styled differently from `user` messages
- Auto-scrolls to top (latest) when new messages arrive
- Shows empty state "No conversations yet" when no messages exist

**Data Flow:**

1. Player presses 'L' → server opens `conversation-log` GUI
2. Server collects conversation data from `AgentManager`:
   ```typescript
   // In player.ts or server.ts input handler:
   const conversations = agentManager.getConversationsForPlayer(player.id)
   player.gui('conversation-log').open({ conversations })
   ```
3. Vue component receives `conversations` as prop and renders

**AgentManager Method (`src/agents/core/AgentManager.ts`):**

```typescript
getConversationsForPlayer(playerId: string): ConversationSnapshot[] {
  const result: ConversationSnapshot[] = []
  for (const [agentId, agent] of this.agents) {
    const messages = agent.memory.getAllMessages()
    // Filter to messages involving this player (check metadata.playerId)
    const relevant = messages.filter(m =>
      m.metadata?.playerId === playerId || m.role === 'assistant'
    )
    if (relevant.length > 0) {
      result.push({
        agentId,
        npcName: agent.config.name,
        messages: relevant.slice(-50)  // Last 50 messages max
      })
    }
  }
  return result
}
```

**ConversationSnapshot type:**

```typescript
interface ConversationSnapshot {
  agentId: string
  npcName: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool'
    content: string
    timestamp: number
    metadata?: Record<string, unknown>
  }>
}
```

**Input Handler (in `main/player.ts` or `main/server.ts`):**

```typescript
// In onInput or via custom action handler:
if (data.input === 'conversation-log') {
  const conversations = agentManager.getConversationsForPlayer(player.id)
  player.gui('conversation-log').open({ conversations })
}
```

### Acceptance Criteria

- [ ] `main/gui/conversation-log.vue` renders a side panel with conversation history
- [ ] Panel toggles open/close via 'L' key
- [ ] Player can move while panel is open (non-blocking)
- [ ] Messages are grouped by NPC with filter tabs
- [ ] Messages show role (NPC name vs "You"), content, and timestamp
- [ ] Empty state displayed when no conversations exist
- [ ] Panel scrolls for long conversation histories
- [ ] `rpg.toml` has the `conversation-log` keybind
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Add a chat input box or free-text reply — conversation happens via action key on NPCs
- Persist conversation log state client-side — data comes from server memory each time
- Show system/tool messages — only show `user` and `assistant` role messages
- Add search or filtering beyond NPC tabs (keep it simple)
- Modify the memory system — read from existing `IAgentMemory.getAllMessages()`
- Add WebSocket subscriptions for real-time updates — refresh data on open is sufficient for MVP

### Reference

- Builder dashboard (Vue GUI pattern): `main/gui/builder-dashboard.vue`
- Agent memory interface: `src/agents/memory/types.ts`
- AgentManager: `src/agents/core/AgentManager.ts`
- Plugin idea doc: `.ai/idea/plugins/agent-conversation-log.md`
- RPGJS GUI API: `docs/rpgjs-guide.md` (Section 8)
- Player hooks: `main/player.ts`

### Handoff Notes

_(To be filled by implementer)_
