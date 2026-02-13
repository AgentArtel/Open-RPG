---
name: ""
overview: ""
todos: []
isProject: false
---

# Builder Dashboard — Phase 2 Plan

Plan for: **on-screen Builder button**, **persistence**, **static objects + object API events**, and **sprite/image selection**.

---

## 1. On-screen Builder button (web/mobile)

**Goal:** A visible button (like the existing "A" action button) that opens the builder so keyboard-less users can access it.

**Approach:**

- Add a **floating Builder button** in the same layer as the builder dashboard GUI (or a small always-visible HUD).
- On click/tap, call `**rpgEngine.controls.applyControl('builder-dashboard')**` so the server receives the same input as pressing B and opens the GUI.
- Reuse the pattern from `@rpgjs/mobile-gui`: the controls component uses `inject: ['rpgEngine']` and `this.rpgEngine.controls.applyControl(Control.Back)` for the menu. We do the same with the string `'builder-dashboard'` (the action name from `rpg.toml`).

**Options:**

- **A)** Add a second button to the existing mobile-gui controls area (if we can extend it or add a sibling).
- **B)** Add a small **Builder** button in our own GUI layer that is always visible when the game is loaded (e.g. top-left or next to the A button), only when builder is not open.
- **C)** Add the Builder option to the **main menu** (Escape / Back) so "Builder" appears as a menu item and opens the dashboard.

**Recommended:** B — a single floating "Builder" button that calls `applyControl('builder-dashboard')`, styled to match the existing A button so it feels consistent on web/mobile.

**Files:** New Vue component (e.g. `main/gui/builder-button.vue`) registered in the client module, or add to an existing HUD component; ensure it uses `v-propagate` if it sits over the canvas so pointer events are correct.

---

## 2. Persistence (builder placements survive restart)

**Goal:** Every placement (AI NPC, scripted NPC, static object, API object) is stored and re-created when the server starts or when a player joins the map.

**Approach:**

- **Store** each placement in a **Supabase table** (we already use Supabase for agent memory). Same project, new table.
- **Load** placements on **map load** (or when the first player joins a map): query by `map_id`, then for each row call the same logic we use for "place" (createDynamicEvent / spawnAgentAt with stored type, id, x, y, graphic, etc.).
- **Idempotency:** Use a stable id per placement (e.g. UUID generated when placing) so we don’t double-spawn. Optionally track "already applied" in memory per map so we only apply rows once per map per server lifecycle.

**Schema (example):**

```sql
create table if not exists builder_placements (
  id         uuid        primary key default gen_random_uuid(),
  map_id     text        not null,
  x          int         not null,
  y          int         not null,
  type       text        not null check (type in ('ai-npc', 'scripted', 'static', 'api')),
  type_id    text        not null,   -- e.g. 'elder-theron', 'guard', 'tree', 'api-weather'
  graphic    text        null,       -- spritesheet graphic ID
  extra      jsonb       not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_builder_placements_map on builder_placements (map_id);
```

**Flow:**

- **Place:** Server receives `place` from GUI → create dynamic event as today → **insert row** into `builder_placements` (map_id, x, y, type, type_id, graphic, extra).
- **On map load / first player join:** If we haven’t loaded this map’s placements yet, **select * from builder_placements where map_id = ?**, then for each row call the same spawn/place logic (spawnAgentAt, createDynamicEvent with the right event class, etc.). Skip or replace if we need to avoid duplicates (e.g. by not re-running if we already applied this map’s placements this run).

**Files:** New migration `002_builder_placements.sql`, new module e.g. `src/builder/persistence.ts` or in `main/` that uses Supabase client to insert/select; call load from `onJoinMap` (or map lifecycle) and save from the existing `gui.on('place')` handler.

---

## 3. Static objects and object API events

**Goal:** Builder can place not only AI NPCs and scripted NPCs, but also **static objects** (decor, props) and **object API events** (events that can call an API or have custom behavior).

**Definitions:**

- **Static object:** An `RpgEvent` that has a **graphic** (sprite) and optionally a **hitbox**, but **no or minimal logic** (no dialogue, no AI). Good for trees, rocks, chests, signs. Can use a generic `StaticObjectEvent` class that reads `graphic` (and maybe `name`/label) from spawn context or from the placement row.
- **Object API event:** An `RpgEvent` that represents an "API-backed" object: e.g. when the player interacts, it could call an external API or trigger a webhook. For phase 2 we can add the **type** and **registry** entry; the actual API call can be a stub or a single config-driven HTTP call so the pattern is in place.

**Implementation:**

- **Registry:** Extend the server-side place handler (and any config) so that in addition to `ai-npc` and `scripted` we have:
  - `static` — type_id could be a simple key (e.g. `tree`, `rock`) or a generic "static" with `extra.label`; event class = `StaticObjectEvent` (new). It uses `graphic` from the placement (or from a small static object config).
  - `api` — type_id identifies which API object (e.g. `api-weather`); event class = `ApiObjectEvent` (new) or similar; behavior can be "onAction → call API and show result" (stub or real).
