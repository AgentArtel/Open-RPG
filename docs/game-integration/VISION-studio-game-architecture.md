# Agent Artel Studio — Game Integration Architecture

> **Audience:** Lovable AI (Agent Artel Studio development)
>
> This document explains how Studio fits into the larger system: what the game is, what Studio's role is, how data flows between them, and what the Studio should eventually be able to do.

---

## What the Game Is

**Open-RPG** is a multiplayer browser RPG (built on RPGJS v4) where the NPCs are AI agents. Each NPC has a personality, skills, and memory powered by LLMs. Players walk around a tile-based world, talk to NPCs, and the NPCs respond with genuine intelligence — they remember past conversations, make decisions, wander autonomously, and perform real services backed by external APIs.

The key insight of the game: **NPCs are defined by what they can DO, not just what they say.** A Photographer NPC can generate real images via Gemini. A future Musician NPC could generate music via Suno. APIs are wrapped in game fiction — the Photographer's "mystical camera" is really a Gemini image generation call gated by an inventory token.

The game runs on a Node.js server with Express + Socket.IO. Players connect via browser. AI NPCs think on timer-based idle ticks (~15s) and respond to player interactions in real-time.

---

## What Studio Is

**Agent Artel Studio is the admin panel and visual builder for this game.**

Think of it like a game master's toolkit:
- **The game** is the runtime — where NPCs live, players explore, and things happen
- **Studio** is the design tool — where you create NPCs, wire up API integrations, build automation workflows, and monitor what's happening in the game

Studio and the game share the **same Supabase database**. When you create an NPC in Studio, it writes a row to `game.agent_configs`. The next time the game server loads that map, it reads that row and spawns the NPC. No deployment, no file editing — the database is the live contract.

---

## The Shared Database

Both apps connect to the same Supabase project. They use different schemas:

| Schema | Owner | Purpose |
|--------|-------|---------|
| `game` | Game server (service_role key) | NPC configs, conversation memory, player state, API integrations |
| `public` | Studio (anon/authenticated key) | Workflows, executions, activity logs, Studio-specific data (`studio_*` tables) |

**Studio can read and write game schema tables** via `.schema('game')`. The access grants are set up (migration 011). See `TASK-game-schema-integration.md` for the exact query patterns.

### Tables and What They Mean

#### Game Tables (in `game` schema) — Studio manages these

| Table | What It Is | Studio's Role |
|-------|-----------|---------------|
| `agent_configs` | Each row = one AI NPC in the game. Personality, skills, spawn location, behavior, model selection, inventory. | **Full CRUD** — create, edit, delete, toggle NPCs |
| `api_integrations` | Catalog of API-backed skills. Each row = one external API wrapped as a game skill (e.g., image generation via Gemini). | **Full CRUD** — add/remove integrations, manage what skills exist |
| `agent_memory` | Every message in every NPC conversation. Role (user/assistant/system/tool), content, timestamps. | **Read only** — view conversation logs, debug NPC behavior |
| `player_state` | Where each player was last seen: map, position, direction, state data. | **Read only** — monitor active players |

#### Studio Tables (in `public` schema) — Studio's own data

| Table | What It Is |
|-------|-----------|
| `studio_workflows` | Visual workflows built in the canvas editor. Nodes + connections stored as JSON. |
| `studio_executions` | History of workflow runs: status, duration, per-node results. |
| `studio_activity_log` | Activity feed for the dashboard. |
| `studio_agent_memory` | Chat testing conversation history. |

---

## How Studio Features Map to Game Concepts

### NPC Builder → `game.agent_configs`

The most important Studio page. Every field in the NPC form directly controls how an NPC behaves in the game:

| What You Set in Studio | What Happens in the Game |
|----------------------|--------------------------|
| **Name** | Shown above the NPC sprite as a floating label |
| **Personality** (textarea) | Becomes the LLM system prompt — defines how the NPC thinks and speaks |
| **Graphic** (male/female) | Which spritesheet the NPC uses (their visual appearance) |
| **Skills** (checkboxes) | Which tools the LLM can use: `move` (walk around), `say` (speak), `look` (observe), `emote` (show emotion), `wait` (pause), plus API skills like `generate_image` |
| **Spawn map + coordinates** | Where the NPC appears on which map when the game loads |
| **Idle Interval** (ms) | How often the NPC "thinks" autonomously when no player is talking to them (lower = more active) |
| **Patrol Radius** (tiles) | How far the NPC wanders during idle behavior |
| **Greet on Proximity** | Whether the NPC automatically says hello when a player walks near |
| **Model** (idle/conversation) | Which LLM model to use: cheaper model for idle thoughts, smarter model for real conversations |
| **Inventory** (token items) | Which API integrations the NPC can use (e.g., `image-gen-token` enables the Photographer to generate images) |
| **Enabled** (toggle) | On/off switch — disabled NPCs don't load in the game at all |

When you save an NPC in Studio, the game server picks it up on the next map load. No restart needed for new NPCs; existing NPCs update when the map reloads or the server restarts.

### Integrations Manager → `game.api_integrations`

Each integration connects a real-world API to the game through a skill:

```
Integration row in database:
  name: "Image Generation"
  skill_name: "generate_image"
  required_item_id: "image-gen-token"
  requires_env: ["GEMINI_API_KEY"]

What this means in the game:
  - A Supabase Edge Function named "generate-image" handles the actual API call
  - Any NPC with "image-gen-token" in their inventory and "generate_image" in their skills
    can ask the LLM to generate an image, and the game will call Gemini
  - The GEMINI_API_KEY must be set as a Supabase secret (lives on the edge, never in the game server)
```

