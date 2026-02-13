# rpgjs-builder-dashboard

## Summary

In-game panel (GUI) to list maps and events, toggle debug visuals (collision, shapes), and optionally spawn test NPCs. Fits the existing builder-dashboard input and custom tooling.

## Goals

- List all maps and events in the current world for quick navigation.
- Toggle debug overlays: collision boxes, attachShape zones, and other dev visuals.
- Optional: spawn or teleport to test NPCs from the panel.
- Bind to existing input (e.g. key) so builders can open the panel without leaving the game.
- Keep the plugin dev-focused so it can be excluded or disabled in production.

## RPGJS integration

- **Client:** `AddGui` for the dashboard Vue/React component; `SendInput` or custom key handling to open/close. Optionally use `BeforeSceneLoading` / `AfterSceneLoading` or `SceneOnChanges` to read current map/event list.
- **Server:** Optional `engine.onStart` to expose map/event metadata; or client can derive from loaded scene. No required server hooks if the panel is read-only and debug-only.
- **Config:** Namespace in `config.json` (e.g. `builderDashboard`) for hotkey, enabled flag, and which debug toggles to show. Read via `engine.globalConfig` on client.
- **Reference:** [create-plugin.md](docs/rpgjs-reference/docs/advanced/create-plugin.md), [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) (`HookClient`), [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts).

## Project relevance

- The project already defines a builder-dashboard input in [rpg.toml](rpg.toml) under `[inputs.builder-dashboard]` with `bind = "b"`. This plugin would provide the in-game panel that opens when that key is pressed.
- Supports rapid iteration on maps and NPCs (including AI agent NPCs) without leaving the game or editing Tiled/events blind.
- Ownership: plugin code would live in Cursor’s domain (e.g. `main/gui/` or a separate package); see [AGENTS.md](AGENTS.md).

## Sources

- [Creating and sharing a plugin](docs/rpgjs-reference/docs/advanced/create-plugin.md)
- [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) — HookClient
- [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts) — RpgModule, loadModules
- [rpg.toml](rpg.toml) — builder-dashboard input
- [RPGJS plugin analysis](docs/rpgjs-plugin-analysis.md)

## Implementation notes

- Decide whether the panel needs server-backed map/event list or can infer from client scene state.
- If spawning test NPCs, server must support creating events dynamically (or pre-placed test NPCs with teleport).
- Consider a compile-time or env flag to strip the plugin from production builds.

---

## Current implementation status (for Claude when creating tasks)

- **Already in repo:** rpg.toml has `builder-dashboard` input (bind B). main/gui/builder-dashboard.vue exists (tabs, place mode, click map, place payload without visibility). main/player.ts opens builder on B and handles `place` for ai-npc (spawnAgentAt) and scripted (SCRIPTED_EVENT_REGISTRY + map.createDynamicEvent only). AgentManager.spawnAgentAt(configId, map, x, y) exists — Shared only, no visibility/player.
- **Phase 1 remaining:** Add visibility toggle (UI + payload); server branch on visibility to use player.createDynamicEvent for "only me" and map.createDynamicEvent for "everyone"; extend spawnAgentAt with optional visibility and player for AI NPC Scenario spawn. Then Phase 1 is complete.
- **Phase 2 and 3:** Not started; see phased implementation below and [builder-dashboard-phase2.plan.md](.cursor/plans/builder-dashboard-phase2.plan.md).

---

## RPGJS features used (builder)

- **Visibility:** Everyone = `map.createDynamicEvent` (EventMode.Shared); Only me = `player.createDynamicEvent` (EventMode.Scenario). Dashboard sends `visibility: 'everyone' | 'only-me'`.
- **State and persistence:** `player.setVariable` / `player.getVariable` for builder flags; `player.save()` / `player.load(json)` pattern for optional builder state; placements can be stored (e.g. Supabase) and re-applied on map load.
- **GUI:** `player.gui('builder-dashboard').open(data)`, `gui.on('place', handler)`; client `rpgGuiInteraction('builder-dashboard', 'place', payload)`.
- **Map API:** `map.events` (list), `map.removeEvent(eventId)` (delete); optional `map.createShape` for zones.
- **Input:** Key B already bound to `builder-dashboard` in rpg.toml; server handles in `onInput`.
- **Reference:** Same as `.cursor/rules/10-rpgjs-toolkit.mdc` "In-game builder feature" and `.cursor/plans/in-game_builder_dashboard_branch_b24d547b.plan.md` section 9.

---

## Phased implementation (for task decomposition)

Three phases with clear scope and stop points so Claude can create one or more tasks per phase.

### Phase 1 — Basic MVP (first stop point)

