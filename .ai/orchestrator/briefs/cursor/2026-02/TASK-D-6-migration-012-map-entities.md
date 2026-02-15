# TASK-D-6: Migration 012 — map_entities + map_metadata

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Open-RPG (game)
**Agent:** Cursor (Orchestrator reviews schema before implementation)
**Game-repo task:** NEW
**Priority:** Wave 1 (no code deps, start immediately)
**Depends on:** D-1 (game schema must exist)
**Blocks:** G-5 (TMX parser + sync + CLI)

---

## Goal

Create migration `012_map_entities.sql` that adds two new tables to the `game` schema: `game.map_entities` (all TMX-synced entities) and `game.map_metadata` (per-map metadata). Apply grants matching the migration 011 pattern.

## Context

The TMX-to-DB sync layer needs database tables before it can write. `map_entities` holds all entity types synced from Tiled (NPCs, objects, triggers, areas, spawn-points) — separate from `agent_configs` because most entities are not AI agents. `map_metadata` holds map-level properties (theme, ambient, description). The full schema design is in the approved TMX-to-DB sync plan.

## Deliverables

1. **Single migration file** — `supabase/migrations/012_map_entities.sql` containing:

   **`game.map_entities` table:**
   - `id text NOT NULL` — TMX object name (e.g. "elder-theron", "trig_village_door_01")
   - `map_id text NOT NULL` — derived from TMX filename
   - `entity_type text NOT NULL` — "ai-npc" | "object" | "trigger" | "area-marker" | "spawn-point"
   - `display_name text` — human-readable name
   - `position_x real NOT NULL` — pixel x from TMX
   - `position_y real NOT NULL` — pixel y from TMX
   - `tiled_class text` — TMX class/type attribute
   - `role text` — e.g. "merchant", "sign"
   - `sprite text DEFAULT 'female'`
   - `ai_enabled boolean DEFAULT false`
   - `tools text[] DEFAULT '{}'`
   - `area_id text` — logical area reference
   - `metadata jsonb DEFAULT '{}'` — any extra TMX custom properties
   - `agent_config_id text REFERENCES game.agent_configs(id) ON DELETE SET NULL`
   - `synced_at timestamptz DEFAULT now()`
   - `PRIMARY KEY (id, map_id)`

   **`game.map_metadata` table:**
   - `map_id text PRIMARY KEY`
   - `description text`
   - `theme text`
   - `ambient text`
   - `synced_at timestamptz DEFAULT now()`

2. **Grants (011-aligned):**
   ```sql
   GRANT SELECT ON game.map_entities TO anon;
   GRANT SELECT, INSERT, UPDATE, DELETE ON game.map_entities TO authenticated;
   GRANT ALL ON game.map_entities TO service_role;

   GRANT SELECT ON game.map_metadata TO anon;
   GRANT SELECT, INSERT, UPDATE, DELETE ON game.map_metadata TO authenticated;
   GRANT ALL ON game.map_metadata TO service_role;
   ```

3. **Orphan-behavior comment** — A SQL comment in the migration documenting: deleting a `map_entities` row (e.g. entity removed from TMX and re-synced) does NOT cascade to `agent_configs` — the config row becomes orphaned. This is acceptable; Studio manages orphaned configs.

## Acceptance Criteria

- [ ] Migration runs without error on a fresh database (after migrations 001–011).
- [ ] `game.map_entities` and `game.map_metadata` tables exist with correct columns and types.
- [ ] Composite PK `(id, map_id)` on `map_entities` works (same entity name on different maps).
- [ ] FK `agent_config_id` references `game.agent_configs(id)` with ON DELETE SET NULL.
- [ ] `anon` can SELECT but NOT INSERT/UPDATE/DELETE on both tables.
- [ ] `authenticated` can SELECT, INSERT, UPDATE, DELETE on both tables.
- [ ] `service_role` has ALL privileges on both tables.
- [ ] Orphan behavior is documented in a SQL comment.
- [ ] `rpgjs build` passes.

## Do

- Follow the exact grant pattern from `supabase/migrations/011_studio_cross_schema_access.sql`.
- Use `CREATE TABLE IF NOT EXISTS` for safety.
- Include `COMMENT ON TABLE` for both tables describing their purpose.
- Keep column types and defaults exactly as specified in the TMX-to-DB sync plan.

## Don't

- Don't add indexes beyond the primary keys (can be added later if needed).
- Don't seed any data — that's tmx-enrich + G-5's job.
- Don't modify existing tables or migrations.
- Don't give `anon` write access.

## Reference

- TMX-to-DB sync plan: `.cursor/plans/tmx-to-db_sync_layer_662fb5b6.plan.md` (Phase 1)
- Grant pattern: `supabase/migrations/011_studio_cross_schema_access.sql`
- Game schema: `supabase/migrations/009_game_schema.sql`
