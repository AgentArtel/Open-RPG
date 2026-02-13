## TASK-016: Agent Conversation Log GUI

- **Status**: DONE
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 5 (Polish)
- **Sprint**: 4 (Polish + Deploy)
- **Type**: Create + Modify
- **Depends on**: TASK-008 (AgentRunner stores messages in memory), TASK-012 (Supabase memory)
- **Blocks**: Nothing

### Context

Players interact with AI NPCs but have no way to review past conversations. Once the
modal dialog closes, the text is gone. The agent memory system (`IAgentMemory`) already
stores every message exchanged — we just need a GUI to expose it.

The builder dashboard (`main/gui/builder-dashboard.vue`) proves the pattern: a Vue
component registered in `main/gui/`, opened via hotkey, with RPGJS injections for
scene/socket/close/interaction. The conversation log follows the same pattern but
uses `blockPlayerInput: false` so the player can move while reading.

### Objective

A toggleable side panel GUI that displays conversation history between the player and
AI NPCs. Open/close via hotkey ('L'). Shows messages grouped by NPC with timestamps,
scrollable, non-blocking (player can move while it's open).

### Specifications

**Create:** `main/gui/conversation-log.vue` (~150-200 lines)

**Modify:**
- `rpg.toml` — Add keybind for conversation log (`l` key)
- `main/player.ts` — Add input handler for 'conversation-log'
- `src/agents/core/AgentManager.ts` — Add `getConversationsForPlayer()` method

**Keybind (`rpg.toml`):**

```toml
[inputs.conversation-log]
    name = "conversation-log"
    bind = "l"
```

**Input Handler (`main/player.ts`):**

Add alongside the existing `builder-dashboard` input handler in `onInput()`:

```typescript
if (input === 'conversation-log') {
  const conversations = agentManager.getConversationsForPlayer(player.id)
  const gui = player.gui('conversation-log')
  gui.open(
    { conversations },
    { blockPlayerInput: false }  // NON-BLOCKING — player can move
  )
}
```

**Key difference from builder-dashboard**: The builder uses `blockPlayerInput: true`
because placing NPCs requires pointer interaction. The conversation log is read-only
so it should NOT block player input.

**GUI API reference** (from research):

```typescript
// Open with options (GuiManager.ts lines 16-37):
gui.open(data, {
  waitingAction: false,     // false = non-blocking (default)
  blockPlayerInput: false   // false = player can still move (default)
})

// Close from client side:
this.rpgGuiClose('conversation-log')  // injection available in Vue component
```

**Conversation Log Component (`main/gui/conversation-log.vue`):**

```vue
<template>
  <div class="conv-log-panel">
    <div class="conv-log-header">
      <h3>Conversation Log</h3>
      <button @click="close" class="close-btn">X</button>
    </div>

    <!-- NPC filter tabs -->
    <div class="conv-log-tabs">
      <button
        v-for="npc in npcList"
        :key="npc.agentId"
        @click="selectedNpc = npc.agentId"
        :class="{ active: selectedNpc === npc.agentId }"
        class="tab-btn"
      >{{ npc.npcName }}</button>
      <button
        @click="selectedNpc = null"
        :class="{ active: selectedNpc === null }"
        class="tab-btn"
      >All</button>
    </div>

    <!-- Messages -->
    <div class="conv-log-messages" ref="messageContainer">
      <div v-if="filteredMessages.length === 0" class="empty-state">
        No conversations yet. Talk to an NPC!
      </div>
      <div
        v-for="msg in filteredMessages"
        :key="msg.id"
        class="message"
        :class="msg.role"
      >
        <div class="message-header">
          <span class="message-sender">{{ msg.senderName }}</span>
          <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
        </div>
        <p class="message-text">{{ msg.content }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'conversation-log',
  inject: ['rpgGuiClose', 'rpgKeypress'],
  props: ['conversations'],
  data() {
    return {
      selectedNpc: null,
      keypressSub: null,
    }
  },
  computed: {
    npcList() {
      return (this.conversations || []).map(c => ({
        agentId: c.agentId,
        npcName: c.npcName
      }))
    },
    filteredMessages() {
      const convs = this.conversations || []
      const filtered = this.selectedNpc
        ? convs.filter(c => c.agentId === this.selectedNpc)
        : convs

      // Flatten all messages with NPC attribution, newest first
      return filtered
        .flatMap(c => c.messages.map(m => ({
          ...m,
          id: `${c.agentId}-${m.timestamp}`,
          senderName: m.role === 'assistant' ? c.npcName : 'You',
          npcName: c.npcName
        })))
        .sort((a, b) => b.timestamp - a.timestamp)
    }
  },
  mounted() {
    // Listen for 'L' key to toggle closed
    this.keypressSub = this.rpgKeypress.subscribe(({ inputName }) => {
      if (inputName === 'conversation-log') {
        this.close()
      }
    })
  },
  beforeUnmount() {
    if (this.keypressSub?.unsubscribe) {
      this.keypressSub.unsubscribe()
    }
  },
  methods: {
    close() {
      this.rpgGuiClose('conversation-log')
    },
    formatTime(timestamp) {
      const d = new Date(timestamp)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }
}
</script>

<style scoped>
.conv-log-panel {
  position: fixed;
  left: 0;
  top: 0;
  width: 360px;
  height: 100vh;
  background: rgba(15, 15, 25, 0.95);
  color: white;
  display: flex;
  flex-direction: column;
  z-index: 200;
  font-family: sans-serif;
  border-right: 2px solid rgba(100, 150, 255, 0.3);
}
.conv-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.conv-log-header h3 { margin: 0; font-size: 16px; }
.close-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.conv-log-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.tab-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #ccc;
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 12px;
}
.tab-btn.active {
  background: rgba(100, 150, 255, 0.3);
  color: white;
}
.conv-log-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
.empty-state {
  text-align: center;
  color: #666;
  padding: 40px 0;
  font-size: 14px;
}
.message {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
}
.message.assistant {
  background: rgba(100, 150, 255, 0.15);
}
.message.user {
  background: rgba(255, 255, 255, 0.05);
}
.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.message-sender {
  font-weight: bold;
  font-size: 12px;
  color: #aaddff;
}
.message-time {
  font-size: 11px;
  color: #666;
}
.message-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
}
</style>
```

**AgentManager Method (`src/agents/core/AgentManager.ts`):**

```typescript
interface ConversationSnapshot {
  agentId: string
  npcName: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    metadata?: Record<string, unknown>
  }>
}

getConversationsForPlayer(playerId: string): ConversationSnapshot[] {
  const result: ConversationSnapshot[] = []
  for (const [agentId, agent] of this.agents) {
    const messages = agent.memory.getAllMessages()
    // Filter to user messages from this player + assistant responses
    // user messages have metadata.playerId
    // assistant messages follow user messages (assume interleaved)
    const relevant = messages.filter(m =>
      (m.role === 'user' && m.metadata?.playerId === playerId) ||
      m.role === 'assistant'
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

**Note on `getAllMessages()`**: This method must exist on `IAgentMemory`. Check if it's
already defined. If not, add it:

```typescript
// In src/agents/memory/types.ts (IAgentMemory interface):
getAllMessages(): ReadonlyArray<StoredMessage>
```

Both `InMemoryAgentMemory` and `SupabaseAgentMemory` need to implement this.

**Available Vue injections** (confirmed from research):

| Injection | Purpose | Used here? |
|-----------|---------|------------|
| `rpgGuiClose(name, data?)` | Close this GUI, optionally send data to server | Yes — close button + L toggle |
| `rpgGuiInteraction(guiId, name, data)` | Send event to server | No (read-only panel) |
| `rpgScene()` | Get current scene | No |
| `rpgKeypress` | Observable of keyboard input | Yes — L key toggle |
| `rpgCurrentPlayer` | Observable of player changes | No |
| `rpgSocket()` | Socket.IO instance | No |
| `rpgEngine` | Client engine instance | No |

### Acceptance Criteria

- [ ] `main/gui/conversation-log.vue` renders a side panel with conversation history
- [ ] Panel toggles open/close via 'L' key
- [ ] Pressing 'L' while panel is open closes it (toggle behavior)
- [ ] Player can move while panel is open (`blockPlayerInput: false`)
- [ ] Messages grouped by NPC with filter tabs at top
- [ ] Messages show role (NPC name vs "You"), content, and timestamp
- [ ] Messages sorted newest-first
- [ ] Empty state displayed when no conversations exist
- [ ] Panel scrolls for long conversation histories
- [ ] `rpg.toml` has the `conversation-log` keybind (`l`)
- [ ] `AgentManager.getConversationsForPlayer()` method implemented
- [ ] Only `user` and `assistant` role messages shown (no system/tool)
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Add a chat input box or free-text reply — conversation happens via action key on NPCs
- Persist conversation log state client-side — data comes from server memory each time
- Show system/tool messages — only show `user` and `assistant` role messages
- Add search or filtering beyond NPC tabs (keep it simple)
- Modify the memory system — read from existing `IAgentMemory.getAllMessages()`
- Add WebSocket subscriptions for real-time updates — refresh data on open is sufficient
- Use `blockPlayerInput: true` — this panel is non-blocking

### Reference

- Builder dashboard (proven Vue GUI pattern): `main/gui/builder-dashboard.vue`
- Builder input handler: `main/player.ts` lines 96-178
- GUI open/close API: `docs/rpgjs-reference/packages/server/src/Gui/Gui.ts` lines 16-37
- Available injections: `docs/rpgjs-reference/packages/client/src/Gui/Gui.ts` lines 82-367
- Agent memory interface: `src/agents/memory/types.ts`
- AgentManager: `src/agents/core/AgentManager.ts`
- Plugin idea doc: `.ai/idea/plugins/agent-conversation-log.md`
- rpg.toml (current inputs): `rpg.toml` lines 11-13

### Handoff Notes

- Implemented: AgentRunner stores user message with `metadata.playerId` when `event.player` exists; AgentManager `getConversationsForPlayer()` + `ConversationSnapshot`; `main/gui/conversation-log.vue` (L key, tabs, blockPlayerInput: false); rpg.toml keybind; player.ts onInput. Build passes. Conversation data persisted to Supabase when configured. Product decision: in-game log panel not required for MVP; data will be streamed to external dashboard. Panel (L key) remains available if needed.
