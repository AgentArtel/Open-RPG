# Prior Art Analysis: AI Agent NPCs in Game Worlds

How three landmark projects approached AI agents in game environments — and what
we take, adapt, or skip for our RPGJS + OpenClaw NPC system.

**Projects analyzed:**
1. Stanford Generative Agents (Park et al., 2023) — 25 agents in Smallville
2. AI Town (a16z-infra, 2023) — TypeScript reimagining on Convex
3. Voyager (NVIDIA/Caltech/Stanford, 2023) — LLM agent learning Minecraft

**Our context:** AI agents living as NPCs in an RPGJS v4 multiplayer game.
Kimi K2/K2.5 as primary LLM. OpenAI-compatible tool calling. Deployed on
Railway, embedded via iframe in a Lovable-built frontend.

---

## 1. Stanford Generative Agents

**Paper:** "Generative Agents: Interactive Simulacra of Human Behavior" (2023)
**What it is:** 25 AI agents living in a Smallville-like town, powered by GPT-3.5.
Phaser (client) + Django (server). ~$1,000 for a 2-day simulation.

### Architecture: Three Pillars

**Memory Stream** — Timestamped log of all observations and actions. Each entry
scored by: `score = α_recency × recency + α_importance × importance + α_relevance × relevance`.
Retrieval pulls the top-k memories by composite score.

**Reflection** — When cumulative importance of recent memories exceeds a threshold
(~150 points), the agent generates 3-5 high-level insights. Reflections stored as
memories themselves, creating recursive abstraction layers.

**Planning** — Daily plans generated at wake-up, decomposed into hourly blocks,
then 5-15 minute action items. Plans are reactive: agents "react and replan" when
significant events occur (e.g., someone tells them about a party).

### What We Take

| Pattern | Disposition | Notes |
|---------|-------------|-------|
| Memory retrieval formula (recency + importance + relevance) | **ADOPT** | Proven effective. Use for our memory system. |
| Reflection generation (periodic high-level insights) | **ADAPT** | Lower threshold for fewer-conversation RPG NPCs. Kimi K2 (cheap) for reflection. |
| React-and-replan on significant events | **ADOPT** | Maps to our event-driven architecture. Player interaction = replan trigger. |
| Daily planning / hourly scheduling | **ADAPT** | Simplify to "ambient behavior routines" in YAML configs, not full LLM-generated schedules. |
| Importance scoring by LLM | **ADOPT** | Use Kimi K2 (cheap) with temp=0 to rate 0-9. |
| Recursive memory (reflections on reflections) | **SKIP** | Over-engineered for MVP. Single-level reflections are sufficient. |
| Phaser + Django architecture | **SKIP** | We use RPGJS (TypeScript, same-process). |

### Key Lessons

- **Cost:** $1,000 for 25 agents over 2 days with GPT-3.5. Kimi K2 at $0.60/$2.50
  per MTok + automatic caching should be dramatically cheaper.
- **Behavioral bugs:** Agents drank at 7am, queued for a single bathroom, and spoke
  overly formally. Personality tuning and behavioral constraints in system prompts
  are critical.
- **Emergent behavior was real:** Agents spread gossip, formed opinions, and
  organized events unprompted. The memory + reflection loop is what creates this.

---

## 2. AI Town (a16z-infra)

**Repo:** github.com/a16z-infra/ai-town (TypeScript, Convex backend)
**What it is:** Open-source generative agents demo. Agents wander a 2D town,
have conversations, form memories, and reflect. ~75 agent ceiling before
stability issues.

### Architecture: Four Layers

1. **Game Engine** (`convex/engine/`) — Generic simulation: save/load state, tick
   loop, generation numbers to prevent race conditions.
2. **Game Rules** (`convex/aiTown/`) — AI Town-specific: agent tick logic,
   conversation state machine, pathfinding, collision.
3. **Agent System** (`convex/agent/`) — Async: prompt engineering, memory
   storage/retrieval, reflection generation.
4. **Client UI** (`src/`) — PixiJS + React, reactive data binding via Convex.

### Conversation State Machine

```
invited → walkingOver → participating → (end) → memory processing
```

- Two-player conversations only
- Players cannot move while participating
- Messages stored outside engine state (keeps core lean)
- Cooldowns: 2s between messages, 15s between conversations, 60s per partner

### Memory: Composite Scoring (Same as Stanford)

Fetch 10x candidates by relevance, then re-rank using:
- **Relevance**: cosine similarity on embeddings
- **Importance**: LLM-scored 0-9
- **Recency**: decay by last-access timestamp

Reflection triggered when importance sum exceeds 500 points.

### The Key Insight: Input-Based State Modification

Both humans and AI agents modify game state through the **same input system**.
No special pathways for agents. This means features built for players
automatically work for agents and vice versa.

### What We Take

