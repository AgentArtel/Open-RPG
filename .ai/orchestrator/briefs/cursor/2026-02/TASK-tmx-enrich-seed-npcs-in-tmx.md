# TASK-tmx-enrich: Add Seed NPCs to simplemap.tmx

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Open-RPG (game)
**Agent:** Cursor
**Game-repo task:** NEW
**Priority:** Wave 1 (no code deps, start immediately)
**Depends on:** Nothing
**Blocks:** G-5 (TMX parser + sync + CLI — needs real TMX data to test)

---

## Goal

Add the four seed NPCs (elder-theron, test-agent, photographer, artist) as named `<object>` entries in `simplemap.tmx` with correct custom properties and coordinates matching migration 009, so the TMX-to-DB sync pipeline (G-5) has real data to parse and test end-to-end.

## Context

The current TMX files are nearly empty:
- `simplemap.tmx` has only 2 objects: `start` (player spawn, skipped by sync) and `EV-1` (bare point at 290,371 with zero custom properties).
- `simplemap2.tmx` has zero objects.

The 4 seed NPCs exist in `game.agent_configs` (migration 009) with spawn coordinates, but they don't exist as named objects in the TMX. Without TMX data, G-5's sync script has nothing to parse. This task makes Tiled the single source of truth for NPC placement.

## Deliverables

1. **Edit `main/worlds/maps/simplemap.tmx`** — add 4 point objects to the existing object layer:

   | Object name | x | y | entityType | displayName | sprite | role | tools |
   |-------------|---|---|------------|-------------|--------|------|-------|
   | `elder-theron` | 300 | 250 | ai-npc | Elder Theron | female | elder | — |
   | `test-agent` | 450 | 350 | ai-npc | Test Agent | female | — | — |
   | `photographer` | 500 | 200 | ai-npc | Photographer | female | — | generate_image |
   | `artist` | 150 | 400 | ai-npc | Artist | female | — | — |

   Each object has:
   - `name` attribute = the agent_configs ID (slug)
   - `x`, `y` attributes = pixel coordinates from migration 009
   - `<properties>` with `entityType`, `displayName`, `sprite`, and optionally `role` / `tools`
   - `<point/>` element (point object, not rect/polygon)

2. **Update `nextobjectid`** in the `<map>` tag to be higher than the highest new object ID.

3. **Leave `start` and `EV-1` unchanged.**

## Acceptance Criteria

- [ ] `simplemap.tmx` contains 6 objects total: `start`, `EV-1`, `elder-theron`, `test-agent`, `photographer`, `artist`.
- [ ] Each new object has the correct `name`, `x`, `y` attributes.
- [ ] Each new object has `<properties>` with at minimum `entityType="ai-npc"`, `displayName`, `sprite="female"`.
- [ ] `elder-theron` has `role="elder"`.
- [ ] `photographer` has `tools="generate_image"`.
- [ ] Coordinates match migration 009: elder-theron (300,250), test-agent (450,350), photographer (500,200), artist (150,400).
- [ ] `nextobjectid` in `<map>` is updated.
- [ ] The TMX file is valid XML and loads in Tiled without errors.
- [ ] `rpgjs build` passes (TMX changes don't break the build).

## Do

- Use unique `id` attributes for each new object (e.g. 20, 21, 22, 23 — any IDs not already in use).
- Follow the XML format from the TMX plan Phase 0 (provided as reference).
- Keep the file's existing formatting and indentation style.

## Don't

- Don't remove or modify `start` or `EV-1`.
- Don't add objects to `simplemap2.tmx` (not needed for this task).
- Don't change the map's tile layers, tilesets, or dimensions.
- Don't add non-NPC entity types (those can be added later for more thorough testing).

## Reference

- TMX-to-DB sync plan: `.cursor/plans/tmx-to-db_sync_layer_662fb5b6.plan.md` (Phase 0, XML snippet)
- Seed coordinates: `supabase/migrations/009_game_schema.sql` (spawn jsonb for each NPC)
- Current TMX: `main/worlds/maps/simplemap.tmx`
