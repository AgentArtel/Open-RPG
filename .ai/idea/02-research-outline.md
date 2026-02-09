# Research Outline: RPGJS + OpenClaw AI Agent NPCs

This document maps out everything we need to learn and review before writing code. Each section includes what to study, where to find it, what questions to answer, and how to know when you're done.

---

## Phase 1: Understand RPGJS Internals

### 1.1 Server Architecture

**Study material:**
- RPGJS v4 docs: https://docs.rpgjs.dev
- Source code: https://github.com/RSamaium/RPG-JS
- Server engine API: https://docs.rpgjs.dev/classes/server-engine.html
- The `@rpgjs/server` module specifically

**Key questions to answer:**
- How does the RPGJS server process lifecycle work? (startup → game loop → tick → shutdown)
- What is `RpgServerEngine` and how do you hook into `onStart`, `onStep` (per-frame), etc.?
- How does the Express app instance integrate? Can we mount custom API routes alongside the game server?
- What is the module system (`@RpgModule`) and how do we create custom server-side modules?
- How does the server handle player connections and disconnections?

**Done when:** You can describe the full request lifecycle from "player connects" to "player sees a map" and identify where custom code hooks in.

### 1.2 NPC / Event System

**Study material:**
- RPGJS Event system docs
- `RpgEvent` class API
- NPC creation tutorials/examples in the docs
- Map event configuration

**Key questions to answer:**
- How are NPCs defined and spawned on maps? (`@RpgEvent` decorator pattern)
- What events/hooks exist on NPCs? (`onInit`, `onAction`, `onPlayerInput`, `onChanges`, etc.)
- How do NPCs move programmatically? (`moveRoute`, `teleport`, direction enums)
- How does NPC-to-player interaction work? (`showText`, `showChoices`, etc.)
- Can NPCs be created/destroyed dynamically at runtime, or only at map load?
- How do NPCs access their own state (position, HP, inventory)?
- What is the scope of an NPC — per-map, per-world, global?

**Done when:** You can write a simple NPC module that spawns on a map, patrols a route, and responds to player interaction with dynamic text.

### 1.3 Player System

**Study material:**
- `RpgPlayer` class API
- Player hooks and events
- Player-NPC interaction patterns

**Key questions to answer:**
- What hooks fire when a player approaches/interacts with an NPC?
- How does the player action system work (pressing space near an NPC)?
- Can server-side code detect player proximity to NPCs without player input?
- What player data is accessible server-side (position, inventory, name, stats)?
- How do you send messages/UI to a specific player from server code?

**Done when:** You can programmatically detect when a player is within N tiles of an NPC and trigger server-side logic.

### 1.4 Map System

**Study material:**
- RPGJS map documentation
- Tiled integration docs
- Map change/zone system

**Key questions to answer:**
- How are maps loaded and managed?
- How do you enumerate all entities (players + NPCs) on a given map?
- What coordinate system is used? (tile-based? pixel-based? both?)
- How do map transitions work and what happens to NPCs during transitions?
- Can the server iterate over all maps and their entities?

**Done when:** You can write a utility function that returns "all entities within radius R of point (x,y) on map M."

### 1.5 Multiplayer and Sync

**Study material:**
- RPGJS multiplayer architecture docs
- World/zone system
- Agones/Kubernetes scaling docs: https://docs.rpgjs.dev/advanced/agones

**Key questions to answer:**
- How does state sync work between server and clients?
- If we control an NPC server-side, do its movements automatically replicate to all connected clients?
- What's the performance cost of one NPC vs. 10 vs. 100 on the server?
- How does the zone-based processing work for optimization?
- What would horizontal scaling look like with AI agents? Do agents need to migrate between instances?

**Done when:** You understand the performance envelope — roughly how many active entities can one server instance handle, and where the bottlenecks are.

---

## Phase 2: Understand OpenClaw Internals

### 2.1 Core Architecture

**Study material:**
- OpenClaw GitHub repo: https://github.com/nicepkg/openclaw (or current repo location)
- Architecture docs / README
- The "Lane Queue" system documentation
- Channel adapter code

