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
