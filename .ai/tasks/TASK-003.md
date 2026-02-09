## TASK-003: Define TypeScript interfaces for all agent system integration points

- **Status**: PENDING
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

- [ ] All interfaces defined with JSDoc comments
- [ ] Interfaces follow the architecture from idea/ docs
- [ ] `npx tsc --noEmit` passes
- [ ] No circular dependencies between type files
- [ ] Interfaces support dependency injection (no singletons)
- [ ] Perception types enforce < 300 token budget constraint

### Do NOT

- Implement any interfaces yet — define contracts only
- Add dependencies beyond TypeScript types
- Modify RPGJS framework code

### Reference Documents

- `idea/03-project-outline.md` — Phase 2.2: Interface Definitions
- `idea/phase3-integration-patterns.md` — architecture decisions
- `idea/01-idea-doc.md` — core architecture vision

### Handoff Notes

[Updated by the assigned agent when status changes]
