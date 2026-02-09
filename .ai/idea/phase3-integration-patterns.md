# Phase 3: Integration Patterns — Research Synthesis

This document answers every question posed in Phase 3 of the Research Outline, drawing on the RPGJS v4 and OpenClaw internals deep-dives, current Anthropic API pricing, and prior art from Stanford Generative Agents, AI Town, and Voyager. It concludes with concrete architectural decisions that feed directly into Phase 2 (Architecture and Planning) of the Project Outline.

---

## 3.1 TypeScript Interop

### The core question: can RPGJS and OpenClaw coexist?

They can, but they shouldn't — at least not as co-installed npm dependencies. The research confirms what the Project Outline already recommended (Option A): **RPGJS as host, OpenClaw patterns extracted**.

Here's why importing OpenClaw as a dependency would be problematic:

**Build system conflict.** RPGJS v4 uses ViteJS with TypeScript 5.0.4 and experimental decorators (`@RpgModule`, `@EventData`, `@MapData`). It has its own CLI (`rpgjs dev`, `rpgjs build`) that controls the entire build pipeline. OpenClaw is a standalone Node.js daemon with its own entry point, its own Express-based Gateway server, and its own process lifecycle. Trying to nest OpenClaw's Gateway inside RPGJS's Vite-managed build would create a tangled mess of two competing server bootstraps.

**Express collision.** Both frameworks use Express. RPGJS creates its Express app inside `expressServer()` and exposes it via the return value. OpenClaw's Gateway runs its own WebSocket server at `ws://127.0.0.1:18789`. Running both in one process would mean two HTTP servers competing for ports, or complex proxying to merge them. Since we only need OpenClaw's *patterns* and not its Gateway, this is unnecessary complexity.

**Dependency weight.** OpenClaw is 175K+ lines of TypeScript with dependencies on grammY (Telegram), Baileys (WhatsApp), discord.js, and 15+ other platform SDKs. We'd be pulling in megabytes of messaging platform code we'll never use. Each of those SDKs has its own transitive dependency tree with potential version conflicts.

**The right approach: extract, don't import.** We write our own lightweight implementations of four OpenClaw patterns:

1. **Lane Queue** — A per-agent async queue ensuring serial execution. This is roughly 50 lines of TypeScript (a simple async mutex/queue per agent ID). We don't need OpenClaw's full session write lock infrastructure.

2. **Skill system** — OpenClaw's skills are Markdown files with YAML frontmatter, injected into the system prompt as compact XML. For our MVP, we use native Anthropic tool definitions (function calling) instead, which are more reliable for structured game commands. Post-MVP, we can layer in Markdown-based skills for the "learn new abilities" mechanic. The key insight is that these are two complementary approaches: code-based tools for core game mechanics, Markdown skills for flavor and emergent behavior.

3. **Memory system** — OpenClaw uses a two-layer Markdown system (daily notes + curated MEMORY.md) with hybrid BM25+vector retrieval. For our MVP, we implement the simpler version: an in-memory conversation buffer with JSON file persistence per agent. The architecture supports upgrading to the full hybrid retrieval system later.

4. **Channel adapter pattern** — OpenClaw's adapters are duck-typed plugin objects with `meta`, `capabilities`, `config`, and `outbound.sendText`. Our GameChannelAdapter fulfills the same *role* (bridging a communication channel to the agent runner) but doesn't need to conform to OpenClaw's specific plugin SDK shape. We implement the concept, not the interface.

### Build system strategy

RPGJS owns the build. Our agent system lives inside the RPGJS project's `src/` directory as regular TypeScript modules. The Vite build compiles everything together. No separate build step for the agent code.

```
src/
  modules/           # RPGJS modules (maps, events, player hooks)
  agents/            # Our agent system
    core/            # AgentRunner, LLM client, lane queue
    skills/          # Game command tool definitions
    perception/      # World-to-text engine
    memory/          # Per-agent memory
    bridge/          # GameChannelAdapter, RPGJS ↔ agent wiring
  config/            # Agent personality configs (YAML)
```

The only external dependency we add to the RPGJS project is the Anthropic SDK (`@anthropic-ai/sdk`), which is a clean, lightweight package with minimal transitive dependencies.

### Confirmed answer

OpenClaw as a dependency: **No.** OpenClaw as a pattern source: **Yes.** RPGJS as host with Anthropic SDK as the only significant new dependency: **Yes.** Build system: **RPGJS's Vite pipeline, unchanged.**

---

## 3.2 The Game Channel Adapter Pattern

