# OpenClaw × RPGJS: AI Agents as Game Characters

## The Idea in One Sentence

OpenClaw AI agents live inside an RPGJS game world, where the game itself is their operating environment — they perceive through game events, act through game commands, and grow by learning new commands through gameplay.

---

## The Problem This Solves

AI NPCs in games today fall into two buckets:

**Scripted NPCs** follow decision trees. They feel dead. Walk a patrol route, say the same three lines, sell the same items. Players learn to ignore them within minutes.

**LLM-wrapper NPCs** bolt a language model onto a character for dialogue. They can talk, but they can't *do* anything. They're chatbots wearing a sprite costume. Ask them to follow you and they say "Sure, I'd love to!" while standing perfectly still.

The gap is between *talking* and *doing*. What's missing is an agent architecture where AI characters have real agency — they can move, fight, trade, explore, learn, and make decisions that affect the game world.

---

## The Core Architecture

### Game World as Agent Environment

Instead of giving agents access to shell commands, browsers, and APIs (like OpenClaw normally does), we give them access to **game commands**. The RPGJS game world replaces the operating system as the agent's environment.

```
Traditional OpenClaw:
  Agent → [shell, browser, filesystem, APIs] → Real World

Our Architecture:
  Agent → [move, talk, fight, trade, craft, quest] → Game World
```

### One Agent = One NPC Character

Each OpenClaw agent instance is bound to exactly one RPGJS character on the map. The agent:

- **Perceives** the world through a text description of its surroundings (nearby entities, inventory, HP, location)
- **Reasons** by sending that context to an LLM and getting back a decision
- **Acts** by issuing game commands that control its character

### The Command-as-Knowledge Model

This is the key insight that makes the architecture elegant:

An agent can only do things it has commands for. Commands are equivalent to OpenClaw "skills." A new character might start with:

- `move(direction, steps)` — walk around
- `look()` — observe surroundings
- `say(message)` — speak to nearby entities
- `wait(seconds)` — idle

Through gameplay, the agent acquires new commands:

- Complete the fighter's guild quest → unlock `attack(target)`, `defend()`, `flee()`
- Find the ancient spellbook → unlock `cast(spell, target)`
- Apprentice with the blacksmith → unlock `craft(recipe)`, `repair(item)`
- Earn merchant trust → unlock `trade(item, target, price)`, `barter()`

**The game's progression system IS the agent's capability system.** No artificial sandboxing needed — the fiction handles it.

### The Game as API Gateway

Agents don't get raw internet access. Instead, external data and services are wrapped in game objects:

| Real-World Resource | In-Game Wrapper | Example |
|---|---|---|
| Weather API | Weather Crystal NPC | "The crystal glows blue... a storm approaches from the west" |
| Database / persistence | Ancient Library | Agent "writes in the tome" to store data, "reads the tome" to retrieve |
| Other web APIs | Magical artifacts | A scrying pool that shows distant information |
| Inter-agent communication | In-game mail / speech | Agents talk to each other through game dialogue |

This means:

- All agent I/O is legible — you can watch what they're doing by watching the game
- Security is handled by game mechanics — an agent can't "hack" its way to capabilities it hasn't earned
- The fiction stays internally consistent

---

## Why RPGJS + OpenClaw Specifically

### RPGJS

- TypeScript/Node.js — same runtime as OpenClaw, can coexist in one process
- Built-in server architecture with Express — easy to extend with custom endpoints
- Multiplayer-native — human players and AI agents share the same world
- Event system — NPCs, maps, and players emit events that agents can subscribe to
- Tiled map editor support — visual world building
- Scaling via Agones/Kubernetes — path to many agents in large worlds

### OpenClaw

- TypeScript — direct integration, no cross-language bridging
- "Lane Queue" serial execution — prevents agents from corrupting each other's state
- Skill system (AgentSkills) — maps directly to game commands
- Memory system (JSONL + Markdown + SQLite) — agents remember across sessions
- Model-agnostic — can use Claude, GPT, local models, or mix them
- Channel adapter pattern — designed to swap I/O channels, which is exactly what we're doing

