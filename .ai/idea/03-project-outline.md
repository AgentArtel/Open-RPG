# Project Outline: Research → Planning → Implementation

## Goal

A running RPGJS server where a human player can connect via browser, see an AI NPC walking around randomly, approach it, and have a dynamic conversation — with the architecture designed to scale to many agents.

---

## Phase 0: Environment Setup
**Duration: 1-2 hours**

### 0.1 Development Environment

- [ ] Node.js 18+ and npm/pnpm installed
- [ ] TypeScript toolchain configured
- [ ] Git repo initialized with monorepo structure (or chosen project structure)
- [ ] IDE setup with RPGJS and OpenClaw type definitions

### 0.2 RPGJS Starter Project

- [ ] Scaffold RPGJS starter: `npx degit rpgjs/starter ai-npc-world`
- [ ] Verify it runs: `npm run dev`
- [ ] Open browser, confirm you can walk around a default map
- [ ] Review project structure — identify where server modules, events, and maps live

### 0.3 OpenClaw Reference Setup

- [ ] Clone OpenClaw repo separately for reference
- [ ] Review the project structure and identify key modules:
  - Channel adapters directory
  - Skills directory
  - Agent runner / core loop
  - Memory system
  - Configuration format
- [ ] Note: We don't need to run OpenClaw standalone — we're extracting its patterns

### 0.4 Project Structure Decision

Decide and set up one of:

```
Option A: RPGJS as host, OpenClaw patterns extracted
ai-npc-world/
├── src/
│   ├── modules/          # RPGJS modules (maps, events, player)
│   ├── agents/           # Our agent system (inspired by OpenClaw)
│   │   ├── core/         # Agent runner, LLM interface
│   │   ├── channels/     # GameChannelAdapter
│   │   ├── skills/       # Game command skills
│   │   ├── perception/   # World-to-text engine
│   │   └── memory/       # Agent memory system
│   └── bridge/           # Connects agents ↔ RPGJS game events
├── maps/                 # Tiled map files
└── assets/               # Sprites, tilesets

Option B: Monorepo with both as packages
project-root/
├── packages/
│   ├── game/             # RPGJS game
│   ├── agent-core/       # Agent system
│   └── bridge/           # Integration layer
└── shared/               # Shared types and interfaces
```

**Recommendation:** Option A for MVP. Less infrastructure overhead. Extract only the OpenClaw patterns we need rather than depending on the full framework.

**Exit criteria:** RPGJS starter running, OpenClaw source reviewed, project structure decided.

---

## Phase 1: Research Execution
**Duration: 3-5 days (see Research Outline for details)**

### 1.1 RPGJS Deep Dive (Days 1-2)

- [ ] Work through RPGJS docs systematically (server engine, events, players, maps)
- [ ] Build a test NPC that:
  - Spawns on a map
  - Walks a patrol route via `moveRoute`
  - Responds to player action press with `showText`
  - Accesses its own position and nearby entities
- [ ] Document all relevant RPGJS APIs in a cheat sheet
- [ ] Identify the exact hooks we'll use for the bridge layer

**Key deliverable:** A working RPGJS NPC cheat sheet with code snippets for every action we need.

### 1.2 OpenClaw Pattern Extraction (Days 2-3)

- [ ] Read OpenClaw channel adapter source — extract the interface contract
- [ ] Read OpenClaw skill definition source — extract the schema
- [ ] Read OpenClaw agent runner — understand the LLM call loop
- [ ] Read OpenClaw memory system — understand storage and retrieval
- [ ] Document which patterns we're adopting vs. building from scratch

**Key deliverable:** A "patterns to adopt" document with pseudocode for each extracted pattern.

### 1.3 Integration Feasibility (Day 3-4)

- [ ] Test: Can we import OpenClaw modules into an RPGJS project without conflicts?
- [ ] If conflicts exist, document them and plan workarounds
- [ ] Alternatively: confirm that building a lightweight agent runner from scratch (inspired by OpenClaw) is viable
- [ ] Test an LLM API call from within the RPGJS server process
- [ ] Measure latency of LLM call and plan for async handling

**Key deliverable:** Confirmed integration approach with any workarounds documented.

### 1.4 Prior Art Review (Day 4-5)

- [ ] Read the Stanford Generative Agents paper (focus on architecture, not the social science)
- [ ] Review AI Town source code (Convex) for their agent loop pattern
- [ ] Review Voyager (Minecraft agent) for their skill-learning approach
- [ ] Extract 3-5 architectural decisions to adopt

**Key deliverable:** Lessons learned document with concrete decisions.

**Phase 1 exit criteria:** All research checklist items from Research Outline completed. Ready to make architecture decisions.

