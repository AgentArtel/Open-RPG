# TASK-G-0: Load NPC Configs from Supabase

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Open-RPG (game)
**Agent:** Cursor
**Game-repo task:** NEW
**Priority:** Wave 1 (**FOUNDATION BLOCKER** — start immediately)
**Depends on:** Nothing
**Blocks:** FOUNDATION GATE (all Wave 2+ work)

---

## Goal

Make the game server load NPC configs from `game.agent_configs` in Supabase as its primary source, so that NPCs created or edited in Studio appear in the game without touching YAML files. YAML loading remains as a fallback for offline development.

## Context

The Studio → DB → Game pipeline is incomplete. Studio writes NPC configs to `game.agent_configs` correctly (S-1 merged), and the database schema is in place (D-1 done, migration 009). But `AgentManager.loadConfigs()` currently reads from YAML files on disk — it never queries Supabase. This means NPCs created in Studio don't appear in the game.

This is the single biggest blocker for the entire sprint. The Foundation Gate cannot pass until the game reads configs from the database. See `foundation.md` "The Gap" for full details.

The database already has an RPC function `get_agent_configs_for_map(p_map_id)` (defined in migration 009) that returns `agent_configs` rows filtered by `spawn.map` and `enabled = true`. This can be used directly.

## Deliverables

1. **Supabase config loading in `AgentManager`** — When Supabase is available (client configured, URL + key present), query `game.agent_configs` as the primary source. Use the existing `get_agent_configs_for_map` RPC or a direct query filtered by `enabled = true`.
2. **DB row → `AgentConfig` mapping** — Parse each database row into the `AgentConfig` TypeScript interface: `id`, `name`, `graphic`, `personality`, `model` (jsonb → `AgentModelConfig`), `skills` (text[] → string[]), `spawn` (jsonb → `AgentSpawnConfig`), `behavior` (jsonb → `AgentBehaviorConfig`), `inventory` (text[] → string[]), `enabled`.
3. **YAML fallback** — If Supabase is unavailable (no URL, no key, connection error), fall back to loading from YAML config files as it does today. Log a warning: `[AgentManager] Supabase unavailable, falling back to YAML configs`.
4. **Map-scoped loading** — `spawnAgentsOnMap(map)` should load only configs where `spawn.map` matches the current map ID, not all configs globally.
5. **Error handling** — Supabase query failures are caught and logged, then fall back to YAML. Never crash the server.

## Acceptance Criteria

- [ ] Game starts with Supabase configured; NPCs from `game.agent_configs` spawn on the map.
- [ ] Create an NPC in Studio → restart game → the new NPC appears on the correct map.
- [ ] Edit an NPC's personality in Studio → restart game → the NPC uses the updated personality.
- [ ] Disable an NPC in Studio (`enabled = false`) → restart game → the NPC does not spawn.
- [ ] Game starts without Supabase configured (no URL/key) → falls back to YAML → existing NPCs spawn as before.
- [ ] Supabase query failure at runtime → warning logged, YAML fallback used, server continues.
- [ ] The 4 existing seed NPCs (elder-theron, test-agent, photographer, artist) behave identically.
- [ ] `rpgjs build` passes.
- [ ] `npx tsc --noEmit` passes (or only pre-existing errors).

## Do

- Use the existing Supabase client from `src/config/supabase.ts` (already configured with `db: { schema: 'game' }` and `service_role` key).
- Use or adapt the `get_agent_configs_for_map` RPC if it fits; otherwise use a direct `.from('agent_configs').select('*').eq(...)` query.
- Keep the `AgentConfig` TypeScript interface unchanged — map DB columns to existing fields.
- Log clearly: `[AgentManager] Loaded N configs from Supabase for map X` or `[AgentManager] Falling back to YAML`.
- Handle the case where Supabase returns 0 rows gracefully (empty map, not an error).

## Don't

- Don't remove YAML loading entirely — it's the dev/offline fallback.
- Don't change the `AgentConfig` interface or `AgentSpawnConfig` shape.
- Don't add new dependencies — the Supabase client already exists.
- Don't modify the database schema or migrations.
- Don't change how `AgentNpcEvent` or `spawnContext` work — only change where configs come from.

## Reference

- Foundation doc: `.ai/orchestrator/foundation.md` (The Gap, Verification Checklist Step 3)
- Current AgentManager: `src/agents/core/AgentManager.ts` (look for `loadConfigs`)
- AgentConfig types: `src/agents/core/types.ts`
- Supabase client: `src/config/supabase.ts`
- Database schema + RPC: `supabase/migrations/009_game_schema.sql` (see `get_agent_configs_for_map`)
- Player hooks (spawn trigger): `main/player.ts` (see `onJoinMap` → `agentManager.spawnAgentsOnMap`)