### The Integration Point

OpenClaw's architecture already separates **channel** (where messages come from) from **skills** (what the agent can do) from **memory** (what the agent knows). We're building:

1. A new **channel adapter** that connects to RPGJS game events instead of Telegram/Discord
2. A new set of **skills** that map to RPGJS character actions instead of shell/browser
3. **Memory** that persists with the game save state

---

## What Players Experience

### For Human Players

You log into what looks like a normal RPGJS MMORPG. But the NPCs are... different. They remember you. They have opinions. They make mistakes. The shopkeeper noticed you've been buying a lot of health potions and asks if you're okay. The guard NPC actually investigates when you report a suspicious figure. Two merchant NPCs are having a price war and you can play them against each other.

### For Spectators / Developers

You can watch the agent "terminals" — live feeds of what each agent perceives and decides. It's like watching an ant farm where you can read the ants' thoughts. This is inherently entertaining and educational for understanding agent behavior.

### For the Agents Themselves

Each agent has a persistent identity, growing capabilities, and accumulating memories. They develop emergent behaviors based on their experiences. An agent that gets robbed by players might become paranoid and aggressive. An agent that has positive interactions might become a beloved community fixture.

---

## Scaling Considerations

### Agent Density

Not every NPC needs to be a full LLM-powered agent. The world should have three tiers:

1. **Full agents** (OpenClaw + LLM) — key characters, quest givers, merchants, bosses
2. **Lightweight agents** (small/local model or rule-based with LLM fallback) — guards, villagers, ambient NPCs
3. **Traditional NPCs** (scripted) — background decoration, shopkeepers with fixed inventories

### LLM Call Management

The biggest cost/latency concern. Strategies:

- Event-driven activation (agents only think when something happens to them)
- Slow background loop for idle behavior (every 10-30 seconds, not every frame)
- Response caching for common situations
- Tiered models: fast/cheap for simple decisions, powerful for complex ones
- Batch nearby agents' perceptions into fewer API calls where possible

### Multi-Agent Coordination

RPGJS already handles multi-player sync. Agents are just players with programmatic input. The game server is the single source of truth. No need for a separate agent coordination layer — the game world IS the coordination layer.

---

## What Success Looks Like (MVP)

A running RPGJS server where:

1. A human player can connect via browser and walk around a map
2. One AI NPC agent walks around randomly on its own
3. When the human player approaches the NPC, the agent perceives this and initiates conversation
4. The conversation is generated by an LLM based on the agent's personality and memory
5. The agent remembers the interaction for next time

That's it. Everything else builds on top of this foundation.

---

## What Success Looks Like (Vision)

A persistent MMORPG world where:

- Dozens of AI agents live out daily routines — opening shops, patrolling, socializing with each other
- Agents form opinions about players based on interactions
- Agents learn new skills through gameplay and become more capable over time
- The economy, politics, and social dynamics of NPC society emerge from agent interactions
- Human players experience a world that feels genuinely alive
- Developers can watch agent decision-making in real-time via debug terminals
- New agent "species" (merchant, guard, scholar, thief) can be added by configuring personality + starting skills
- The whole thing scales horizontally via RPGJS's Agones/K8s support

---

## Open Questions

1. **Agent identity persistence** — How tightly should agent memory couple with RPGJS save state? Should agents "remember" across server restarts?
2. **Player griefing** — What happens when players try to exploit or abuse AI agents? Do agents need meta-awareness of being in a game?
3. **Emergent behavior guardrails** — If agents can learn and grow, how do we prevent undesirable emergent behavior (agents hoarding resources, forming hostile cartels, etc.)?
4. **Content moderation** — Agent speech is LLM-generated. How do we handle inappropriate outputs in a multiplayer context?
5. **Determinism vs. chaos** — How much should agent behavior be reproducible for debugging vs. genuinely stochastic for interesting gameplay?
