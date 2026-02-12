# rpgjs-crafting

## Summary

Recipes and ingredients as database items, server-side validation, and a simple craft UI. Uses AddDatabase and player inventory. Intended as the framework for AI-NPC task completion using object APIs in a specific sequence.

## Goals

- Define recipes (input items + quantities, output item + quantity) in the database or config; reference existing items from RPGJS database.
- Server-side validation: check player has ingredients and space before performing craft; deduct ingredients and add output.
- Simple client UI to list available recipes, show requirements, and trigger craft (e.g. “Craft” button).
- Expose a small API (e.g. `player.canCraft(recipeId)`, `player.craft(recipeId)`) so events and other systems can trigger or check crafting.
- Design so the same “sequence of object operations” pattern can be reused for AI-NPC tasks: e.g. “pick up A, use on B, receive C” as a generic task-completion flow.

## RPGJS integration

- **Server:** `AddDatabase` to register recipe definitions (or load from config); player hooks or custom methods to validate and apply craft. Use existing inventory/item APIs if available; otherwise extend RpgPlayer (e.g. `declare module '@rpgjs/server'` and prototype) for `craft(recipeId)`. [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) (`HookServer.AddDatabase`), [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts).
- **Client:** `AddGui` for craft panel; call server to request craft and refresh inventory. [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) (`HookClient.AddGui`).
- **Config:** Namespace for UI layout and which database/items to use. [create-plugin.md](docs/rpgjs-reference/docs/advanced/create-plugin.md).

## Project relevance

- **AI-NPC task completion:** The crafting flow (validate ingredients → perform steps → grant result) is a template for agent tasks: an NPC (or player) performs a sequence of object interactions (e.g. “take tool, use on material, produce item”). The same pattern can drive “task completion” where the agent’s actions are validated and rewarded (e.g. [rpgjs-skill-bar](skill-bar.md) gold/skill points on approval).
- Fits the command-as-knowledge model: agents could unlock or use a `craft(recipeId)` command. See [01-idea-doc.md](.ai/idea/01-idea-doc.md). Ownership: Cursor; see [AGENTS.md](AGENTS.md).

## Sources

- [Creating and sharing a plugin](docs/rpgjs-reference/docs/advanced/create-plugin.md)
- [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) — HookServer.AddDatabase
- [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts) — RpgModule, loadModules, database
- [skill-bar.md](skill-bar.md) — task review and rewards
- [01-idea-doc.md](.ai/idea/01-idea-doc.md)
- [AGENTS.md](AGENTS.md)
- [RPGJS plugin analysis](docs/rpgjs-plugin-analysis.md) — database, inventory

## Implementation notes

- Align recipe schema with existing item/weapon/skill database structure so recipes reference item IDs.
- Design a minimal “task” or “sequence” abstraction (steps + preconditions + result) so AI-NPC tasks can reuse it without being literal “crafting” only.
- Consider emitting a hook (e.g. `Craft.Complete` or `Task.Complete`) for skill-bar or quest-log to react.