**Key questions to answer:**
- What is the core message processing pipeline? (Channel → Agent Runner → Skills → Response)
- How does the Lane Queue work for serial execution?
- How are "sessions" managed? (One session per conversation? Per channel?)
- What is the Agent Runner's interface? What does it expect as input and produce as output?
- How is the LLM called? What's the abstraction layer? (Model Resolver)
- How does provider fallback work?

**Done when:** You can trace a message from "incoming Telegram text" through to "agent executes a skill and responds."

### 2.2 Channel Adapters

**Study material:**
- Existing channel adapter code (Telegram, Discord, Signal, etc.)
- Channel adapter interface/abstract class
- How adapters register with the core system

**Key questions to answer:**
- What interface must a channel adapter implement?
- How does an adapter push messages into the agent?
- How does an adapter receive responses from the agent?
- Are adapters event-driven or polling-based?
- Can multiple adapters run simultaneously? (i.e., can one agent have both a game channel and a debug terminal channel?)
- What metadata does an adapter provide? (sender ID, timestamp, channel context)

**Done when:** You could sketch the code for a minimal custom channel adapter that reads from stdin and writes to stdout.

### 2.3 Skills (AgentSkills)

**Study material:**
- Skill definition format / schema
- Built-in skills (shell, filesystem, browser)
- How skills are registered and discovered
- How skills are invoked during agent reasoning

**Key questions to answer:**
- What is the skill definition schema? (name, description, parameters, execute function)
- How does the LLM know what skills are available? (Are they injected into the system prompt?)
- How are skill results returned to the LLM for further reasoning?
- Can skills be added/removed at runtime? (Critical for the "learn new commands" mechanic)
- What's the error handling pattern when a skill fails?
- Can skills have prerequisites or conditional availability?

**Done when:** You could write a custom skill that, say, returns the current weather, and register it with an OpenClaw agent.

### 2.4 Memory System

**Study material:**
- Memory storage code (JSONL, Markdown, SQLite)
- How memory is injected into agent context
- "Semantic Snapshots" concept
- Long-term vs. short-term memory handling

**Key questions to answer:**
- How is memory structured? What gets stored per-interaction?
- How much memory context is injected per LLM call? (Token budget management)
- Can we provide custom memory sources? (e.g., game state as part of memory)
- How does memory retrieval work? (Vector search, keyword, or hybrid)
- Where is memory stored on disk and how is it organized?

**Done when:** You understand how to give an agent persistent memory that survives server restarts, and how to scope memory per-agent.

---

## Phase 3: Integration Patterns

### 3.1 TypeScript Interop

**Questions to answer:**
- Can RPGJS and OpenClaw coexist in the same Node.js process without conflicts?
- Are there dependency version conflicts? (Both use TypeScript, both use Express potentially)
- What's the best way to structure the project? Monorepo? RPGJS as host with OpenClaw as dependency?
- How do we handle the build system? (RPGJS uses its own build pipeline)

**Research task:** Create a blank RPGJS project and a blank OpenClaw setup. List all dependencies of each. Identify overlaps and conflicts.

### 3.2 The Game Channel Adapter Pattern

**Questions to answer:**
- What event model should the adapter use? (RPGJS event → message to agent? Or polling game state on interval?)
- How do we handle the latency gap? (LLM calls take 1-5s, game runs at 60fps)
- Should each agent get its own OpenClaw instance, or should one instance manage multiple agents?
- How do we feed game state into the adapter in a token-efficient way?

**Research task:** Study how the existing Telegram adapter handles async message delivery and response latency. Map the same patterns to game events.

### 3.3 LLM Cost and Latency Modeling

**Questions to answer:**
- What's the average token count for a game state perception? (Estimate: 200-500 tokens)
- What's the average token count for an agent decision response? (Estimate: 50-200 tokens)
- At $3/M input, $15/M output (Claude Sonnet), what does it cost per agent per hour?
- How many agents can we run before costs become prohibitive?
- What's the latency profile? Can we hide it behind animations?

**Research task:** Write a sample game state description and a sample agent response. Count tokens. Build a cost model spreadsheet.

### 3.4 Existing Work / Prior Art

