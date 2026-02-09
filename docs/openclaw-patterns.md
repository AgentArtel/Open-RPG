# OpenClaw Patterns — Extraction Guide for Game NPCs

> Extracted from OpenClaw v2026.2.9 source at `docs/openclaw-reference/`.
> We extract patterns only — OpenClaw is NOT imported as a dependency.

## Why Extract, Not Import

OpenClaw is 175K+ lines with dependencies on Telegram, Discord, WhatsApp SDKs,
Docker sandboxing, OAuth flows, and more. Importing it would:
- Bloat the game server with unused messaging platform code
- Create build conflicts with RPGJS (both use Express, Socket.IO)
- Add ~50 transitive dependencies we don't need
- Couple our game to OpenClaw's release cycle

Instead, we extract **six architectural patterns** and reimplement them in ~500
lines of focused TypeScript.

---

## Pattern 1: Lane Queue (Command Serialization)

**Source**: `src/process/command-queue.ts`

**What it does**: Ensures each agent processes one task at a time while multiple
agents run in parallel. Prevents race conditions in per-NPC state.

**OpenClaw implementation**:
```typescript
type LaneState = {
  lane: string;           // "session:12345" or "main"
  queue: QueueEntry[];    // Pending tasks
  active: number;         // Currently executing
  maxConcurrent: number;  // Default = 1
  draining: boolean;
};

const enum CommandLane {
  Main = "main",
  Cron = "cron",
  Subagent = "subagent",
  Nested = "nested",
}
```

**Our adaptation**: One lane per NPC. When a player talks to an NPC, the
conversation request is enqueued. If another player approaches while the NPC
is processing, their request waits. Idle ticks also go through the lane.

```typescript
// Our simplified version (~50 lines)
class AgentLaneQueue {
  private lanes = new Map<string, Promise<void>>();

  async enqueue(agentId: string, task: () => Promise<void>): Promise<void> {
    const current = this.lanes.get(agentId) ?? Promise.resolve();
    const next = current.then(task).catch(err => {
      console.error(`[LaneQueue:${agentId}]`, err);
    });
    this.lanes.set(agentId, next);
    return next;
  }
}
```

**Reference files**:
- `docs/openclaw-reference/src/process/command-queue.ts`

---

## Pattern 2: Agent Runner (LLM Loop)

**Source**: `src/agents/pi-embedded-runner/run.ts`

**What it does**: The core agent execution cycle — takes a prompt, builds
context, calls the LLM, processes tool calls, returns results.

**OpenClaw flow**:
1. Resolve agent config (model, skills, identity)
2. Build system prompt (identity + skills + memory + world context)
3. Load conversation history from session file
4. Call LLM with messages + tools
5. If LLM returns tool calls → execute tools → feed results back → loop
6. If LLM returns text → deliver as response
7. Save updated session

**Key interfaces**:
```typescript
type RunEmbeddedPiAgentParams = {
  sessionId: string;
  agentId: string;
  prompt: string;              // User input
  model: string;               // "claude-haiku-4-5-20251001"
  sessionFile: string;         // Persistent conversation log
  config: OpenClawConfig;
  onBlockReply?: (payload) => void;    // Stream text back
  onToolResult?: (payload) => void;    // Tool execution feedback
};

type EmbeddedPiRunResult = {
  payloads?: Array<{ text?: string; isError?: boolean }>;
  meta: { durationMs: number; stopReason?: string; error?: object };
};
```

**Our adaptation**: AgentRunner per NPC. Simpler — no multi-model failover,
no OAuth, no messaging platform routing. Just:
1. Build perception snapshot (game state → text)
2. Call Claude with personality + tools
3. Execute returned tool calls (move, speak, etc.)
4. Store conversation in memory

**Reference files**:
- `docs/openclaw-reference/src/agents/pi-embedded-runner/run.ts`
- `docs/openclaw-reference/src/agents/pi-embedded-subscribe.ts`
- `docs/openclaw-reference/src/agents/model-selection.ts`

---

## Pattern 3: Skill/Tool System (Agent Actions)

**Source**: `src/agents/pi-tools.ts`, `src/agents/tools/`, `skills/`

**What it does**: Defines what actions the agent can take, using the LLM's
function calling / tool use API. Each tool has a name, description, parameter
schema, and handler function.

**OpenClaw tool pattern**:
```typescript
type AnyAgentTool = {
  name: string;
  description: string;
  schema: TypeBoxSchema;        // Input parameter validation
  execute: (params) => Promise<AgentToolResult>;
};
```