- **Scope:** Press B → open Vue dashboard; choose AI NPC or Scripted NPC and which one (e.g. elder-theron, test-agent, Test NPC, Guard); visibility toggle "Only me" vs "Everyone"; click "Place" then click map → entity appears. No persistence (restart clears).
- **Server:** `onInput` opens `player.gui('builder-dashboard').open(...)`; `gui.on('place', handler)`; `map.createDynamicEvent` or `player.createDynamicEvent` by visibility; `AgentManager.spawnAgentAt(id, map, x, y, visibility, player?)` for AI NPCs; SCRIPTED_EVENT_REGISTRY for scripted.
- **Client:** main/gui/builder-dashboard.vue (id `builder-dashboard`); place mode + pointerdown → pixel to tile → send `place` via rpgGuiInteraction.
- **Verification gate:** `rpgjs build`, `npx tsc --noEmit`; in-game: B opens dashboard, place AI NPC and scripted NPC with "everyone" and "only me", confirm visibility. **Stop here** — merge/pause after Phase 1. (Placement without visibility is already implemented; remaining Phase 1 work is visibility toggle + Scenario support.)

### Phase 2 — Intermediate (second stop point)

- **Scope:** (1) On-screen Builder button (e.g. floating button calling `applyControl('builder-dashboard')`). (2) Persistence: store placements in Supabase `builder_placements`; on map load re-apply from DB. (3) List placed events on current map; delete via `map.removeEvent(eventId)` and remove from DB.
- **References:** [.cursor/plans/builder-dashboard-phase2.plan.md](.cursor/plans/builder-dashboard-phase2.plan.md) (sections 1 and 2).
- **Verification gate:** Build passes; button opens builder; place → restart → rejoin → entity persists; list and delete work. **Stop here** — usable builder with persistence.

### Phase 3 — Advanced (third stop point)

- **Scope:** (1) Static objects (type `static`, `StaticObjectEvent`). (2) API object type (`api`, `ApiObjectEvent` stub/simple). (3) Sprite/graphic selection: server sends `availableGraphics` in gui.open; builder UI graphic selector; place payload includes `graphic`; events use spawn context for `setGraphic`.
- **References:** [.cursor/plans/builder-dashboard-phase2.plan.md](.cursor/plans/builder-dashboard-phase2.plan.md) (sections 3 and 4).
- **Verification gate:** Build passes; place static and API objects with chosen graphic. **Stop here** — full builder feature set.

---

## Implementation references (for assigned agent)

- **Detailed implementation plan:** [.cursor/plans/in-game_builder_dashboard_branch_b24d547b.plan.md](.cursor/plans/in-game_builder_dashboard_branch_b24d547b.plan.md) — server/client steps, AgentManager.spawnAgentAt, GUI spec, key binding.
- **RPGJS toolkit:** [.cursor/rules/10-rpgjs-toolkit.mdc](.cursor/rules/10-rpgjs-toolkit.mdc) — "In-game builder feature" (visibility, state, guides).
- **Phase 2+ details:** [.cursor/plans/builder-dashboard-phase2.plan.md](.cursor/plans/builder-dashboard-phase2.plan.md) — button, persistence schema, static/API objects, sprite selection.
- **Task creation:** Orchestrator (Claude Code) should create tasks in `.ai/tasks/` from this phased breakdown; Cursor implements each task per acceptance criteria.

### Files for Claude Code to review

| Purpose | Path |
|--------|------|
| Builder implementation plan (server/client steps, visibility, refs) | [.cursor/plans/in-game_builder_dashboard_branch_b24d547b.plan.md](.cursor/plans/in-game_builder_dashboard_branch_b24d547b.plan.md) |
| Phase 2+ plan (button, persistence, static/API, sprite) | [.cursor/plans/builder-dashboard-phase2.plan.md](.cursor/plans/builder-dashboard-phase2.plan.md) |
| RPGJS builder approach (visibility, state, guides) | [.cursor/rules/10-rpgjs-toolkit.mdc](.cursor/rules/10-rpgjs-toolkit.mdc) — "In-game builder feature" section |
| Idea doc (this file) | [.ai/idea/plugins/builder-dashboard.md](.ai/idea/plugins/builder-dashboard.md) |
| **Existing code** — builder input and GUI open | [main/player.ts](main/player.ts) (builder block ~lines 101–165) |
| **Existing code** — dashboard Vue component | [main/gui/builder-dashboard.vue](main/gui/builder-dashboard.vue) |
| **Existing code** — spawn one AI NPC at (x,y) | [src/agents/core/AgentManager.ts](src/agents/core/AgentManager.ts) (`spawnAgentAt` ~lines 244–264) |
| Input config (B key) | [rpg.toml](rpg.toml) |
| RPGJS Shared vs Scenario, variables | [docs/rpgjs-reference/docs/guide/create-event.md](docs/rpgjs-reference/docs/guide/create-event.md) |
| RPGJS save/load, props | [docs/rpgjs-reference/docs/guide/synchronization.md](docs/rpgjs-reference/docs/guide/synchronization.md), [docs/rpgjs-reference/docs/guide/save.md](docs/rpgjs-reference/docs/guide/save.md) |
| RPGJS GUI (server open, client interaction) | [docs/rpgjs-reference/docs/commands/gui.md](docs/rpgjs-reference/docs/commands/gui.md) (and GuiManager API it includes) |
| RPGJS inputs | [docs/rpgjs-reference/docs/guide/inputs.md](docs/rpgjs-reference/docs/guide/inputs.md) |
| Optional: dynamic shapes | [docs/rpgjs-reference/docs/guide/create-shape.md](docs/rpgjs-reference/docs/guide/create-shape.md) |