| Pattern | Disposition | Notes |
|---------|-------------|-------|
| Unified input system (humans = agents) | **ADOPT** | Our GameChannelAdapter should produce the same events as player actions. |
| Conversation state machine (invited/walkingOver/participating) | **ADOPT** | Maps to `attachShape()` + `onDetectInShape` + `onAction` in RPGJS. |
| Memory composite scoring | **ADOPT** | Same as Stanford — well-validated by two independent implementations. |
| Embeddings cache (hash-based dedup) | **ADOPT** | Simple, high-value optimization for Kimi embedding calls. |
| Messages outside core game state | **ADOPT** | Conversation logs in agent memory, not in RPGJS game state. |
| Async operations decoupled from game loop | **ADOPT** | LLM calls never block RPGJS server tick. Already in our architecture. |
| Step batching (1 write/sec) | **SKIP** | RPGJS handles sync at its own frequency via Socket.IO. |
| 60Hz tick for agents | **SKIP** | We use 15s idle tick + events. Never `onStep`. |
| Convex backend | **SKIP** | We have RPGJS + Express. |
| Two-player conversation limit | **SKIP** | RPGs need flexible multi-NPC interactions. |
| Server-computed pathfinding | **SKIP** | RPGJS has built-in movement. Use `moveTo()`. |
| Auto-pause on browser inactivity | **SKIP** | Our server runs persistently on Railway. |

### Key Lessons

- **~75 agent ceiling** before pathfinding/stability degrades. We target 5-20 NPCs
  per map, well within bounds.
- **1.5s input latency** acceptable for social games, not for action games. Our
  NPC conversations have natural thinking pauses that absorb LLM latency.
- **TypeScript end-to-end** is the right call. Both AI Town and our project validate this.

---

## 3. Voyager (NVIDIA/Caltech/Stanford)

**Paper:** "Voyager: An Open-Ended Embodied Agent with Large Language Models" (2023)
**What it is:** LLM agent that teaches itself to play Minecraft. GPT-4 generates
JavaScript code that's executed via Mineflayer. Discovered 63 unique items (3.3x
baselines). First to unlock diamond tools.

### Architecture: Four Components

1. **Automatic Curriculum** — GPT-4 proposes the next task based on current state,
   inventory, completed/failed tasks. Progressive difficulty.
2. **Action Agent** — GPT-4 generates JavaScript code, incorporating retrieved
   skills as context. Iterative: generate → execute → get feedback → refine (up to
   4 rounds per task).
3. **Critic Agent** — GPT-4 evaluates whether the task succeeded. Returns
   `{ success, critique }` with actionable suggestions.
4. **Skill Library** — Verified JavaScript functions stored in ChromaDB. Indexed
   by semantic description embeddings. Retrieved top-5 by similarity.

### Skill Library (Most Relevant Pattern)

Skills are self-contained async JavaScript functions. Indexed by **what they do**
(LLM-generated description → embedding), not by function name. New skills can
call previously learned skills (compositionality). Skills are stored as files +
ChromaDB vectors + a JSON index.

Retrieval: task description → GPT-3.5 generates plan → plan + environment state
→ embedded → cosine similarity search → top-5 skills injected into prompt.

Skill retrieval **disabled for first 15 tasks** to force diverse base-building.

### What We Take

| Pattern | Disposition | Notes |
|---------|-------------|-------|
| Semantic retrieval via embeddings | **ADOPT** | Index memories/experiences by description embedding, retrieve by situation similarity. |
| Structured text perception (not pixels) | **ADOPT** | Validates our JSON + narrative perception snapshot approach. |
| Critic/self-verification | **ADAPT** | After NPC action, lightweight Kimi K2 check: "does this fit my character?" |
| Feedback loop (act → observe → critique → refine) | **ADOPT** | Already in our architecture: skill fails → error fed back to LLM. |
| Skill description generation for indexing | **ADAPT** | Summarize conversations/events with Kimi K2, embed summaries for retrieval. |
| Automatic curriculum → idle behavior planner | **ADAPT** | Not "what task next" but "what should this NPC do/think about during idle?" |
| QA cache → world knowledge cache | **ADAPT** | Cache NPC lore/location knowledge in vector DB, retrieve contextually. |
| Progressive context expansion (warmup gates) | **ADAPT** | Limit NPC awareness early, expand as situations grow complex. Saves tokens. |
| Code generation as action space | **SKIP** | We use structured tool/function calling. No LLM-generated code execution. |
| Goal-oriented curriculum | **SKIP** | NPCs are character-oriented, not task-oriented. They don't "win." |
| Single-agent architecture | **SKIP** | We have multiple NPCs. AgentManager pool, not one Voyager instance. |
| Superhuman perception (see through walls) | **SKIP** | NPCs perceive what a character at their position could realistically see. |
| Blocking execution | **SKIP** | NPCs must stay responsive. Event-driven, not blocking. |
| Dual-language (Python + JS) | **SKIP** | All TypeScript, same Node.js process. |