**OpenClaw built-in tools**: `exec`, `read`, `write`, `edit`, `message`,
`sessions_send`, `memory_search`, `memory_get`, browser, canvas

**Our adaptation**: Game command tools that the NPC can invoke:

| Tool | Description | Parameters |
|------|-------------|------------|
| `move` | Move in a direction or to coordinates | `{direction}` or `{x, y}` |
| `look` | Observe surroundings | `{radius?}` |
| `say` | Speak dialogue to nearby players | `{text, target?}` |
| `emote` | Express emotion visually | `{emotion}` |
| `wait` | Do nothing for a duration | `{duration}` |
| `interact` | Use/interact with a nearby object | `{target}` |

Each tool maps to RPGJS API calls:
```typescript
// Example: "say" skill
const sayTool: AgentTool = {
  name: 'say',
  description: 'Say something to a nearby player or announce to the area',
  schema: { text: { type: 'string' }, target: { type: 'string', optional: true } },
  async execute({ text, target }, context: GameContext) {
    const player = context.nearbyPlayers.find(p => p.name === target);
    if (player) {
      await player.showText(text, { talkWith: context.event });
    }
    return { success: true, message: `Said: "${text}"` };
  }
};
```

**Reference files**:
- `docs/openclaw-reference/src/agents/pi-tools.ts`
- `docs/openclaw-reference/src/agents/tools/common.ts`
- `docs/openclaw-reference/src/agents/pi-tool-definition-adapter.ts`
- `docs/openclaw-reference/skills/` (example skill packages)

---

## Pattern 4: Channel Adapter (Platform Bridge)

**Source**: `src/channels/plugins/types.ts`, `src/channels/dock.ts`

**What it does**: Abstracts the communication platform. OpenClaw has adapters
for Telegram, Discord, WhatsApp, etc. We build one for RPGJS.

**OpenClaw channel interface**:
```typescript
type ChannelPlugin = {
  id: string;
  meta: { name: string; description: string };
  capabilities: {
    chatTypes: ("direct" | "group")[];
    reactions?: boolean;
    media?: boolean;
  };
  config: ChannelConfigAdapter;
  outbound?: ChannelOutboundAdapter;   // Send messages
  gateway?: ChannelGatewayAdapter;     // Receive messages
  threading?: ChannelThreadingAdapter;  // Reply handling
};
```

**OpenClaw also has ChannelDock** — lightweight metadata without loading the
full plugin. Shared code uses docks, not full plugins.

**Our adaptation**: GameChannelAdapter bridges RPGJS events → agent system:

```typescript
// Inbound (RPGJS → Agent)
interface GameChannelAdapter {
  // Player pressed action key on NPC
  onPlayerAction(player: RpgPlayer, event: RpgEvent): void;

  // Player entered NPC's detection zone
  onPlayerProximity(player: RpgPlayer, event: RpgEvent): void;

  // Periodic idle tick (15-second interval)
  onIdleTick(event: RpgEvent): void;
}

// Outbound (Agent → RPGJS)
// Handled by the skill/tool system — agent calls move/say/emote tools
// which invoke RPGJS APIs directly
```

**Reference files**:
- `docs/openclaw-reference/src/channels/plugins/types.ts`
- `docs/openclaw-reference/src/channels/dock.ts`
- `docs/openclaw-reference/extensions/discord/index.ts` (example adapter)

---

## Pattern 5: Memory System (Conversation + Persistence)

**Source**: `src/agents/memory-search.ts`, `extensions/memory-core/`

**What it does**: Stores conversation history and enables semantic search
over past interactions.

**OpenClaw layers**:
1. **Message buffer**: Recent messages in session (JSONL transcript file)
2. **Long-term memory**: Vector + text search over accumulated knowledge
3. **Compaction**: When context overflows, summarize oldest messages

**OpenClaw memory config**:
```typescript
type MemorySearchConfig = {
  enabled: boolean;
  sources: ("memory" | "sessions")[];
  store: { driver: "sqlite"; path: string; vector: { enabled: boolean } };
  chunking: { tokens: 400; overlap: 80 };
  query: { maxResults: 6; minScore: 0.35; hybrid: { vectorWeight: 0.7 } };
};
```

**Our adaptation (MVP)**: Much simpler — no vector search, no SQLite:

```typescript
interface AgentMemory {
  // Conversation history (in-memory buffer)
  messages: AgentMessage[];
  maxMessages: number;           // Rolling window

  // Persistence (JSON file per agent)
  save(agentId: string): void;
  load(agentId: string): void;

  // Context building (for LLM prompt)
  getRecentContext(maxTokens: number): AgentMessage[];
}
```