### Event model: event-driven, not polling

The OpenClaw research confirms that all its adapters are event-driven, never polling. The RPGJS research reveals an ideal set of hooks for this:

**Primary trigger: `onAction(player)`** — fires when a player presses the Action key while colliding with the NPC. This is the "player initiates conversation" event. It maps directly to an incoming message in the OpenClaw model.

**Proximity trigger: `onDetectInShape(player, shape)` / `onDetectOutShape(player, shape)`** — fires when a player enters or leaves the NPC's detection radius (via `attachShape()`). This is the "player approaches" / "player walks away" event. The agent can decide to react (call out to the player, turn to face them, etc.) or ignore it.

**Idle trigger: timer-based, NOT `onStep`** — the RPGJS `onStep` hook fires at 60 FPS, which is far too frequent. Instead, the AgentManager runs its own `setInterval` at ~15 seconds for idle behavior ticks. This is completely decoupled from the RPGJS frame loop and doesn't burn per-frame budget.

**Events we do NOT use:**
- `onChanges` — fires map-wide on any change. With multiple AI NPCs, this creates O(n²) noise. Avoid entirely.
- `onPlayerTouch` — fires on collision without a key press. Too sensitive for conversation initiation (players would trigger it just by walking past). Reserve for future mechanics like pickpocketing or bumping.

### The adapter's bidirectional flow

```
INBOUND (Game → Agent):
  RPGJS event hook fires
    → GameChannelAdapter normalizes it into an AgentEvent
      → AgentEvent enters the agent's lane queue
        → AgentRunner processes it (perception + LLM call)

OUTBOUND (Agent → Game):
  LLM returns tool calls (e.g., say("Hello"), move("north", 3))
    → AgentRunner executes each skill
      → Skill calls RPGJS API on the NPC's RpgEvent instance
        → RPGJS schema sync broadcasts changes to all clients
```

The critical insight from the RPGJS research: **in Shared mode, server-side NPC movements automatically replicate to all connected clients.** We don't need to manage any client sync ourselves. Calling `this.moveRoutes(...)` on a Shared event just works.

### Handling the latency gap

LLM calls take 1-3 seconds (Haiku) or 2-5 seconds (Sonnet). The game runs at 60 FPS. Players will notice a frozen NPC.

**Strategy: immediate acknowledgment, async response.**

When a player presses Action near an NPC and the agent needs to think:

1. **Immediately** show a "thinking" indicator — the NPC faces the player (`talkWith: this`), and we display a brief placeholder like "..." or a thinking animation. RPGJS's `player.showText()` with `typewriterEffect: true` provides a natural delay feel.

2. **Asynchronously** the LLM call runs. When it resolves, the NPC's actual dialogue replaces the placeholder, or a new dialogue box appears.

3. **For idle behavior**, there's no player waiting, so latency is invisible. The NPC just starts moving a few seconds after the tick fires. Nobody notices.

This mirrors how OpenClaw's Telegram adapter handles latency — the user sends a message and sees a "typing..." indicator while the agent processes. The game equivalent is the NPC's "thinking" animation.

### One AgentRunner per NPC, one AgentManager for all

Each NPC gets its own `AgentRunner` instance with its own personality, memory, and lane queue. A single `AgentManager` orchestrates all runners:

- Manages the idle tick interval (fires for all agents every ~15s)
- Routes game events to the correct agent by NPC event ID
- Enforces per-agent concurrency (one LLM call at a time per agent, via lane queue)
- Handles lifecycle (register on NPC spawn, unregister on NPC removal)

This matches OpenClaw's session model: one session per agent-channel-peer combination, with the lane queue preventing concurrent mutations within a session.

### Token-efficient game state delivery

The perception engine generates a structured snapshot that stays under 300 tokens. Here's a concrete example:

```json
{
  "location": { "map": "village_square", "x": 320, "y": 256 },
  "nearby": [
    { "name": "Player_Alex", "type": "player", "distance": 2, "direction": "east" },
    { "name": "Well", "type": "object", "distance": 1, "direction": "south" },
    { "name": "Merchant_Reva", "type": "npc", "distance": 8, "direction": "northwest" }
  ],
  "self": { "hp": 100, "maxHp": 100, "gold": 45 },
  "time": "afternoon",
  "summary": "You are in the village square near the well. A player approaches from the east."
}
```

This clocks in at roughly **120-150 tokens** as structured JSON. The `summary` field provides a one-line narrative for the LLM to anchor on without verbose prose descriptions. Nearby entities are capped at the 5 closest to keep token count stable regardless of map population.

