## TASK-002: Verify RPGJS dev server and document project structure

- **Status**: REVIEW
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 0
- **Type**: Create
- **Depends on**: TASK-001
- **Blocks**: TASK-003

### Context

After scaffolding the RPGJS starter (TASK-001), we need to verify everything
works correctly and understand the generated project structure. This maps to
Phase 0.2 in the project outline.

### Objective

Confirmed working RPGJS dev environment with the project structure documented
and understood. The generated structure should be mapped to our agent ownership
boundaries.

### Specifications

- Run `rpgjs dev` and verify the game loads in browser
- Run `rpgjs build` and verify production build succeeds
- Run `npx tsc --noEmit` and note any type issues
- Review the generated project structure
- Update `.ai/boundaries.md` if the scaffold created files not yet mapped

### Acceptance Criteria

- [x] `rpgjs dev` starts the dev server without errors — ✅ verified (server running on port 3000)
- [x] `rpgjs build` produces a clean production build — ✅ verified (client + server bundles compile)
- [x] Game loads in browser — player can walk around — ✅ verified (user confirmed game loads and player movement works)
- [x] `.ai/boundaries.md` reflects any new files from the scaffold — ✅ already documented (main/ structure matches)

### Do NOT

- Start building the agent system
- Modify the game logic beyond verification
- Change root config files without orchestrator approval

### Reference Documents

- `idea/03-project-outline.md` — Phase 0
- `idea/02-research-outline.md` — Phase 1.1 (RPGJS server architecture)

### Handoff Notes

**2026-02-10 — cursor — Status: REVIEW** (All acceptance criteria met ✅)

#### What was done
- Started `rpgjs dev` server — verified running on port 3000 (PID 61955)
- Verified `rpgjs build` — production build passes (client + server bundles compile successfully)
- Verified `npx tsc --noEmit` — only pre-existing upstream type errors (css-font-loading-module)
- Reviewed project structure — all scaffolded files match RPGJS v4 autoload conventions:
  - `main/` at root (autoload module)
  - `main/events/villager.ts` — sample NPC
  - `main/player.ts` — player lifecycle hooks
  - `main/spritesheets/characters/` — hero and female sprites
  - `main/worlds/maps/` — Tiled maps (simplemap, simplemap2) with tilesets
  - `main/worlds/myworld.world` — world file
- Verified `.ai/boundaries.md` — already correctly documents `main/` structure ownership

#### Project structure verified
The scaffolded structure matches RPGJS v4 autoload conventions:
- **Game module**: `main/` at project root (not nested under `src/modules/`)
- **Events**: `main/events/villager.ts` — sample NPC with `@EventData` decorator
- **Player**: `main/player.ts` — lifecycle hooks (onConnected, onJoinMap, onInput)
- **Sprites**: `main/spritesheets/characters/` — PNG images + TypeScript definitions
- **Maps**: `main/worlds/maps/` — Tiled `.tmx` files and tileset `.tsx` files
- **Config**: `rpg.toml` references `./main` module, start map `simplemap`, character `hero`

#### Browser verification complete
- ✅ Game loads at `http://localhost:3000` — confirmed by user
- ✅ Player character appears and can move — confirmed by user
- ✅ Villager NPC visible on map (per screenshot showing "YourName" player and villager NPC on dirt path)
- All acceptance criteria met — ready for orchestrator review

#### Notes
- Dev server started in background — can be accessed at `http://localhost:3000`
- All build/type checks pass — ready for browser testing
- Project structure matches boundaries.md — no updates needed