**Post-MVP upgrades** (from OpenClaw patterns):
- SQLite persistence with vector extension
- Hybrid search (vector + full-text) for memory retrieval
- Compaction: summarize old messages when context overflows
- Importance scoring (Stanford Generative Agents pattern)

**Reference files**:
- `docs/openclaw-reference/src/agents/memory-search.ts`
- `docs/openclaw-reference/extensions/memory-core/index.ts`
- `docs/openclaw-reference/src/config/types.agents.ts` (MemorySearchConfig)

---

## Pattern 6: System Prompt Architecture (Modular Personality)

**Source**: `src/agents/system-prompt.ts`

**What it does**: Constructs the system prompt from modular sections. Each
agent gets a customized prompt based on their identity, skills, and context.

**OpenClaw sections**:
```
System Prompt:
├── Identity         (agent name, personality, voice)
├── Skills           (what tools are available + usage instructions)
├── Memory Recall    (how to use memory_search/memory_get)
├── Messaging        (how to send/reply on platforms)
├── Tools            (detailed tool descriptions)
├── Workspace        (file access rules)
├── Time/Timezone    (current date/time)
└── Voice            (speech synthesis hints)
```

**Our adaptation**: NPC system prompt sections:

```
System Prompt:
├── Identity         (NPC name, personality, backstory from YAML config)
├── World Context    (current location, time of day, nearby entities)
├── Skills           (available game commands: move, say, look, etc.)
├── Memory           (recent conversations, important facts)
├── Behavioral Rules (don't break character, stay in game world)
└── Current State    (what just happened — player approach, idle tick, etc.)
```

**Reference files**:
- `docs/openclaw-reference/src/agents/system-prompt.ts`
- `docs/openclaw-reference/src/config/types.agents.ts` (AgentConfig, IdentityConfig)

---

## Error Handling Patterns

**Source**: `src/agents/failover-error.ts`

OpenClaw classifies errors and handles each type:

| Error Type | OpenClaw Response | Our Adaptation |
|------------|-------------------|----------------|
| `auth_error` | Rotate API key | Log + disable agent temporarily |
| `billing_error` | Warn user | Disable agent + notify admin |
| `context_overflow` | Compact session | Summarize old messages |
| `rate_limit` | Exponential backoff | Reduce idle tick frequency |
| `timeout` | Retry with faster model | NPC says "Hmm..." + retry |

**Key principle**: Agent errors must NEVER crash the game server.

```typescript
// Wrap all agent operations
try {
  const result = await agentRunner.run(prompt, tools);
  executeSkills(result.toolCalls);
} catch (err) {
  console.error(`[Agent:${npcName}] Error:`, err);
  // NPC falls back to canned behavior (random walk, generic greeting)
  fallbackBehavior(npc);
}
```

---

## Configuration Pattern (YAML Personality)

**OpenClaw uses** structured config with per-agent overrides:

```typescript
type AgentConfig = {
  id: string;
  name?: string;
  model?: { primary: string; fallbacks: string[] };
  skills?: string[];
  identity?: { name: string; personality: string };
  memorySearch?: MemorySearchConfig;
};
```

**Our adaptation** (YAML per NPC):

```yaml
# config/agents/elder-theron.yaml
id: elder-theron
name: Elder Theron
graphic: npc-elder
personality: |
  You are Elder Theron, the wise village elder of Millhaven.
  You speak in measured, thoughtful tones. You know the history
  of every family in the village and worry about the growing
  darkness in the northern forest.
model:
  idle: claude-haiku-4-5-20251001
  conversation: claude-sonnet-4-5-20250929
skills:
  - say
  - move
  - look
  - emote
  - wait
spawn:
  map: medieval
  x: 300
  y: 200
behavior:
  idle_interval: 15000        # ms between idle ticks
  patrol_radius: 3            # tiles from spawn
  greet_on_proximity: true
```

---

## Architecture Summary: What We Extract

| OpenClaw Component | Lines | Our Equivalent | Est. Lines |
|-------------------|-------|----------------|------------|
| Lane Queue | ~200 | AgentLaneQueue | ~50 |
| Agent Runner | ~800 | AgentRunner | ~150 |
| Tool System | ~500 | SkillRegistry + 5 skills | ~200 |
| Channel Adapter | ~1000 | GameChannelAdapter | ~100 |
| Memory System | ~600 | AgentMemory (MVP) | ~80 |
| System Prompt | ~400 | PromptBuilder | ~100 |
| **Total** | **~3500** | **Total** | **~680** |

We're extracting the architecture, not the code. Our implementations are
purpose-built for game NPCs — simpler, focused, and free of messaging
platform concerns.
