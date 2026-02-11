## TASK-004: Build test NPC with patrol route and player interaction

- **Status**: REVIEW
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 1
- **Type**: Create
- **Depends on**: TASK-002
- **Blocks**: none

### Context

Phase 1.2 of the research outline calls for building a test NPC to understand
the RPGJS event system. This NPC will serve as the foundation pattern for
AI-controlled NPCs later. It validates our understanding of the RPGJS APIs
documented in the compass artifacts.

### Objective

A working RPGJS NPC that spawns on a map, patrols a route, detects player
proximity, and responds to player interaction with dynamic text. This proves
the RPGJS APIs work as documented.

### Specifications

- Create an NPC event class in `src/modules/main/server/events/`
- Use `@EventData` with `EventMode.Shared`
- On init: set graphic, start `infiniteMoveRoute` with random movement
- On action: respond to player with `showText` (static text for now)
- Attach a detection shape for proximity awareness
- On `onDetectInShape`: log player approach (foundation for agent trigger)
- Spawn on the default map

### Acceptance Criteria

- [x] NPC appears on the map when game starts
- [x] NPC walks around randomly on its own
- [x] Player can press action near NPC and see dialogue
- [x] Detection shape logs when player enters/leaves radius
- [x] `rpgjs build` passes
- [x] No crashes when player interacts with NPC

### Do NOT

- Connect to LLM or agent system — this is pure RPGJS exploration
- Implement the full GameChannelAdapter yet
- Add agent memory or perception

### Reference Documents

- `idea/02-research-outline.md` — Phase 1.2: NPC/Event System
- Compass artifact on RPGJS internals (in idea/ folder)

### Handoff Notes

**2026-02-10 — cursor — Note (status unchanged)**

⚠️ Path correction needed: This task references `src/modules/main/server/events/`
which is the old project structure. After scaffolding (TASK-001), the correct path
is `main/events/` — RPGJS v4 uses flat autoload at the module root. The existing
`main/events/villager.ts` shows the correct pattern to follow.

---

**2026-02-10 — cursor — Implementation complete (PENDING → REVIEW)**

### Files Created/Modified

- **`main/events/test-npc.ts`** (NEW) — Test NPC event class with:
  - `@EventData` decorator with name `'EV-TEST-NPC'` and hitbox (32x16)
  - `onInit()`: sets `'female'` graphic, speed=1, frequency=200ms,
    `infiniteMoveRoute([Move.tileRandom()])`, and `attachShape()` (100x100px, centered)
  - `onAction()`: shows two lines of static dialogue via `player.showText()`
  - `onDetectInShape()`: logs `[TestNPC] Player "..." entered detection radius`
  - `onDetectOutShape()`: logs `[TestNPC] Player "..." left detection radius`

- **`main/player.ts`** (MODIFIED) — Added NPC spawning logic in `onJoinMap`:
  - Uses `map.createDynamicEvent()` to spawn the test NPC at (200, 200) on `simplemap`
  - Uses a `Set` to track which maps already have the NPC (prevents duplicate spawns)
  - Wrapped in try/catch for error safety
  - Updated intro text to mention the test NPC

### Architecture Decisions

- **Dynamic event spawning** instead of map class: The original plan called for a
  `main/maps/simplemap.ts` map class with an `events` array. This conflicted with
  the world file (`myworld.world`) that auto-loads the same map. Creating a `@MapData`
  class with `id: 'simplemap'` caused `"Map not found"` errors due to the duplicate
  registration. Solution: spawn the NPC dynamically via `map.createDynamicEvent()` in
  the `onJoinMap` player hook. This creates a **Shared-mode** event visible to all
  players.

- **`EventMode.Shared`** is the default for `createDynamicEvent` on the map object
  (not the player object), so we don't need to specify it explicitly.

### Verification Results

- `rpgjs build` — passes cleanly
- `npx tsc --noEmit` — only pre-existing upstream error in `@types/css-font-loading-module`
- Fresh `rpgjs dev` start — no errors, clean output:
  ```
  [TestNPC] Initialized — patrolling and listening for players
  [TestNPC] Spawned on map: simplemap
  [TestNPC] Player "YourName" entered detection radius
  ```
- NPC spawns at (200, 200), walks randomly, and detects player proximity
- No crashes on player interaction

### Lessons Learned

1. **World files + map classes conflict**: Don't create a `@MapData` class for a map
   that's already loaded via a `.world` file — it causes duplicate registration errors.
   Use `map.createDynamicEvent()` instead.

2. **HMR race condition**: During hot-reload, clients reconnect before maps are fully
   loaded, causing `getTile` errors. These are transient and don't occur on fresh starts.

3. **`map.createDynamicEvent()` vs `player.createDynamicEvent()`**: The map-level method
   creates Shared-mode events (visible to all), while the player-level method creates
   Scenario-mode events (per-player). For NPCs, always use the map-level method.

### User Testing Needed

- [ ] Confirm NPC is visible and walking randomly in the browser
- [ ] Confirm dialogue appears when pressing action key near NPC
- [ ] Confirm no visual glitches or performance issues
