# rpgjs-dialogue-choices-plus

## Summary

Extends or wraps default-gui choices with conditions (variables, items, quest state) so branching can be driven from server state.

## Goals

- Add conditional visibility or availability of dialogue choices based on server state: variables, inventory items, quest progress, or custom flags.
- Integrate with `player.showChoices()` (or a wrapper) so existing NPC and event scripts can use conditional options without rewriting the whole dialogue system.
- Support “grayed out + reason” (e.g. “Need 10 gold”) or hide options entirely when conditions fail.
- Keep the API close to default-gui so migration is minimal. Optionally emit a custom hook (e.g. `Dialogue.BeforeChoices`) for other plugins to inject or filter choices.

## RPGJS integration

- **Server:** Choices and conditions are server-authoritative. Use `PlayerInput` or existing dialogue flow to evaluate conditions before sending choices to client; or extend the payload of whatever triggers `showChoices` (e.g. include `condition: { type: 'variable', name: 'gold', gte: 10 }`).
- **Client:** Either wrap or replace the default-gui choice component so it respects disabled/hidden state and optional tooltips. `AddGui` for custom component; may need to intercept the choice API. See [RPGJS plugin analysis](docs/rpgjs-plugin-analysis.md) for default-gui dialogue/choice usage.
- **Config:** Namespace for feature flags (e.g. show reason when disabled). [create-plugin.md](docs/rpgjs-reference/docs/advanced/create-plugin.md), [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts), [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts).

## Project relevance

- Enables NPC-driven stories where options depend on what the player has done or has (quests, items, variables). Pairs with [rpgjs-quest-log](quest-log.md): quest state can drive which choices are available.
- AI NPCs can suggest or offer choices that are validated server-side (e.g. “Give 10 gold” only enabled when player has enough gold). See [01-idea-doc.md](../01-idea-doc.md) for command-as-knowledge and world state.
- Together with quest-log, adds structure to NPC-driven stories and goals.

## Sources

- [Creating and sharing a plugin](docs/rpgjs-reference/docs/advanced/create-plugin.md)
- [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) — HookServer, HookClient
- [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts) — RpgModule, loadModules
- [RPGJS plugin analysis](docs/rpgjs-plugin-analysis.md) — default-gui, showText, showChoices
- [quest-log.md](quest-log.md) — pairing for NPC-driven goals
- [01-idea-doc.md](.ai/idea/01-idea-doc.md)

## Implementation notes

- Define a small condition schema (variable, item, quest step, custom) and evaluate on server before sending choices.
- Check whether default-gui choice component can be extended via props or must be replaced.
- Implement quest-log first (or in parallel) so dialogue-choices-plus can depend on quest state.
