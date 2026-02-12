# rpgjs-day-night-cycle

## Summary

In-world time driving a tint or overlay with configurable duration and colors. Can emit a custom hook (e.g. Time.DayPhase) for other plugins to react.

## Goals

- Maintain an in-world time (e.g. minutes per day, or real-time scale) that advances on the server and syncs to clients.
- Apply a tint or full-screen overlay (e.g. darker at night, warm at sunset) so the map visually reflects time of day.
- Make duration and colors configurable via plugin config (e.g. day length in seconds, RGB or preset for dawn/day/dusk/night).
- Emit a custom hook (e.g. `Time.DayPhase` or `Time.Tick`) so other plugins can react (e.g. NPC schedules, spawns, or lighting logic).
- Optionally persist time in save or player session so it continues across map changes.

## RPGJS integration

- **Server:** `engine.onStep` (or a timer) to advance in-world time; broadcast time or phase to clients (e.g. via existing sync or `player.emit('time-update', { time, phase })`). Avoid heavy logic in `onStep` per project rules; use a throttled tick (e.g. once per second). [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) (`HookServer.Step`, `HookServer.Start`), [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts).
- **Client:** `SceneDraw` or `AfterSceneLoading` to apply tint/overlay based on received time or phase; optionally `Client.Step` for local interpolation. Register custom hook with `RpgPlugin` if the engine supports it, or use a shared event name. [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) (`HookClient.SceneDraw`, `HookClient.Step`).
- **Config:** Namespace for day length, phase boundaries, and color presets. [create-plugin.md](docs/rpgjs-reference/docs/advanced/create-plugin.md).

## Project relevance

- Adds atmosphere and optional gameplay (e.g. “NPC only at night”). AI NPCs could use day phase in perception or dialogue (“It’s late, the shop is closed”).
- Keeps plugin decoupled: other systems subscribe to Time.DayPhase rather than reading raw time. Ownership: Cursor; see [AGENTS.md](AGENTS.md).

## Sources

- [Creating and sharing a plugin](docs/rpgjs-reference/docs/advanced/create-plugin.md)
- [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) — HookServer, HookClient
- [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts) — RpgModule, loadModules
- [AGENTS.md](AGENTS.md) — no agent logic in onStep; use timer-based tick

## Implementation notes

- Use a low-frequency tick (e.g. 1s) for time advance, not every frame. Document in plugin so it aligns with project verification rules.
- Define phase enum (e.g. Dawn, Day, Dusk, Night) and optional custom hook name in config so games can subscribe without coupling to implementation.
- Consider optional integration with save plugin (if used) to persist time.
