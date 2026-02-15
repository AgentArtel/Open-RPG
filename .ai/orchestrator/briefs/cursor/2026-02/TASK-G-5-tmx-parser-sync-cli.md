# TASK-G-5: TMX Parser + Sync Logic + CLI Script

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Open-RPG (game)
**Agent:** Cursor
**Game-repo task:** NEW
**Priority:** Wave 1 (after D-6 + tmx-enrich)
**Depends on:** D-6 (map_entities tables), tmx-enrich (real TMX data)
**Blocks:** G-6 (auto-sync on server start), FOUNDATION GATE

---

## Goal

Build the TMX-to-DB sync pipeline: a parser that reads Tiled map files, a sync module that upserts entities and metadata to Supabase, and a CLI script to run it. This makes Tiled the source of truth for entity placement while preserving Studio as the source of truth for AI configuration.

## Context

The TMX-to-DB sync layer sits between Tiled (map editor) and the database. It feeds initial placement and metadata into `game.map_entities` and `game.map_metadata` so the game world can be designed visually in Tiled and then wired/configured through Studio. The full architecture, property mapping, and entity-type derivation are defined in the approved TMX-to-DB sync plan.

Codecamp's `entitySync.ts` provides a reference implementation using `fast-xml-parser` for TMX parsing and a world-file-based map discovery pattern.

## Deliverables

1. **`src/sync/parseTmx.ts`** — Reusable TMX parser module:
   - Read the world file at `main/worlds/myworld.world` to discover all map TMX paths.
   - For each TMX file, use `fast-xml-parser` to parse the XML.
   - Extract **map-level properties** (`description`, `theme`, `ambient`) from `<map><properties>`.
   - Extract **all named objects** from `<objectgroup>`, skipping objects named `start`.
   - For each object, map TMX attributes and custom `<property>` children to the `MapEntity` structure per the plan's property mapping table:

     | TMX Source | DB Column |
     |------------|-----------|
     | `@_name` | `id` |
     | filename (sans .tmx) | `map_id` |
     | `properties.entityType` or inferred | `entity_type` |
     | `properties.displayName` or name | `display_name` |
     | `@_x` | `position_x` |
     | `@_y` | `position_y` |
     | `@_class` / `@_type` | `tiled_class` |
     | `properties.role` | `role` |
     | `properties.sprite` | `sprite` |
     | `properties.aiEnabled` | `ai_enabled` |
     | `properties.tools` (comma-split) | `tools` |
     | `properties.areaId` | `area_id` |
     | remaining properties | `metadata` (jsonb) |

   - Entity type derivation:
     - `entityType="spawn-point"` → spawn-point
     - `entityType="object-api"` → object
     - `entityType="area-marker"` → area-marker
     - `entityType="trigger"` → trigger
     - has `@_type` attribute or `entityType="ai-npc"` → ai-npc
     - default → npc

2. **`src/sync/syncMapEntities.ts`** — Sync logic:
   - **Upsert** all parsed entities to `game.map_entities` (on conflict `id, map_id`).
   - **Delete** entities that are in DB but NOT in the current TMX parse for that map (entity was removed from Tiled).
   - **Upsert** map metadata to `game.map_metadata`.
   - For `ai-npc` entities: create a **skeleton** `game.agent_configs` row if one does NOT already exist, with:
     - `id` from the entity name (slug)
     - `name` from `display_name`
     - `graphic` from `sprite`
     - `personality` = `''` (empty — to be filled in Studio)
     - `spawn` = `{"map": mapId, "x": position_x, "y": position_y}`
     - `enabled` = `false` (requires Studio to enable after configuring)
   - **Critical safety rule:** If an `agent_configs` row already exists for this ID, the sync updates ONLY `spawn.x`, `spawn.y`, `spawn.map` (placement) and `graphic` (sprite). It does NOT touch `personality`, `skills`, `model`, `behavior`, `inventory`, or `enabled`. Studio edits are preserved.
   - Link the `agent_config_id` FK in `map_entities` to the config row.

3. **`scripts/sync-maps.ts`** — CLI entry point:
   - `npx tsx scripts/sync-maps.ts` — sync all maps discovered via world file.
   - `npx tsx scripts/sync-maps.ts simplemap` — sync a single map.
   - Output summary: entities created/updated/deleted per map, skeleton configs created.
   - Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.

4. **`package.json` changes:**
   - Add `fast-xml-parser` as a dependency.
   - Add script: `"sync-maps": "tsx scripts/sync-maps.ts"`.

5. **`.env.example`** — Document `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` if not already present.

## Acceptance Criteria

- [ ] `npx tsx scripts/sync-maps.ts` runs and syncs all maps from `myworld.world`.
- [ ] `npx tsx scripts/sync-maps.ts simplemap` syncs only `simplemap`.
- [ ] After sync, `game.map_entities` contains rows for all TMX objects (except `start`).
- [ ] After sync, `game.map_metadata` contains a row for each map with map-level properties.
- [ ] For ai-npc entities without an existing `agent_configs` row: a skeleton config is created with `enabled = false` and empty personality.
- [ ] For ai-npc entities with an existing `agent_configs` row: only `spawn` and `graphic` are updated; all other fields are untouched.
- [ ] Removing an object from the TMX and re-syncing deletes the corresponding `map_entities` row.
- [ ] The CLI prints a clear summary of what was synced.
- [ ] All errors are caught — sync failures produce error messages, not crashes.
- [ ] `rpgjs build` passes.
- [ ] `npx tsc --noEmit` passes (or only pre-existing errors).

## Do

- Use `fast-xml-parser` with `ignoreAttributes: false` and `attributeNamePrefix: '@_'` (same as Codecamp reference).
- Use the existing Supabase client from `src/config/supabase.ts`.
- Follow the upsert pattern from the TMX plan Phase 3.
- Log with `[TMX-Sync]` prefix for all console output.
- Handle edge cases: empty maps, maps with no object layers, objects with no properties.

## Don't

- Don't modify existing tables (`agent_configs`, `api_integrations`, etc.).
- Don't overwrite Studio-edited fields in `agent_configs` (personality, skills, model, behavior, inventory, enabled).
- Don't use dynamic `fs.readdirSync` for map discovery — read the world file.
- Don't add the auto-sync server hook — that's G-6.
- Don't skip the delete step (orphaned `map_entities` rows from removed TMX objects must be cleaned up).

## Reference

- TMX-to-DB sync plan: `.cursor/plans/tmx-to-db_sync_layer_662fb5b6.plan.md` (Phases 2–4)
- Codecamp reference: `entitySync.ts` pattern (fast-xml-parser, world file discovery, property extraction)
- Property mapping table: TMX plan Phase 2
- Entity type derivation: TMX plan Phase 2
- Sync upsert pattern: TMX plan Phase 3