---

## 3.3 LLM Cost and Latency Modeling

### Current pricing (February 2026)

| Model | Input (per MTok) | Output (per MTok) | Latency (est.) | Use case |
|---|---|---|---|---|
| Haiku 4.5 | $1 | $5 | 0.5-1.5s | Idle behavior, simple reactions |
| Sonnet 4.5 | $3 | $15 | 1-3s | Complex conversations, decisions |
| Opus 4.5 | $5 | $25 | 2-5s | Not needed for MVP |

**Prompt caching** is a game-changer for NPCs: system prompt + personality + skill definitions are identical across calls for the same agent. Cache reads cost 10% of input price. After the first call, the ~800 token system prompt costs nearly nothing on subsequent turns.

**Batch API** offers 50% discount but has 24-hour turnaround — completely unusable for real-time game interactions. Only relevant if we ever do offline batch processing of agent memories.

### Token budget per interaction type

**Conversation turn (player talks to NPC):**

| Component | Tokens |
|---|---|
| System prompt (personality, rules, context) | ~600-800 |
| Tool definitions (5 skills) | ~400-500 |
| Perception snapshot | ~120-150 |
| Conversation memory (last 10 exchanges) | ~800-1200 |
| **Total input** | **~1,920-2,650** |
| Agent response (tool call + reasoning) | ~100-200 |
| **Total output** | **~100-200** |

With prompt caching active after the first turn (system prompt + tools cached):

| Component | Effective tokens billed |
|---|---|
| Cached system prompt + tools (~1,100) | ~110 (at 10% rate) |
| Fresh perception + memory (~1,000-1,350) | ~1,000-1,350 |
| **Effective input** | **~1,110-1,460** |

**Idle tick (NPC decides what to do):**

| Component | Tokens |
|---|---|
| System prompt (cached after first call) | ~110 effective |
| Lightweight perception (no conversation) | ~80-100 |
| Brief instruction ("You're idle, what next?") | ~20 |
| **Effective input** | **~210-230** |
| Agent response (single tool call) | ~50-80 |
| **Effective output** | **~50-80** |

### Cost model per agent per hour

**Assumptions for an active NPC:**
- 4 idle ticks per minute (every 15 seconds)
- 2 player conversations per hour, averaging 6 turns each
- Using Haiku 4.5 for idle behavior, Sonnet 4.5 for conversations

**Idle behavior cost (Haiku 4.5):**
- 240 ticks/hour × 220 input tokens = 52,800 input tokens/hour
- 240 ticks/hour × 65 output tokens = 15,600 output tokens/hour
- Cost: (52,800 / 1M × $1) + (15,600 / 1M × $5) = $0.053 + $0.078 = **$0.131/hour**

**Conversation cost (Sonnet 4.5):**
- 12 turns/hour × 1,300 effective input = 15,600 input tokens/hour
- 12 turns/hour × 150 output tokens = 1,800 output tokens/hour
- Cost: (15,600 / 1M × $3) + (1,800 / 1M × $15) = $0.047 + $0.027 = **$0.074/hour**

**Total per agent: ~$0.20/hour, ~$4.80/day, ~$146/month**

### Scaling projections

| Agents | Monthly cost (estimated) | Notes |
|---|---|---|
| 1 (MVP) | ~$146 | Comfortable for development |
| 5 | ~$730 | Small village viable |
| 10 | ~$1,460 | Needs idle tick optimization |
| 50 | ~$7,300 | Requires tiered approach |
| 100 | ~$14,600 | Must use mostly Haiku + aggressive caching |

### Cost optimization levers (post-MVP)

**Reduce idle tick frequency.** Going from 15s to 30s cuts idle costs in half. Many NPCs don't need to think every 15 seconds if nothing has changed around them. A "change-gated" idle tick (only think if perception differs from last tick) could reduce idle calls by 60-80%.

**Use Haiku for everything initially.** Haiku 4.5 at $1/$5 performs within 90% of Sonnet on most tasks. For game NPC dialogue, Haiku is likely sufficient. This cuts conversation costs by 67%.

**All-Haiku model at optimized idle:** ~$0.07/hour per agent, ~$50/month. Fifty agents would cost ~$2,500/month — expensive but feasible for a funded project.

**Prompt caching impact.** The numbers above already assume caching. Without it, costs roughly double for conversations due to the system prompt being re-billed at full rate every turn.

### Latency profile