- **Event classes:** Add `main/events/StaticObjectEvent.ts` (onInit: setGraphic from context/props, setHitbox if needed) and `main/events/ApiObjectEvent.ts` (onInit: setGraphic, onAction: optional API call + showText or GUI). Both can be created via `createDynamicEvent` with position; they need to receive **graphic** (and optionally type_id/extra) at creation time. Since RPGJS createDynamicEvent doesn’t pass constructor args, we use the same **spawn context** pattern as AgentNpcEvent: a module-level slot or a shared context that the event reads in onInit (e.g. last placement payload: graphic, type_id, extra).
- **GUI:** Builder dashboard gets two more category tabs or options: **Static object** and **API object**, with a list of type_ids (and later labels). Placement payload includes `type: 'static' | 'api'`, `id: type_id`, and `graphic`.

---

## 4. Sprite / image selection

**Goal:** When creating anything in the builder (NPC, static object, API object), the user can **choose a sprite/graphic** so the placed entity has the right look.

**How RPGJS graphics work:**

- **Graphic ID** = spritesheet **filename without extension** under `main/spritesheets/` (e.g. `female`, `hero` in `main/spritesheets/characters/`). The client registers spritesheets by folder/file; the server and client both use the same ID in `setGraphic(id)`.
- So we don’t "add logic" for sprites — we **add or reuse spritesheet assets** and **expose their IDs** in the builder.

**Ways to get a list of selectable sprites:**

1. **Config-driven list (recommended):** Maintain a **server-side or shared config** list of allowed graphics for the builder, e.g. `availableGraphics: [ { id: 'female', label: 'Female' }, { id: 'hero', label: 'Hero' } ]`. Add more entries when you add more spritesheets (e.g. `main/spritesheets/objects/tree.png` → id `tree`, label `Tree`). The server sends this list to the GUI when opening the builder (e.g. in `gui.open({ ..., availableGraphics })`). The builder UI shows a dropdown or a grid of thumbnails (if we add thumbnail URLs or use a generic icon and label).
2. **Scan spritesheets at build time:** The compiler already scans `main/spritesheets/`; we could add a small script or config generation step that outputs a list of graphic IDs. That list is then read by the server and sent to the client. More automatic, but requires build-time or startup wiring.
3. **Add more spritesheets:** Yes — to have more things to select, add more PNGs (and optional .ts) in `main/spritesheets/characters/` or e.g. `main/spritesheets/objects/` (with a matching spritesheet definition). Each new file (e.g. `tree.png`) gives a new graphic ID (`tree`). So: **adding spritesheets for more NPCs and objects is exactly how you get more selectable sprites**; the builder just needs a **curated list** of those IDs (and optional labels) to show in the UI.

**Concrete steps:**

- Add a **config list** of graphics for the builder (e.g. in `main/player.ts` or `src/config/builder-graphics.ts`): `{ id: string, label: string }[]`, including at least `female`, `hero`, and any new ones (e.g. from `spritesheets/objects/`).
- When opening the builder, server sends **availableGraphics** in `gui.open({ mapId, aiNpcConfigs, scriptedEvents, availableGraphics, ... })`.
- In the builder Vue: add a **sprite/graphic selector** (dropdown or grid) when a type and (if needed) type_id are selected; store **selectedGraphic** and send it in the `place` payload as **graphic**.
- Server place handler: when creating any event (scripted, static, API, and where applicable AI NPC), pass **graphic** into the spawn context or event options so that the event’s `onInit` can call `this.setGraphic(graphic)` (or use a default from type_id if graphic is missing).

**Adding more NPC/object sprites:** Add images (and optional .ts) under `main/spritesheets/characters/` or `main/spritesheets/objects/` (if you introduce an objects folder, register it in the module so the compiler picks it up). Then add the corresponding `{ id, label }` to the builder’s available graphics list so they appear in the sprite picker.

---

## 5. Suggested implementation order

1. **Sprite selection** — Add `availableGraphics` config, pass to GUI, add graphic dropdown in builder, and pass `graphic` in place payload; use it in existing scripted/AI NPC placement so all current types can have a chosen sprite.
2. **On-screen Builder button** — Add floating Builder button that calls `applyControl('builder-dashboard')` so web/mobile can open the builder without B.
3. **Persistence** — Add `builder_placements` table, save on place, load on map join and re-spawn placements; ensure placement id and map_id are used so we don’t duplicate.
4. **Static objects** — Add type `static`, `StaticObjectEvent`, and optional `main/spritesheets/objects/` plus config entries; builder can place static objects with a chosen graphic.
5. **Object API events** — Add type `api`, `ApiObjectEvent` (stub or simple HTTP), registry and builder UI for API objects.

---

## 6. Files to add or touch (summary)


| Area             | Files                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder button   | `main/gui/builder-button.vue` (or similar), client module registration                                                                                                           |
| Persistence      | `supabase/migrations/002_builder_placements.sql`, persistence module, `main/player.ts` (save on place, load on map)                                                              |
| Static/API       | `main/events/StaticObjectEvent.ts`, `main/events/ApiObjectEvent.ts`, `main/player.ts` (registry + place handler), builder Vue (tabs + options)                                   |
| Sprite selection | Config (e.g. `src/config/builder-graphics.ts` or in player), `main/player.ts` (open with availableGraphics), `main/gui/builder-dashboard.vue` (graphic selector + place.graphic) |


This plan keeps the existing builder flow, reuses Supabase and RPGJS patterns, and answers: **yes, add more spritesheets for more NPCs/objects, and expose those IDs via a config list so the builder can offer a sprite selector.**