### Key Lessons

- **Ablation study:** Removing automatic curriculum caused 93% drop in discovered
  items. Self-direction matters. For NPCs: idle behavior planning prevents "standing
  around doing nothing" syndrome.
- **GPT-3.5 for code gen = 5.7x worse.** Model quality matters for complex
  reasoning. Use Kimi K2.5 (frontier-class) for conversations, K2 for cheap tasks.
- **Skills compound:** Voyager's skill library grew exponentially because new skills
  composed old ones. Our memory system should similarly compound — NPCs that remember
  past conversations can have richer future ones.
- **Hallucinations are real:** GPT-4 invented non-existent Minecraft items. Our NPCs
  will hallucinate too. Skill validation (checking tool call parameters against game
  state) is essential.

---

## Cross-Project Synthesis

### Universal Patterns (All Three Projects Agree)

1. **Structured perception, not raw state.** All three convert game state to
   structured text for the LLM. None use pixel-level perception. Our ~150-token
   JSON+narrative snapshots follow this consensus.

2. **Memory with retrieval scoring.** Stanford and AI Town both use the same
   `recency + importance + relevance` formula. Voyager uses pure cosine similarity.
   We adopt the three-factor formula.

3. **Separate agent logic from game loop.** All three decouple LLM calls from
   the game tick. Stanford uses background threads, AI Town uses Convex actions,
   Voyager uses HTTP bridge. We use our lane queue + async operations.

4. **Tiered model usage.** Stanford (GPT-3.5 for everything), AI Town (configurable),
   Voyager (GPT-4 for code, GPT-3.5 for descriptions). We use Kimi K2 for cheap
   tasks (idle, reflection, summaries) and K2.5 for conversations.

5. **Error tolerance is non-negotiable.** All three projects had LLM failures,
   hallucinations, and latency spikes. Graceful degradation with fallback
   behaviors is essential.

### Our Unique Additions (Not in Any Prior Art)

1. **OpenAI-compatible tool calling.** Stanford used free-text output with
   regex parsing. AI Town uses free-text prompts. Voyager generates code. We use
   structured function calling via Kimi K2/K2.5's OpenAI-compatible API — more
   reliable, type-safe, and validated by the provider.

2. **YAML personality configs.** None of the prior art systems have declarative,
   hot-reloadable personality definitions. We separate character identity from
   agent code.

3. **OpenClaw-inspired lane queue.** Provides serial execution guarantee per
   agent without the complexity of Convex actions or background threads.

4. **Iframe deployment architecture.** Railway hosts the RPGJS game server,
   Lovable builds the frontend wrapper. This separation lets us iterate on game
   logic and UI independently.

5. **Automatic context caching.** Kimi K2/K2.5's automatic caching (75% savings
   on repeated context) means we don't need to implement our own caching layer.
   System prompts and tool definitions are naturally cached across calls.

---

## Architecture Decision Summary

| Decision Area | Our Choice | Rationale (from prior art) |
|---------------|-----------|---------------------------|
| **Thinking model** | Hybrid: event-driven + 15s idle tick | AI Town's continuous tick is wasteful; Stanford's pure event-driven misses idle behavior |
| **Perception format** | Structured JSON + narrative (~150 tokens) | All three projects validate structured text over raw state |
| **Command execution** | OpenAI-compatible tool calling | More reliable than Stanford's regex or Voyager's code gen |
| **Memory retrieval** | Composite scoring (recency + importance + relevance) | Stanford + AI Town both validate this formula |
| **Reflection** | Importance-sum trigger, Kimi K2 for generation | Stanford's approach, adapted for lower conversation volume |
| **Conversation flow** | State machine (detect → approach → participate → reflect) | AI Town's proven three-state model |
| **LLM provider** | Kimi K2 (idle) / K2.5 (conversation) | 5-10x cheaper than GPT-4/Claude at frontier performance |
| **Skill system** | Fixed tool definitions (not code generation) | Voyager's code gen is powerful but too risky for multiplayer |
| **Multi-agent** | AgentManager pool, one lane queue per NPC | None of the prior art handles this well; OpenClaw's pattern is better |
| **Deployment** | Railway (server) + Lovable (frontend iframe) | Clean separation of game server and presentation layer |

---

## References

- Park, J.S., et al. (2023). "Generative Agents: Interactive Simulacra of Human Behavior." arXiv:2304.03442.
- a16z-infra/ai-town. github.com/a16z-infra/ai-town. ARCHITECTURE.md.
- Wang, G., et al. (2023). "Voyager: An Open-Ended Embodied Agent with Large Language Models." arXiv:2305.16291.
- AI Town v2 — Convex Stack Blog. stack.convex.dev/ai-town-v2.
- Voyager Project Page. voyager.minedojo.org.