Haiku 4.5 time-to-first-token is under 500ms with typical response completion in 1-1.5 seconds. For idle behavior (short responses), this is fast enough that NPC movement appears natural — there's a brief "pause to think" then the NPC acts.

Sonnet 4.5 runs 1-3 seconds for conversational responses. With the "NPC faces player and shows '...'" acknowledgment pattern, this feels like a character considering their words — a 2-second pause in dialogue is not unusual in RPGs.

**Verdict: latency is manageable.** The thinking animation pattern covers the gap. We don't need streaming for MVP — the full response arrives, gets displayed as a complete dialogue box. Streaming could be added later for typewriter-effect real-time responses.

---

## 3.4 Prior Art: Architectural Lessons

### Stanford Generative Agents (Park et al., 2023)

**What they built:** 25 agents in a Smallville sandbox (built on Phaser web game framework) living daily routines, forming relationships, planning a Valentine's Day party autonomously. Used GPT-3.5-turbo.

**Architecture:**
- **Memory stream** — a comprehensive log of every observation stored as natural language records with timestamp, importance score, and embedding
- **Retrieval** — hybrid scoring: `score = α × recency + β × importance + γ × relevance` where relevance is cosine similarity of embeddings
- **Reflection** — periodically synthesize memories into higher-level insights ("I've noticed that I enjoy talking to Mei about art")
- **Planning** — top-down daily plans generated each morning, decomposed into hourly then per-action granularity
- **React-and-replan** — at each timestep, check if current observation warrants deviating from plan

**Lessons for us:**

1. **ADOPT: The memory stream with importance scoring.** Their retrieval formula (recency + importance + relevance) is elegant and directly applicable. However, their implementation required vector embeddings for every observation, which is expensive at scale. For MVP, we simplify: recent conversation buffer (recency) + explicit "remember this" flags (importance). Add vector search post-MVP.

2. **ADOPT: The react-and-replan pattern.** At each agent tick, check if the current perception warrants changing behavior. Don't blindly follow a pre-generated plan. This maps perfectly to our hybrid model: idle ticks check whether to continue current behavior or react to something new.

3. **REJECT: Full daily planning.** Their agents generated detailed day plans every morning. This is expensive (large LLM calls), complex to implement, and overkill for our MVP. NPCs that wander and react to players are sufficient. Long-horizon planning is a post-MVP feature.

4. **REJECT: Reflection as a separate subsystem.** Their reflection mechanism (periodically asking "what are the 5 most salient high-level questions I can answer about my recent experiences?") generated insightful behavior but added significant cost and complexity. For MVP, the agent's system prompt and accumulated conversation memory provide enough personality consistency. Add reflection post-MVP if NPCs feel too "flat."

### AI Town (a16z / Convex)

**What they built:** An open-source starter kit inspired by the Stanford paper. Agents live in a pixel-art town rendered with PixiJS, backed by Convex's reactive database. Supports Ollama for local LLM inference.

**Architecture:**
- **Convex as backend** — all agent state (memories, conversations, plans) lives in Convex's reactive database with real-time sync to the frontend
- **Conversation model** — agents detect nearby agents/players, decide whether to talk based on relationship history, then generate dialogue turn by turn
- **Memory** — stored as database records with embeddings, using Convex's built-in vector search
- **Rendering** — PixiJS client, map built with a custom editor, sprites for characters

**Lessons for us:**

5. **ADOPT: Conversation as a first-class state machine.** AI Town models conversations as explicit state objects: `idle → approaching → conversing → reflecting → idle`. The agent's behavior varies by state. This is cleaner than treating every LLM call identically. We should implement agent states (idle, conversing, moving, thinking) that gate what actions are available.

6. **ADOPT: The separation of "world engine" from "agent engine."** AI Town runs its simulation engine (movement, collision, time) independently from agent decision-making. Agents query world state but don't control the tick loop. This is exactly our architecture: RPGJS runs the game loop, agents are triggered by events and timers, never by the frame loop.

7. **NOTE: Their tech stack choice reveals a tradeoff.** Convex gives them reactive state sync for free but locks them into Convex's hosting. We get state sync for free from RPGJS's schema system instead. Our approach is more self-hosted/portable but requires us to manage our own agent state persistence.

### Voyager (Minecraft, NVIDIA/Caltech/Stanford, 2023)

**What they built:** An LLM-powered Minecraft agent that continuously explores, acquires skills as executable code, and transfers learned skills to new worlds. Uses GPT-4.

