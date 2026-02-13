## TASK-003: Define TypeScript interfaces for all agent system integration points

- **Status**: REVIEW
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 2
- **Type**: Create
- **Depends on**: TASK-002
- **Blocks**: TASK-004

### Context

Phase 2 of the project outline calls for defining TypeScript interfaces before
implementation. These interfaces define the contracts between all major components
of the agent system and serve as the architectural blueprint.

### Objective

A complete set of TypeScript interface files defining every integration point
in the agent system. These should be implementable independently and testable
in isolation.

### Specifications

Create interface files in `src/agents/`:

- `src/agents/core/types.ts` — core types:
  - `IAgentRunner` — the core agent loop
  - `IAgentManager` — multiple agent orchestration
  - `ILaneQueue` — per-agent async serial execution queue
  - `ILLMClient` — LLM provider abstraction
  - `AgentConfig` — agent personality/config type
  - `AgentEvent` — normalized event from game world

- `src/agents/skills/types.ts` — skill types:
  - `IAgentSkill` — game command definition (name, description, params, execute)
  - `ISkillRegistry` — skill discovery and management
  - `GameContext` — context passed to skill execute functions
  - `SkillResult` — standardized skill execution result

- `src/agents/perception/types.ts` — perception types:
  - `IPerceptionEngine` — game state to text converter
  - `PerceptionSnapshot` — the structured perception output
  - `NearbyEntity` — entity in perception radius

- `src/agents/memory/types.ts` — memory types:
  - `IAgentMemory` — memory storage and retrieval
  - `MemoryEntry` — a single memory record
  - `MemoryConfig` — token budget, max entries, persistence config

- `src/agents/bridge/types.ts` — bridge types:
  - `IGameChannelAdapter` — RPGJS ↔ agent connection
  - `IBridge` — event mapping between RPGJS and agent system
  - `GameEvent` — raw RPGJS event type

### Acceptance Criteria

- [x] All interfaces defined with JSDoc comments — ✅ every interface, type, and method has JSDoc
- [x] Interfaces follow the architecture from idea/ docs — ✅ matches OpenClaw patterns + AGENTS.md decisions
- [x] `npx tsc --noEmit` passes — ✅ only pre-existing upstream errors (css-font-loading-module)
- [x] No circular dependencies between type files — ✅ verified: bridge ← skills/perception, memory standalone, core imports all
- [x] Interfaces support dependency injection (no singletons) — ✅ all dependencies passed via methods/constructors
- [x] Perception types enforce < 300 token budget constraint — ✅ PERCEPTION_TOKEN_BUDGET constant + tokenEstimate field

### Do NOT

- Implement any interfaces yet — define contracts only
- Add dependencies beyond TypeScript types
- Modify RPGJS framework code

### Reference Documents

- `idea/03-project-outline.md` — Phase 2.2: Interface Definitions
- `idea/phase3-integration-patterns.md` — architecture decisions
- `idea/01-idea-doc.md` — core architecture vision

### Handoff Notes

**2026-02-10 — cursor — Status: REVIEW** (All acceptance criteria met)

#### Files created (5 type files, ~650 lines total)

1. **`src/agents/bridge/types.ts`** (~200 lines)
   - `GameEvent`, `GamePlayer` — type aliases for RPGJS types (only file importing @rpgjs/server)
   - `Position`, `MapInfo` — shared geometry types
   - `AgentEventType`, `AgentEvent`, `PlayerSnapshot` — normalized events
   - `IGameChannelAdapter` — inbound RPGJS → agent system (onPlayerAction, onPlayerProximity, onPlayerLeave, onIdleTick, dispose)
   - `IBridge` — registry binding RpgEvent instances to agent IDs (registerAgent, unregisterAgent, getAgentId, handleGameEvent, dispose)

2. **`src/agents/skills/types.ts`** (~230 lines)
   - `SkillResult` — standardized execution result (success, message, error, data)
   - `GameContext` — runtime context for skills (event, agentId, position, map, nearbyPlayers)
   - `NearbyPlayerInfo` — lightweight player info for skill targeting
   - `SkillParameterSchema` — JSON Schema subset for Anthropic tool-use API
   - `IAgentSkill` — game command definition (name, description, parameters, execute)
   - `ISkillRegistry` — skill management + getToolDefinitions() for LLM API
   - `ToolDefinition` — Anthropic-compatible tool format

3. **`src/agents/perception/types.ts`** (~170 lines)
   - `EntityType`, `NearbyEntity` — perceived entities with direction and distance
   - `PerceptionSnapshot` — hybrid format (summary + entities + location + tokenEstimate)
   - `PerceptionLocation` — map + position context
   - `PERCEPTION_TOKEN_BUDGET = 300`, `MAX_NEARBY_ENTITIES = 5` — enforced constants
   - `IPerceptionEngine` — generateSnapshot(context) with token budget enforcement
   - `PerceptionContext` — input for snapshot generation

4. **`src/agents/memory/types.ts`** (~160 lines)
   - `MemoryRole`, `MemoryEntry` — conversation record (role, content, timestamp, metadata)
   - `MemoryConfig` — tuning knobs (maxMessages, maxTokens, persistencePath, enableVectorSearch)
   - `IAgentMemory` — addMessage, getRecentContext(maxTokens), getAllMessages, save/load, clear

5. **`src/agents/core/types.ts`** (~340 lines)
   - `AgentConfig` — full declarative NPC config (id, name, graphic, personality, model, skills, spawn, behavior)
   - `AgentModelConfig`, `AgentSpawnConfig`, `AgentBehaviorConfig` — config sub-types
   - `LLMMessage`, `LLMContentBlock`, `LLMToolCall`, `LLMCompletionOptions`, `LLMResponse` — LLM abstractions
   - `ILLMClient` — provider-agnostic LLM interface (complete method)
   - `ILaneQueue` — per-agent serial execution queue (enqueue, isProcessing, getQueueLength)
   - `AgentRunResult` — result of one LLM loop cycle
   - `IAgentRunner` — core LLM loop (run, buildSystemPrompt, dispose)
   - `AgentInstance` — bundled agent with all subsystems
   - `IAgentManager` — multi-agent orchestration (registerAgent, getAgent, removeAgent, getAllAgents, dispose)

#### Import dependency graph (no cycles)
```
@rpgjs/server
    └── bridge/types.ts (only RPGJS import point)
            ├── skills/types.ts
            ├── perception/types.ts
            └── core/types.ts ← also imports skills, perception, memory
        memory/types.ts (standalone, no agent imports)
```

#### Design decisions
- **RPGJS isolation**: Only `bridge/types.ts` imports from `@rpgjs/server`. All other modules work with normalized types (`Position`, `MapInfo`, `AgentEvent`).
- **Anthropic alignment**: `LLMMessage`, `LLMContentBlock`, `ToolDefinition` closely mirror the Anthropic Messages API so mapping is trivial during implementation.
- **Token budget enforcement**: `PerceptionSnapshot.tokenEstimate` field + `PERCEPTION_TOKEN_BUDGET` constant make the 300-token constraint explicit in the type system.
- **Readonly everywhere**: All interface properties use `readonly` and arrays use `ReadonlyArray` to prevent accidental mutation.
- **No `any`**: Zero uses of `any` across all 5 files. Used `unknown` with `Record<string, unknown>` for flexible data.
