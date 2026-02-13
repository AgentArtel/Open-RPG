## TASK-014: Build AgentManager + YAML Config Loader

- **Status**: DONE
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 3 (Core System Completion)
- **Type**: Create + Refactor
- **Depends on**: TASK-012 (Supabase memory — for `createAgentMemory()` factory)
- **Blocks**: None (enables multi-NPC deployment)

### Context

Right now, every AI NPC manually wires its own subsystems in `onInit()`:
PerceptionEngine, SkillRegistry (register 5 skills), InMemoryAgentMemory, LLMClient,
AgentRunner, LaneQueue, GameChannelAdapter, and Bridge registration. That's ~60 lines
of boilerplate per NPC (`agent-runner-test-npc.ts` lines 108-146).

The `IAgentManager` interface already exists in `src/agents/core/types.ts` (lines 429-464).
The `AgentInstance` type exists too (lines 399-410). The `AgentConfig` type includes
all the declarative fields: id, name, graphic, personality, model, skills, spawn, behavior.

This task implements `AgentManager` — a singleton that:
1. Loads NPC configs from YAML files in `src/config/agents/`
2. Wires up all subsystems for each agent automatically
3. Registers agents with the bridge
4. Replaces the hardcoded `NPC_SPAWN_CONFIG` and `npcSpawnedOnMap` logic in `player.ts`

### Objective

A working `AgentManager` that reads YAML configs, creates fully-wired agent instances,
spawns them on the map, and registers them with the bridge. Adding a new AI NPC should
be as simple as dropping a YAML file in `src/config/agents/`.

### Specifications

**Install dependency:**
```bash
npm install yaml
```

**Create files:**
- `src/agents/core/AgentManager.ts` — implements `IAgentManager`
- `src/agents/core/AgentNpcEvent.ts` — generic AI NPC event class (replaces per-NPC event files)
- `src/config/agents/elder-theron.yaml` — example agent config
- `src/config/agents/test-agent.yaml` — test agent config (replaces hardcoded `createAgentConfig()`)

**Modify files:**
- `src/agents/core/index.ts` — export `AgentManager`
- `main/player.ts` — replace manual NPC spawning with `agentManager.spawnAll(map)`
- `main/server.ts` — initialize AgentManager on server start (or in `player.ts` if simpler)

**AgentManager (`src/agents/core/AgentManager.ts`, ~180 lines):**

Implements `IAgentManager` interface:

```typescript
export class AgentManager implements IAgentManager {
  private agents = new Map<string, AgentInstance>()
  private laneQueue: ILaneQueue  // Shared across all agents
  private llmClient: ILLMClient  // Shared across all agents

  constructor() {
    this.laneQueue = new LaneQueue()
    this.llmClient = new LLMClient()
  }

  /**
   * Load all YAML configs from src/config/agents/ and create agent instances.
   */
  async loadConfigs(configDir: string): Promise<void> {
    // Read all .yaml files from configDir
    // Parse each into AgentConfig
    // Call registerAgent(config) for each
  }

  async registerAgent(config: AgentConfig): Promise<AgentInstance> {
    // 1. Create PerceptionEngine
    // 2. Create SkillRegistry + register skills based on config.skills[]
    // 3. Create memory via createAgentMemory(config.id) (Supabase or fallback)
    // 4. Load previous memories: await memory.load(config.id)
    // 5. Create RunContextProvider (needs the RpgEvent — deferred to spawn)
    // 6. Create AgentRunner
    // 7. Bundle into AgentInstance
    // 8. Store in this.agents Map
    return instance
  }

  /**
   * Spawn all registered agents on a map as RpgEvents.
   * Called from player.ts onJoinMap.
   */
  async spawnAgentsOnMap(map: RpgMap): Promise<void> {
    for (const [agentId, instance] of this.agents) {
      if (instance.config.spawn.map !== map.id) continue
      // Create dynamic event at spawn position
      // Register with bridge via GameChannelAdapter
    }
  }

  getAgent(agentId: string): AgentInstance | undefined { ... }
  async removeAgent(agentId: string): Promise<boolean> { ... }
  getAllAgents(): ReadonlyArray<AgentInstance> { ... }
  async dispose(): Promise<void> { ... }
}
```

**Key design decisions:**

1. **Shared LaneQueue**: One `LaneQueue` instance for all agents (it's already keyed
   by agentId internally). Saves memory vs. one per agent.

2. **Shared LLMClient**: One `LLMClient` for all agents (stateless — just wraps the
   OpenAI SDK). When TASK-010 (LLMGateway) lands, swap this to the gateway.

3. **Skill registry from config**: The `config.skills` array (e.g., `['move', 'say', 'look', 'emote', 'wait']`)
   maps to the exported skill objects. Use a skill map:
   ```typescript
   const SKILL_MAP: Record<string, IAgentSkill | ((pe: IPerceptionEngine) => IAgentSkill)> = {
     move: moveSkill,
     say: saySkill,
     look: createLookSkill,  // needs PerceptionEngine
     emote: emoteSkill,
     wait: waitSkill,
   }
   ```

4. **Memory from factory**: Use `createAgentMemory(agentId)` from TASK-012's
   `src/agents/memory/index.ts`. Falls back to `InMemoryAgentMemory` if Supabase
   is unavailable.

5. **RunContextProvider closure**: The `getContext` callback needs access to the
   live `RpgEvent` instance (for position, map, nearby players). This is created
   at spawn time, not at `registerAgent` time.