**Architecture:**
- **Automatic curriculum** — GPT-4 generates a sequence of tasks based on current inventory, completed tasks, and environment state. Tasks escalate in difficulty organically.
- **Skill library** — skills are JavaScript functions generated by GPT-4, verified by execution, and stored for retrieval. Each skill has a description embedding for semantic search. Skills compose: `craftStoneSword()` calls `mineStone()` which calls `findBlock()`.
- **Iterative prompting** — code is generated, executed, errors fed back, code refined over multiple rounds until it works or times out.
- **Environment feedback** — the agent sees execution results, error messages, and game state changes after each action.

**Lessons for us:**

8. **ADOPT: Skills as code with semantic retrieval.** Voyager's killer insight: skills stored as executable code with description embeddings can be retrieved by semantic similarity to the current task. For our system, tool definitions serve this role. The LLM picks tools based on their descriptions matching the current situation. Post-MVP, we can add Markdown-based skills (OpenClaw pattern) that the LLM retrieves dynamically.

9. **ADOPT: Execution feedback loops.** When a Voyager skill fails, the error is fed back to the LLM to try again. We must implement this: if an agent's `move("north", 5)` fails because there's a wall, the skill returns an error message, and the agent gets another chance to decide (maybe `move("east", 3)` instead). Without feedback, agents will repeatedly run into walls.

10. **REJECT: Code generation as the action space.** Voyager generates JavaScript code that runs in Minecraft. This is powerful but dangerously unconstrained for a multiplayer game. Agents writing arbitrary code could crash the server, exploit game mechanics, or produce unpredictable behavior. Our function-calling approach (structured tool calls with validated parameters) is much safer. The agent can only do things we've defined tools for.

11. **REJECT (for MVP): Automatic curriculum / self-directed exploration.** Voyager's curriculum system is its most complex component and requires substantial prompt engineering. Our MVP NPCs don't need to set their own goals — they react to players and wander. Self-directed goal-setting is a fascinating post-MVP feature for "agents that grow."

---

## Summary: Decisions from Phase 3

### Confirmed from prior plans

These decisions from the Project Outline and Idea Doc are validated by the research:

- **RPGJS as host, OpenClaw patterns extracted** — confirmed. Dependency co-installation is infeasible. Pattern extraction is the right call.
- **Hybrid thinking model (event-driven + idle tick)** — confirmed by Stanford's react-and-replan pattern and AI Town's world/agent engine separation.
- **Function calling for commands** — confirmed. Voyager's code-generation approach is too risky for multiplayer. OpenClaw's Markdown skills are a great post-MVP layer but not the MVP foundation.
- **Structured hybrid perception** — confirmed. The 120-150 token JSON snapshot with a summary line is token-efficient and gives the LLM enough to work with.

### New decisions from this research

- **Tiered model strategy: Haiku 4.5 for idle, Sonnet 4.5 for conversation.** Budget: ~$0.20/hour per agent. All-Haiku fallback at ~$0.07/hour if costs need cutting.
- **Prompt caching is mandatory from day one.** System prompt + tool definitions are static per agent and should be cached. This nearly halves per-turn cost.
- **Agent state machine: idle → approaching → conversing → moving → thinking.** Borrowed from AI Town. Gates available actions and controls when LLM calls happen.
- **Execution feedback to the agent.** When a skill fails, the error message is returned to the LLM for re-planning. Borrowed from Voyager.
- **Change-gated idle ticks (post-MVP optimization).** Only invoke the LLM on idle tick if perception has changed since last tick. Could reduce idle costs by 60-80%.
- **`onAction` for conversation, `onDetectInShape` for approach awareness, `setInterval` for idle ticks.** Never use `onStep` or `onChanges` for agent logic.
- **Markdown-based skills are a post-MVP feature**, not the MVP foundation. MVP uses native Anthropic tool definitions. The "learn new abilities" mechanic comes later using the OpenClaw SKILL.md pattern with hot-reload.

### Research deliverables checklist (Phase 3 items)

- [x] Confirmed-compatible dependency approach (extract patterns, Anthropic SDK only new dep)
- [x] Cost model for LLM usage per agent per hour ($0.07-$0.20 depending on model mix)
- [x] Decision on agent thinking model: hybrid (event-driven + 15s idle tick)
- [x] Decision on perception format: structured hybrid (JSON + summary, ~150 tokens)
- [x] Decision on command execution: function calling / tool use (Markdown skills post-MVP)
- [x] 5+ architectural lessons from prior art with adopt/reject reasoning
- [x] Latency analysis with mitigation strategy (thinking animations, Haiku for speed)
