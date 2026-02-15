# Sprint: 2026-02 — Studio + Game Alignment

**Started:** 2026-02-14
**Goal:** Wire Agent Artel Studio to the live game schema (NPC Builder, Integrations, Dashboard stats) while the game repo introduces its modular skill plugin system and Photographer NPC. Keep the shared Supabase database aligned as both repos build on top of it.

This is the first cross-project sprint driven from the orchestrator. The database schema and grants are already in place (migrations 009, 011). Studio needs the UI layer; the game needs the plugin architecture that future integrations depend on. Both must use the same tables, the same query patterns, and the same data contracts.

**Tracks:**
- **Database (D)** — Schema is stable; verify seed data, audit grants, plan any new tables needed for content store.
- **Game (G)** — Modular skill plugin system (TASK-018a), Photographer NPC + Gemini (TASK-018), content store + social feed foundations (TASK-019/020).
- **Studio (S)** — NPC Builder page, Integrations page, Dashboard game stats, Memory Viewer — all using `gameDb()` / `.schema('game')`.
