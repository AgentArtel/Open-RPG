# Unified Context: Open-RPG + Agent Artel Studio

This document is the single place that explains how the game, the Studio, and the shared database fit together. It points to the canonical source docs in each repo.

---

## The Unified Idea

**Open-RPG** is the runtime -- a multiplayer browser RPG (RPGJS v4) where NPCs are AI agents. Each NPC has a personality, skills, memory, and autonomous behavior powered by LLMs. NPCs perceive the game world through text descriptions, reason via LLM calls, and act through game commands (move, say, look, emote, wait). External APIs are wrapped in game fiction (e.g., a Photographer NPC's "mystical camera" is really a Gemini image generation call gated by an inventory token).

**Agent Artel Studio** is the builder -- a React SPA (built via Lovable) that serves as the admin panel and visual design tool for the game. Studio lets you create and configure NPCs, manage API integrations, build automation workflows, and monitor game activity. It is the game master's toolkit.

**Shared Supabase** is the contract layer -- both apps connect to the same Supabase project. The database is the live contract between Studio and game. When you create an NPC in Studio, it writes a row to `game.agent_configs`. The game server reads that row and spawns the NPC. No deployment or file editing needed.

**Alignment means:** Studio and game use the same schema and tables. Studio writes config, game reads config. Studio reads runtime data (memory, player state), game writes it. Neither calls the other directly -- the database is the integration point.

---

## Where to Find Things

### Game (Open-RPG) -- Cursor's Repo

| What | Path |
|------|------|
| Vision / idea doc | `Open-RPG/.ai/idea/01-idea-doc.md` |
| Project outline (phases) | `Open-RPG/.ai/idea/03-project-outline.md` |
| Idea index | `Open-RPG/.ai/idea/INDEX.md` |
| Feature ideas (05-14) | `Open-RPG/.ai/idea/05-*.md` through `14-*.md` |
| Implementation plans | `Open-RPG/.ai/idea/05a-*.md` through `10a-*.md` |
| Plugin specs | `Open-RPG/.ai/idea/plugins/` |
| Supabase schema reference | `Open-RPG/docs/supabase-schema.md` |
| Migration: game schema | `Open-RPG/supabase/migrations/009_game_schema.sql` |
| Migration: cross-schema grants | `Open-RPG/supabase/migrations/011_studio_cross_schema_access.sql` |
| Game sprint status | `Open-RPG/.ai/status.md` |
| Game task briefs | `Open-RPG/.ai/tasks/` |

### Studio (Agent-Artel-studio) -- Lovable's Repo

| What | Path |
|------|------|
| Studio project vision | `Agent-Artel-studio/docs/Project_Vision.md` |
| Game integration architecture | `Agent-Artel-studio/docs/game-integration/VISION-studio-game-architecture.md` |
| NPC Builder spec | `Agent-Artel-studio/docs/game-integration/NPC-BUILDER-PLAN.md` |
| Schema integration task | `Agent-Artel-studio/docs/game-integration/TASK-game-schema-integration.md` |
| Lovable prompts library | `Agent-Artel-studio/docs/game-integration/LOVABLE-PROMPTS.md` |
| Lovable implementation review | `Agent-Artel-studio/docs/game-integration/LOVABLE-NPC-BUILDER-REVIEW.md` |
| Studio migrations | `Agent-Artel-studio/supabase/migrations/` |
| Studio edge functions | `Agent-Artel-studio/supabase/functions/` |

---

## Database Architecture

### Two Schemas, One Database

| Schema | Owner | Purpose |
|--------|-------|---------|
| `game` | Game server (service_role key) | NPC configs, conversation memory, player state, API integrations |
| `public` | Studio (anon/authenticated key) | Studio workflows, executions, activity logs, Studio-specific data (`studio_*` tables) |

### Game Schema Tables

| Table | Studio's Role | Game's Role |
|-------|--------------|-------------|
| `game.agent_configs` | Full CRUD (create/edit/delete NPCs) | Read on map load, spawn NPCs |
| `game.api_integrations` | Full CRUD (manage API skills) | Read to populate skill registry |
| `game.agent_memory` | Read only (view NPC conversations) | Write (store conversation history) |
| `game.player_state` | Read only (monitor players) | Write (update player positions) |

### Access Patterns

**Studio (React SPA):** Uses `supabase.schema('game').from('table_name')` for all game tables. Uses default schema (no prefix) for `studio_*` tables. Helper: `gameDb() = supabase.schema('game')`.

**Game server (Node.js):** Uses `createClient(url, key, { db: { schema: 'game' } })` so all `.from()` calls target `game.*` by default. Uses service_role key.

### Migrations

| Migration | Repo | Purpose |
|-----------|------|---------|
| `009_game_schema.sql` | Open-RPG | Creates `game` schema, all 4 tables, seed data |
| `011_studio_cross_schema_access.sql` | Open-RPG | Grants Studio roles read/write access to game schema |
| UUID-timestamped migrations | Agent-Artel-studio | Studio's own public schema tables |

---

## Current State (as of 2026-02-14)

### Game Repo (Open-RPG)

- Sprints 0-4 complete: agent core, skills, perception, memory, Supabase persistence, GUI (speech bubbles, conversation log), Railway deploy.
- Sprint 5 (API-as-Identity + Social) is next: modular skill plugins, Photographer NPC + Gemini integration, content store, social feed.
- 4 seed NPCs in the database: Elder Theron, Test Agent, Photographer, Artist.
- 1 API integration: Image Generation (Gemini, `generate_image` skill).

### Studio Repo (Agent-Artel-studio)

- Application shell complete: dashboard, workflow list, execution history, credentials, settings, agent templates.
- Core canvas and workflow builder in development.
- Game integration specs written (NPC Builder, Integrations page, Dashboard stats, Memory Viewer).
- NPC Builder and Integrations pages need implementation -- these are the highest-priority Studio tasks.
- 6 migrations applied to public schema for Studio tables.

### Shared Database

- `game` schema with 4 tables is live.
- Cross-schema grants (migration 011) are applied.
- PostgREST exposes `public`, `studio`, and `game` schemas.
- Seed data present for testing.
