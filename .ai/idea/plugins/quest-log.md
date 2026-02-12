# rpgjs-quest-log

## Summary

Server-side quest state (accepted, objectives, completed) plus a client GUI for the log, objectives, and optional rewards. Sync via player props or onJoinMap.

## Goals

- Store quest state on the server: accepted, in progress, completed; objectives (e.g. “Collect 3 herbs” with current count); optional rewards.
- Expose a quest log GUI on the client: list of active/completed quests, current objectives, and optional reward display.
- Sync state via player custom props or by hydrating on `PlayerJoinMap` / `onConnected` so the client always has up-to-date quest data.
- Support marking objectives complete and advancing quest steps from events or agent actions (e.g. NPC confirms task done).
- Optionally integrate with inventory and variables for “collect X” or “have variable Y” objectives.

## RPGJS integration

- **Server:** `player` hooks: `onJoinMap` or `onConnected` to send quest state to client (e.g. `player.emit('quest-log', quests)` or store in player props synced by engine). Use `AddDatabase` if quest/objective definitions live in database; otherwise config or code. [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) (`HookServer.PlayerJoinMap`, `HookServer.PlayerConnected`), [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts) (player hooks, database).
- **Client:** `AddGui` for the log panel; listen for quest updates from server. Optional hotkey to open. [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) (`HookClient.AddGui`).
- **Config:** Namespace for hotkey, UI layout, and whether to show rewards. [create-plugin.md](docs/rpgjs-reference/docs/advanced/create-plugin.md).

## Project relevance

- Gives structure to NPC-driven stories and goals: AI NPCs can assign or complete quest steps, and players see progress in one place.
- Pairs with [rpgjs-dialogue-choices-plus](dialogue-choices-plus.md): dialogue choices can depend on quest state (e.g. “Turn in herbs” only when objective complete).
- Fits the OpenClaw × RPGJS vision where agents and players interact through game systems; see [01-idea-doc.md](.ai/idea/01-idea-doc.md). Ownership: Cursor; see [AGENTS.md](AGENTS.md).

## Sources

- [Creating and sharing a plugin](docs/rpgjs-reference/docs/advanced/create-plugin.md)
- [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) — HookServer, HookClient
- [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts) — RpgModule, loadModules, player hooks
- [dialogue-choices-plus.md](dialogue-choices-plus.md) — pairing for conditional choices
- [RPGJS plugin analysis](docs/rpgjs-plugin-analysis.md)
- [AGENTS.md](AGENTS.md)

## Implementation notes

- Define quest and objective schema (id, title, objectives[], status, rewards) and where it lives (player props, DB, or both).
- Implement before or in tandem with dialogue-choices-plus so choices can reference quest state.
- Consider hooks for “objective completed” or “quest completed” so other plugins (e.g. crafting, skill-bar) can react.
