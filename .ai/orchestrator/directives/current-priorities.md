# Current Priorities

Last updated: 2026-02-14

---

## Priority 1: Studio NPC Builder + Integrations Pages (Lovable)

**Goal:** Ship the NPC Builder and Integrations Manager pages in Agent Artel Studio so NPCs and API integrations can be managed visually instead of via SQL.

**Why now:** The game schema and cross-schema grants are in place. The specs are written. The game has 4 seed NPCs and 1 integration ready for testing. Studio is the missing admin layer.

**Deliverables:**
- NPC Builder page: CRUD for `game.agent_configs` with all form fields
- Integrations page: CRUD for `game.api_integrations`
- Dashboard stats from game tables
- All game queries use `.schema('game')` / `gameDb()`

**Spec:** `Agent-Artel-studio/docs/game-integration/NPC-BUILDER-PLAN.md`

---

## Priority 2: Modular Skill Plugin System (Cursor)

**Goal:** Replace the hardcoded skill map in the game with a plugin-based system (MCP-inspired) so new skills can be added without modifying the core agent runner.

**Why now:** Sprint 5 starts here. The Photographer NPC (TASK-018) depends on this architecture. It also sets the pattern for all future API integrations.

**Deliverables:**
- Skill plugin interface and registry
- Plugin discovery and loading
- Item-gated skill access (inventory tokens)
- Photographer NPC as first proof (Gemini image generation)

**Spec:** `Open-RPG/.ai/idea/14-modular-skill-plugin-architecture.md`, tasks TASK-018a and TASK-018.

---

## Priority 3: Keep Database Schema Aligned

**Goal:** Any schema changes go through the game repo's migrations first, then Studio adapts its queries. No ad-hoc table creation in either repo without the orchestrator's awareness.

**Why now:** Both repos are about to build features on top of the shared schema. Misalignment here causes hard-to-debug failures.

**Rule:** New game tables or columns are proposed via task briefs, reviewed by the orchestrator, and implemented as numbered migrations in `Open-RPG/supabase/migrations/`. Studio adapts its queries to match.