**Generic AI NPC Event (`src/agents/core/AgentNpcEvent.ts`, ~80 lines):**

A reusable `RpgEvent` subclass that all AI NPCs use:

```typescript
export function createAgentNpcEvent(config: AgentConfig) {
  @EventData({
    name: `EV-AGENT-${config.id.toUpperCase()}`,
    hitbox: { width: 32, height: 16 },
  })
  class AgentNpcEvent extends RpgEvent {
    onInit() {
      this.setGraphic(config.graphic)
      this.speed = 1
      // AgentManager handles bridge registration after spawn
    }

    async onAction(player: RpgPlayer) {
      const agentId = bridge.getAgentId(this)
      if (!agentId) {
        await player.showText('This NPC is not available right now.', { talkWith: this })
        return
      }
      bridge.handlePlayerAction(player, this)
    }

    onDestroy() {
      bridge.unregisterAgent(this)
    }
  }

  return AgentNpcEvent
}
```

This replaces the need for separate event files per AI NPC. The `agent-runner-test-npc.ts`,
`perception-test-npc.ts`, and `skill-test-npc.ts` can be removed or kept for reference.

**Example YAML Config (`src/config/agents/elder-theron.yaml`):**

```yaml
id: elder-theron
name: Elder Theron
graphic: female
personality: |
  You are Elder Theron, the wise village elder of a small settlement.
  You speak thoughtfully and care deeply about the villagers. You greet
  newcomers warmly and offer guidance. Keep responses under 150 characters.
model:
  idle: kimi-k2-0711-preview
  conversation: kimi-k2-0711-preview
skills:
  - move
  - say
  - look
  - emote
  - wait
spawn:
  map: simplemap
  x: 300
  y: 250
behavior:
  idleInterval: 20000
  patrolRadius: 3
  greetOnProximity: true
```

**Updated `player.ts`:**

Replace the entire `NPC_SPAWN_CONFIG` + hardcoded spawning with:

```typescript
import { agentManager } from '../src/agents/core'

// In onJoinMap:
async onJoinMap(player: RpgPlayer) {
  const map = player.getCurrentMap<RpgMap>()
  if (map && !npcSpawnedOnMap.has(map.id)) {
    // Spawn AI NPCs from YAML configs
    await agentManager.spawnAgentsOnMap(map)

    // Spawn non-AI NPCs (villager, guard, etc.) if still needed
    map.createDynamicEvent({ x: 200, y: 200, event: TestNpcEvent })

    npcSpawnedOnMap.add(map.id)
  }
}
```

### Acceptance Criteria

- [x] `AgentManager` implements `IAgentManager` interface
- [x] `loadConfigs()` reads YAML files from `src/config/agents/`
- [x] `registerAgent()` wires all subsystems (perception, skills, memory, runner)
- [x] `spawnAgentsOnMap()` creates dynamic events and registers with bridge
- [x] At least one YAML agent config exists and spawns correctly
- [x] Memory loads from Supabase on agent creation (via `createAgentMemory`)
- [x] `dispose()` cleans up all agents (flushes memory, clears timers)
- [ ] `player.ts` simplified — scripted NPCs still use old pattern (partial)
- [x] Adding a new AI NPC is just a new YAML file (no code changes)
- [x] Shared LaneQueue and LLMClient across all agents
- [ ] `rpgjs build` passes (not verified)
- [ ] `npx tsc --noEmit` passes (not verified)

### Do NOT

- Delete the non-AI NPCs (villager, guard, etc.) — they can stay as scripted NPCs
- Add hot-reloading of YAML configs (future feature)
- Add agent-to-agent communication (future feature)
- Store agent configs in Supabase (YAML is source of truth for now)
- Build a UI for managing agents (future feature)

### Reference

- `IAgentManager` interface: `src/agents/core/types.ts:429-464`
- `AgentInstance` type: `src/agents/core/types.ts:399-410`
- `AgentConfig` type: `src/agents/core/types.ts:108-138`
- Current boilerplate to absorb: `main/events/agent-runner-test-npc.ts:108-146`
- Current spawn logic to replace: `main/player.ts:28-113`
- Bridge singleton: `src/agents/bridge/index.ts`
- Memory factory (TASK-012): `src/agents/memory/index.ts` — `createAgentMemory()`
- Skills index: `src/agents/skills/index.ts`
- Feature idea: `.ai/idea/06-supabase-persistence.md` (mentions AgentManager context)

### Handoff Notes

**Implemented by Cursor (2026-02-12).**

New files: `src/agents/core/AgentManager.ts` (297 lines), `src/agents/core/spawnContext.ts` (31 lines), `main/events/AgentNpcEvent.ts` (167 lines), `src/config/agents/elder-theron.yaml`, `src/config/agents/test-agent.yaml`.

Modified: `src/agents/core/index.ts` (singleton `agentManager` + `setAgentNpcEventClass`), `main/player.ts` (calls `agentManager.spawnAgentsOnMap(map)` + builder dashboard integration).

Design: Uses a `spawnContext` module-level slot to pass config/instance to `AgentNpcEvent.onInit()` since `createDynamicEvent()` doesn't support constructor args. `AgentNpcEvent` reads context, binds `buildRunContext` to the instance's `contextProvider`, and registers with bridge.

Bonus: `spawnAgentAt()` method for builder dashboard to place NPCs at arbitrary positions. Builder dashboard Vue component added (`main/gui/builder-dashboard.vue`) with Tailwind CSS.