**Research these projects:**
- **Generative Agents (Stanford, 2023)** — "Simulacra of Human Behavior" paper. 25 agents in a Smallville simulation. How did they handle perception, memory, and action?
- **Smallville / AgentSims** — open-source implementations of the above
- **AI Town (Convex)** — open-source generative agents demo. How is their architecture different?
- **Voyager (Minecraft)** — LLM agent that learns to play Minecraft. How do they handle the skill-learning loop?
- **RPGJS Studio AI** — RPGJS's own AI features. What do they offer and where do they stop short?

**Done when:** You can list 3-5 architectural decisions from prior art that we should adopt or explicitly reject, with reasons.

---

## Phase 4: Design Decisions (Pre-Implementation Research)

### 4.1 Agent Thinking Model

Research needed to decide between:

| Option | Pros | Cons |
|---|---|---|
| **Event-driven only** (agent thinks only when triggered) | Cheap, low latency for responses | NPCs feel dead when nothing happens to them |
| **Tick-based** (agent thinks every N seconds) | NPCs have idle behavior, feel alive | Expensive, wasteful when nothing is happening |
| **Hybrid** (event-driven + slow idle tick) | Best of both worlds | More complex to implement |

**Research task:** Look at how Generative Agents handled this. Look at how AI Town handles this. Benchmark LLM call costs for each model.

### 4.2 Perception Format

Research needed to decide how game state is described to the agent:

| Option | Pros | Cons |
|---|---|---|
| **Prose narration** ("You see a forest clearing...") | Natural for LLM, immersive | Verbose, high token count |
| **Structured data** (JSON-like state dump) | Compact, unambiguous | Less natural for LLM reasoning |
| **Hybrid** (structured + brief narrative) | Balanced | More complex to generate |

**Research task:** Test each format with Claude/GPT. Which produces better agent decisions? Which is most token-efficient?

### 4.3 Command Execution Model

Research needed to decide how agent decisions become game actions:

| Option | Pros | Cons |
|---|---|---|
| **Natural language** (agent says "I'll walk north") → parsed to commands | Flexible, easy for LLM | Parsing is fragile |
| **Function calling / tool use** (agent returns structured tool calls) | Reliable, type-safe | Less flexible, model-dependent |
| **Hybrid** (tool use for actions, natural language for speech) | Clean separation | Two output modes to handle |

**Research task:** Review how OpenClaw currently handles tool/skill invocation. Does it use native function calling or text parsing?

### 4.4 Scaling Architecture

Research needed for multi-agent deployment:

- How many OpenClaw instances can one Node process handle?
- Should we use worker threads for agents?
- How does RPGJS's Agones scaling interact with agent state?
- If the game server shards by map, do agents need to follow?

**Research task:** Load test a basic setup — how many concurrent LLM calls can we manage before the event loop blocks?

---

## Research Deliverables Checklist

After completing all phases, you should have:

- [ ] A working mental model of RPGJS's server event lifecycle
- [ ] A working mental model of OpenClaw's message processing pipeline
- [ ] A confirmed-compatible dependency tree (or documented workarounds)
- [ ] A cost model for LLM usage per agent per hour
- [ ] A decision on agent thinking model (event-driven / tick / hybrid)
- [ ] A decision on perception format (prose / structured / hybrid)
- [ ] A decision on command execution model (NL / function calling / hybrid)
- [ ] A list of 3+ architectural lessons from prior art
- [ ] A simple "hello world" for both RPGJS (NPC on map) and OpenClaw (custom skill) running independently
- [ ] Confidence that both can run in the same Node process

---

## Estimated Research Time

| Phase | Estimated Hours | Priority |
|---|---|---|
| Phase 1: RPGJS Internals | 8-12 hours | P0 — must do before any code |
| Phase 2: OpenClaw Internals | 6-10 hours | P0 — must do before any code |
| Phase 3: Integration Patterns | 4-6 hours | P0 — must do before architecture |
| Phase 4: Design Decisions | 4-8 hours | P1 — can overlap with early implementation |
| **Total** | **22-36 hours** | |

This can be compressed if you already have experience with either framework, or if you parallelize by having one person deep-dive RPGJS while another deep-dives OpenClaw.
