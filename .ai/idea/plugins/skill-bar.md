# rpgjs-skill-bar

## Summary

Cooldown bars or shortcuts for skills/items above or beside the player, backed by client GUI and server onInput or player state. Used to track AI-NPC and player skills in a skill tree; NPCs earn gold and skill points from task review score and approval.

## Goals

- Show skill (or item) cooldowns and shortcuts in a bar or panel near the player (and optionally above NPCs).
- Server-authoritative: cooldowns and availability determined by server; client displays state and sends input (e.g. “use skill 1”).
- Support a skill-tree or progression model: skills can be unlocked or leveled; same for AI NPCs so their “task performance” advances their capabilities.
- **Project-specific:** When an NPC completes a task, a review gives a score and approval; the NPC is rewarded with gold and skill points depending on that outcome. The skill-bar (and underlying state) reflects these rewards and unlocks.

## RPGJS integration

- **Server:** `PlayerInput` or custom handlers to process “use skill” / “use item”; maintain cooldowns and skill state in player (and optionally event/NPC) props. Player hooks (`onLevelUp`, or custom) to grant skill points or gold. [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) (`HookServer.PlayerInput`, `HookServer.PlayerLevelUp`), [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts).
- **Client:** `AddGui` for skill bar; `SendInput` or dedicated events to request skill use. Optionally `AddSprite` / sprite-attached component for bars above NPCs. [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) (`HookClient.AddGui`, `HookClient.AddSprite`).
- **Config:** Namespace for bar position, size, and whether to show for NPCs. [create-plugin.md](docs/rpgjs-reference/docs/advanced/create-plugin.md).

## Project relevance

- Tracks both player and AI-NPC skills: NPCs perform tasks, get reviewed (score + approved/not), and earn gold and skill points. The skill-bar (and backend state) is the visible and persistent representation of that progression.
- Complements [rpgjs-crafting](crafting.md): task completion (e.g. craft or other sequences) can trigger review and rewards that update skill state.
- Fits OpenClaw × RPGJS “grow by learning” and command-as-knowledge; see [01-idea-doc.md](.ai/idea/01-idea-doc.md). Ownership: Cursor; see [AGENTS.md](AGENTS.md).

## Sources

- [Creating and sharing a plugin](docs/rpgjs-reference/docs/advanced/create-plugin.md)
- [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) — HookServer, HookClient
- [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts) — RpgModule, loadModules
- [crafting.md](crafting.md) — task completion and sequences
- [01-idea-doc.md](.ai/idea/01-idea-doc.md)
- [AGENTS.md](AGENTS.md)
- [RPGJS plugin analysis](docs/rpgjs-plugin-analysis.md) — Components API for bars above sprites

## Implementation notes

- Define where “task review” and “gold/skill point reward” live: in agent system, in plugin, or shared service. Plugin at least displays and persists skill/level state.
- Skill tree and NPC progression: schema for unlocks and levels; ensure NPCs (RpgEvent) can hold the same state as players if both use the bar.
- Consider hooks (e.g. `Skill.Used`, `Reward.Granted`) for quest-log or analytics.
