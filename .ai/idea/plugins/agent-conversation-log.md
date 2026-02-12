# rpgjs-agent-conversation-log

## Summary

GUI panel that shows per-NPC (and optionally per-player) conversation history, open by hotkey. Complements the agent memory system.

## Goals

- Display a scrollable log of past dialogue with one or more NPCs (and optionally other players).
- Filter or switch by NPC/player so users can review “what did this character say?”
- Open/close via hotkey; non-blocking so the player can move while the panel is open.
- Optionally sync with agent memory (e.g. last N messages or summaries) so the log reflects what the AI NPC “remembers” saying.
- Keep payload small: titles/snippets in the list, full text on demand if needed.

## RPGJS integration

- **Client:** `AddGui` for the log panel; `SendInput` or custom key to toggle. Data can be pushed from server via existing player/NPC events or a dedicated channel (e.g. `player.emit('conversation-log', entries)`).
- **Server:** Player hooks (`onJoinMap`, or a custom store) to maintain or hydrate conversation history per player; optionally `engine.onStart` to register with agent bridge so agent say/turn events append to the log.
- **Config:** Namespace for hotkey, max entries per NPC, and whether to include player messages. [create-plugin.md](docs/rpgjs-reference/docs/advanced/create-plugin.md), [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts), [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts).

## Project relevance

- Directly supports AI NPCs: players can review what an NPC said without re-triggering dialogue.
- Complements [agent memory](docs/rpgjs-plugin-analysis.md) (conversation buffer, persistence); the log can surface the same conversations the agent uses for context.
- Helps with debugging and playtesting NPC dialogue. Ownership: Cursor (e.g. `main/gui/`, bridge layer); see [AGENTS.md](AGENTS.md).

## Sources

- [Creating and sharing a plugin](docs/rpgjs-reference/docs/advanced/create-plugin.md)
- [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) — HookServer, HookClient
- [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts) — RpgModule, loadModules
- [RPGJS plugin analysis](docs/rpgjs-plugin-analysis.md) — agent memory, NPC dialogue
- [AGENTS.md](AGENTS.md)

## Implementation notes

- Define schema for log entries (npcId, playerId, message, timestamp, role) and who writes them (bridge vs plugin).
- Decide whether history is per-session only or persisted (if persisted, align with agent memory storage).
- Consider linking to [rpgjs-quest-log](quest-log.md) and [rpgjs-dialogue-choices-plus](dialogue-choices-plus.md) for “quest mentioned in dialogue” or “choice made” markers in the log later.