---

## Phase 2: Architecture and Planning
**Duration: 2-3 days**

### 2.1 Architecture Decision Records (ADRs)

Write short decision documents for:

- [ ] **ADR-001: Agent Thinking Model** — When does an agent think?
  - Recommendation: Hybrid. Event-driven for interactions + 15-second idle tick for ambient behavior.
  
- [ ] **ADR-002: Perception Format** — How is game state described to agents?
  - Recommendation: Structured hybrid. JSON-like state block + one-line narrative summary.
  
- [ ] **ADR-003: Command Execution** — How do agent decisions become game actions?
  - Recommendation: Function calling / tool use. Agent returns structured commands, not natural language to parse.
  
- [ ] **ADR-004: Agent-per-process vs. Agent Pool** — How are agents hosted?
  - Recommendation: Agent pool within the RPGJS server process. One AgentManager manages all agents. Each agent has its own lane/queue (OpenClaw pattern).
  
- [ ] **ADR-005: Memory Architecture** — How do agents remember?
  - Recommendation: Per-agent JSON files for MVP. SQLite for production. Coupled with RPGJS save system.
  
- [ ] **ADR-006: LLM Provider Strategy** — Which model(s) and how?
  - Recommendation: Anthropic Claude as primary. Model-agnostic interface so we can swap. Tiered: fast model for idle behavior, powerful model for complex interactions.

### 2.2 Interface Definitions

Define TypeScript interfaces for all integration points:

- [ ] `IGameChannelAdapter` — how the game feeds events to agents
- [ ] `IAgentSkill` — how game commands are defined
- [ ] `IPerceptionEngine` — how game state becomes text
- [ ] `IAgentRunner` — the core agent loop
- [ ] `IAgentMemory` — how agents store and retrieve memories
- [ ] `IAgentManager` — how multiple agents are orchestrated
- [ ] `IBridge` — how RPGJS events map to agent events and vice versa

### 2.3 Data Flow Diagram

Document the complete flow for two scenarios:

**Scenario A: Player approaches NPC**
```
1. RPGJS detects player within radius of NPC event
2. Bridge converts this to a perception update for the agent
3. Agent's perception engine generates text description
4. AgentRunner sends perception + available skills + memory to LLM
5. LLM returns a tool call: say("Greetings, traveler!")
6. AgentRunner executes the skill
7. Skill calls RPGJS API: npcEvent.showText("Greetings, traveler!")
8. Player sees dialogue box
```

**Scenario B: NPC idle behavior**
```
1. Idle tick fires (every 15 seconds)
2. Agent's perception engine generates current state snapshot
3. AgentRunner sends lightweight prompt: "You're idle. What do you do?"
4. LLM returns: move("east", 3)
5. Skill calls RPGJS API: npcEvent.moveRoute([...])
6. All connected clients see the NPC walk east
```

### 2.4 MVP Scope Lock

Explicitly define what IS and IS NOT in the MVP:

**In scope:**
- One map with one AI NPC and one human player
- NPC walks randomly during idle ticks
- NPC responds to player interaction with LLM-generated dialogue
- NPC remembers the conversation (within session at minimum)
- Basic perception engine (nearby entities, position, basic state)
- 3-5 game command skills (move, look, say, wait, emote)
- Architecture that clearly supports adding more agents and skills later

**Out of scope for MVP:**
- Combat system
- Trading / inventory interaction
- Skill learning / progression
- Multiple maps
- Agent-to-agent interaction
- Persistent memory across server restarts
- Performance optimization
- Production deployment / scaling

**Phase 2 exit criteria:** All ADRs written, interfaces defined, data flow documented, scope locked.

---

## Phase 3: Core Infrastructure Implementation
**Duration: 3-5 days**

### 3.1 Perception Engine (Day 1)

Build the module that converts RPGJS game state into text for the agent.

- [ ] `PerceptionEngine` class with method `describe(agentCharacter): string`
- [ ] Extracts: position, map name, nearby entities (with distance), inventory, HP/stats
- [ ] Output format matches the decision in ADR-002
- [ ] Unit tests with mocked RPGJS state objects
- [ ] Token count validation (target: under 300 tokens for a typical scene)

```typescript
// Target output example:
{
  location: "village_square",
  position: { x: 12, y: 8 },
  nearby: [
    { name: "Player_Alex", type: "player", distance: 3, direction: "east" },
    { name: "Well", type: "object", distance: 1, direction: "south" }
  ],
  self: { hp: 100, inventory: ["wooden_staff", "bread"] },
  summary: "You are in the village square. A player approaches from the east."
}
```