**The pattern for every future integration is the same:**
1. Add a row to `api_integrations` (via Studio)
2. Deploy a Supabase Edge Function for the API call
3. Create a token item in the game code
4. Give an NPC the skill name and token in Studio

Planned integrations:

| Integration | API | NPC Role | Token |
|-------------|-----|----------|-------|
| Image Generation | Gemini Imagen | Photographer | `image-gen-token` |
| Music Generation | Suno / Udio | Musician | `music-gen-token` |
| Video Generation | Gemini / Runway | Seer | `video-gen-token` |
| Voice Generation | ElevenLabs / Gemini TTS | Bard | `voice-gen-token` |
| Web Search | Google / Tavily | Scholar | `search-token` |
| Email | Gmail API | Mailman | `mail-token` |

### Workflow Builder → Future NPC Automation

The n8n-style workflow builder is Studio's **existing** core feature. Here's how it connects to the game in the future:

**Phase 1 (now):** Workflows are standalone AI pipelines — trigger → AI agent → tool → output. They run inside Studio's own execution engine.

**Phase 2 (future):** Workflows become assignable to NPCs as "jobs." A workflow like:
```
[Chat Trigger] → [AI Agent] → [Generate Image] → [Store Result]
```
...could become the Photographer NPC's behavior when a player says "take my photo."

**Phase 3 (further future):** Session recordings from the game (player actions captured as structured logs) become importable as workflow templates. A player demonstrates a task → the recording becomes a workflow → the workflow is assigned to an NPC → the NPC replays the player's actions.

The n8n import capability already exists. The missing piece is a `run_workflow` game skill and a server-side workflow runner — those will be built in the game repo when we get there.

### Dashboard → Live Game Monitoring

The dashboard should show real-time game stats by querying game schema tables:
- Active NPCs (count of enabled `agent_configs`)
- Player Messages (count of `agent_memory` rows where role = 'user')
- API Integrations (count of enabled `api_integrations`)
- Online Players (count of `player_state` rows)

### Memory Viewer → NPC Debugging

When editing an NPC, a "Memory" tab should show their recent conversation history from `game.agent_memory`. This is invaluable for debugging — you can see exactly what the NPC said, what the player said, and what tool calls the NPC made.

### Credentials → API Key Management

The Credentials page manages API keys for integrations. These keys are stored in Studio and set as Supabase secrets for Edge Functions. The game server never sees raw API keys — everything goes through the edge.

---

## The Token Economy (How Skills Are Gated)

This is a unique pattern worth understanding. In this game, **API access is gated by inventory items:**

1. An **API integration** defines a skill (e.g., `generate_image`) and a **required token** (e.g., `image-gen-token`)
2. The token is a game item — it exists in the game's item database
3. An NPC must have the token in their **inventory** to use the skill
4. Studio manages this: when you check an API skill for an NPC, Studio auto-adds the required token to their inventory

This creates a natural RPG progression system:
- Want the Photographer to generate images? Give her the `image-gen-token`
- Want to add voice synthesis to the Bard? Give him the `voice-gen-token`
- Future: players could earn/trade tokens to unlock NPC services for themselves

---

## How Both Apps Share the Database — Visual Summary

```
┌─────────────────────────────┐         ┌─────────────────────────────┐
│      AGENT ARTEL STUDIO     │         │         RPGJS GAME          │
│    (Lovable / React SPA)    │         │   (Node.js Game Server)     │
│                             │         │                             │
│  NPC Builder ─── writes ──────────►  agent_configs  ◄─── reads ──── AgentManager
│                             │         │                             │
│  Integrations ── writes ──────────►  api_integrations ◄── reads ── SkillRegistry
│                             │         │                             │
│  Memory Viewer ◄─ reads ──────────── agent_memory ─── writes ───── AgentMemory
│                             │         │                             │
│  Dashboard ◄──── reads ──────────── player_state ─── writes ───── player.ts
│                             │         │                             │
│  Workflow Builder ── writes ──► studio_workflows                   │
│  (future: assignable to NPCs)│        │                             │
│                             │         │                             │
│  supabase anon key          │         │  supabase service_role key  │
│  .schema('game') for game   │         │  db: { schema: 'game' }     │
└─────────────────────────────┘         └─────────────────────────────┘
                │                                       │
                └───────── Same Supabase DB ────────────┘
```

---

## What to Build First (Priority Order)

1. **NPC Builder page** — CRUD for `game.agent_configs`. Immediate value: visual NPC management instead of SQL/YAML editing.
2. **Integrations page** — CRUD for `game.api_integrations`. Manage which API skills exist.
3. **Dashboard stats** — Live counts from game tables. Shows the system is connected.
4. **Memory Viewer** — Read `game.agent_memory` for NPC debugging.
5. **Workflow ↔ NPC linking** (future) — Assign workflows as NPC jobs.

See `TASK-game-schema-integration.md` for detailed specs and `LOVABLE-PROMPTS.md` for copy-paste prompts.

---

## Key Principles

- **The database is the contract.** Studio writes config, game reads config. No direct API calls between them.
- **Game schema queries MUST use `.schema('game')`** — Studio's default schema is `public`.
- **Studio is the design tool, game is the runtime.** Studio never runs game logic; game never shows admin UI.
- **API keys stay on the edge.** Credentials go into Supabase secrets for Edge Functions, never into the game server or frontend.
- **NPCs are defined by what they can do.** Skills + inventory tokens = capabilities. Studio manages both.