### 3.2 Skill System (Day 1-2)

Build the game command skill framework.

- [ ] `IAgentSkill` interface definition
- [ ] Skill registry that agents can query for available skills
- [ ] Implement MVP skills:
  - `move(direction, steps)` — moves the NPC character
  - `look()` — triggers a fresh perception and returns it
  - `say(message)` — displays text to nearby players
  - `wait(seconds)` — does nothing for a duration
  - `emote(type)` — plays an animation/emote
- [ ] Each skill validates parameters before executing
- [ ] Each skill returns a result string (for the LLM to see what happened)
- [ ] Skills receive a `GameContext` object with access to the NPC's RPGJS character

### 3.3 Agent Runner (Day 2-3)

Build the core agent loop — the brain.

- [ ] `AgentRunner` class that manages one agent's lifecycle
- [ ] LLM client abstraction (start with Anthropic SDK, interface allows swapping)
- [ ] System prompt construction:
  - Agent personality/backstory
  - Available skills (formatted for function calling)
  - Current perception
  - Recent memory
- [ ] Tool use / function calling integration:
  - Send available skills as tools
  - Parse tool call responses
  - Execute the corresponding skill
  - Return result to LLM for potential follow-up
- [ ] Async execution with proper error handling
- [ ] Rate limiting / cooldown (don't let agent spam LLM calls)
- [ ] Configurable model selection per agent

### 3.4 Memory System (Day 3-4)

Build basic agent memory.

- [ ] `AgentMemory` class
- [ ] Short-term memory: last N interactions stored in an array (in-memory)
- [ ] Memory formatting: convert stored interactions into context string for LLM
- [ ] Token budget management: trim oldest memories when context gets too long
- [ ] (Optional for MVP) Long-term memory: write to JSON file, reload on startup
- [ ] Per-agent isolation: each agent has its own memory instance

### 3.5 Agent Manager (Day 4-5)

Build the orchestrator that manages multiple agents.

- [ ] `AgentManager` class
- [ ] Register/unregister agents at runtime
- [ ] Idle tick loop: every N seconds, trigger idle behavior for all agents
- [ ] Event routing: given a game event, route it to the correct agent
- [ ] Concurrency control: ensure only one LLM call per agent at a time (lane queue pattern)
- [ ] Agent configuration format: define agent personality, starting skills, spawn location
- [ ] Graceful shutdown: clean up all agents when server stops

**Phase 3 exit criteria:** All core modules built and unit-testable in isolation (without RPGJS running).

---

## Phase 4: Bridge Layer (RPGJS ↔ Agent System)
**Duration: 2-3 days**

### 4.1 GameChannelAdapter (Day 1)

The critical integration piece — connects RPGJS events to the agent system.

- [ ] `GameChannelAdapter` class
- [ ] Subscribes to RPGJS NPC events:
  - `onAction` (player presses action button near NPC)
  - `onPlayerInput` (player is nearby / moving)
  - `onInit` (NPC spawns)
  - `onDetach` (NPC removed)
- [ ] Converts RPGJS events into agent-digestible messages
- [ ] Routes agent responses back to RPGJS character actions
- [ ] Handles the async gap: when agent is "thinking," NPC plays an idle animation
- [ ] One adapter instance per agent, bound to a specific RPGJS event/NPC

### 4.2 RPGJS Module Integration (Day 2)

Wire the agent system into RPGJS's module system.

- [ ] Create `@RpgModule` for the agent system
- [ ] Hook into `RpgServerEngine.onStart` to initialize the `AgentManager`
- [ ] Create `@RpgEvent` definitions for AI NPCs that:
  - On init: register with AgentManager, start agent
  - On action: forward to GameChannelAdapter
  - On detach: unregister agent
- [ ] Ensure agent-controlled NPC movements are visible to all connected clients
- [ ] Handle map loading: spawn AI NPCs when their map loads

### 4.3 Scaling-Conscious Design (Day 3)

Ensure the bridge layer supports future scaling without rewrite.

- [ ] Agent config is declarative (JSON/YAML), not hardcoded
- [ ] AgentManager supports adding agents to any map, not just one
- [ ] Bridge layer doesn't assume single-server (no global mutable state)
- [ ] Event routing uses IDs, not direct references (survives serialization)
- [ ] LLM calls go through a queue that can later become a distributed queue
- [ ] Document all scaling-relevant decisions and future migration paths

**Phase 4 exit criteria:** RPGJS server starts with an AI NPC that the agent system controls. Agent receives game events and can execute game commands.

---

## Phase 5: Integration Testing and MVP Polish
**Duration: 2-3 days**

### 5.1 End-to-End Flow (Day 1)

- [ ] Start the server
- [ ] Connect as a human player in the browser
- [ ] Verify: AI NPC is visible on the map
- [ ] Verify: AI NPC walks around randomly on idle ticks
- [ ] Walk toward the NPC
- [ ] Press action button near NPC
- [ ] Verify: NPC responds with LLM-generated dialogue
- [ ] Walk away and come back — verify the NPC acknowledges it's seen you before (memory)
- [ ] Test with 2-3 different conversations to ensure variety

### 5.2 Agent Personality Configuration (Day 1-2)

- [ ] Create a sample agent config file:
  ```yaml
  agents:
    - id: "village_elder"
      name: "Elder Theron"
      personality: |
        You are Elder Theron, the wise but slightly grumpy elder of Willowdale village.
        You've lived here for 60 years. You're suspicious of strangers but warm up
        quickly if they show respect. You love telling stories about the old days.
      spawn:
        map: "village_square"
        x: 10
        y: 8
      starting_skills:
        - move
        - look
        - say
        - wait
        - emote
      idle_behavior: "wander_near_spawn"
      model: "claude-sonnet-4-20250514"
  ```
- [ ] Verify personality affects responses
- [ ] Test with a second agent config to confirm the system supports multiple personalities

### 5.3 Error Handling and Edge Cases (Day 2)

- [ ] LLM API timeout — NPC says something generic and tries again
- [ ] LLM API error — NPC doesn't crash, logs error, stays in idle
- [ ] Player disconnects mid-conversation — agent cleans up gracefully
- [ ] Agent tries an invalid command — error is caught, agent is informed
- [ ] Multiple players interact with same NPC simultaneously — queue or handle gracefully
- [ ] Server restart — agents reinitialize cleanly

### 5.4 Developer Experience (Day 2-3)

- [ ] Agent "debug terminal" — log output showing what each agent perceives and decides
- [ ] Configuration validation on startup — fail fast with clear errors
- [ ] Hot-reload agent personality (nice to have) — edit config without restart
- [ ] README with setup instructions
- [ ] Sample `.env` for LLM API keys

### 5.5 Performance Baseline (Day 3)

- [ ] Measure: time from player action to NPC response (should be < 3 seconds)
- [ ] Measure: token usage per interaction
- [ ] Measure: token usage per idle tick
- [ ] Measure: server memory usage with 1 agent
- [ ] Estimate: cost per agent per hour at current usage
- [ ] Document all measurements as the baseline for optimization

**Phase 5 exit criteria:** The MVP works end-to-end. A human player can have a meaningful, memorable interaction with an AI NPC. Performance is measured and documented.

---

## Phase 6: Documentation and Handoff
**Duration: 1 day**

- [ ] Architecture documentation with diagrams
- [ ] API reference for all custom interfaces
- [ ] "How to add a new agent" guide
- [ ] "How to add a new skill" guide
- [ ] Known limitations and future work
- [ ] Cost projections for scaling to 10, 50, 100 agents
- [ ] Retrospective: what worked, what didn't, what we'd do differently

---

## Summary Timeline

| Phase | Duration | Dependencies |
|---|---|---|
| Phase 0: Environment Setup | 1-2 hours | None |
| Phase 1: Research | 3-5 days | Phase 0 |
| Phase 2: Architecture | 2-3 days | Phase 1 |
| Phase 3: Core Infrastructure | 3-5 days | Phase 2 |
| Phase 4: Bridge Layer | 2-3 days | Phase 3 |
| Phase 5: Integration & Polish | 2-3 days | Phase 4 |
| Phase 6: Documentation | 1 day | Phase 5 |
| **Total** | **~14-22 days** | |

With focused full-time work, the MVP is achievable in about 3 weeks. With part-time effort, budget 4-6 weeks.

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| RPGJS NPC API too limited for dynamic control | High | Medium | Research phase will reveal this early. Fallback: fork RPGJS or use lower-level APIs |
| OpenClaw too tightly coupled to messaging platforms | Medium | Medium | Extract patterns rather than importing the framework whole |
| LLM latency makes NPCs feel unresponsive | High | High | Thinking animations, response caching, fast model for simple decisions |
| LLM costs too high for multiple agents | Medium | Medium | Tiered model strategy, aggressive idle tick intervals, caching |
| Agent produces inappropriate content | High | Low | System prompt guardrails, output filtering, content policy in agent config |
| RPGJS dependency conflicts with agent system | Medium | Low | Phase 1 research catches this early. Workaround: separate processes with IPC |
| Scope creep beyond MVP | High | High | Scope lock in Phase 2. Strict "out of scope" list. Ship MVP first, iterate. |
