# Plugin Ideas for OpenClaw × RPGJS

This folder contains exploration docs for RPGJS plugins we may implement later. Each idea is a single markdown file with goals, RPGJS integration points, project relevance, and sources.

**Relationship:** [rpgjs-quest-log](quest-log.md) and [rpgjs-dialogue-choices-plus](dialogue-choices-plus.md) together add structure to NPC-driven stories and goals; consider implementing or designing them in tandem.

**Parent index:** [../INDEX.md](../INDEX.md) — full idea folder index by kind.

---

## Kinds (where each plugin fits)

| Kind | Purpose | Plugins |
|------|---------|---------|
| **AI / NPC** | Conversation, dialogue, and NPC-driven structure | agent-conversation-log, dialogue-choices-plus, quest-log |
| **Builder / Dev** | In-game tooling and developer experience | builder-dashboard, hot-reload-events |
| **Gameplay** | Systems and world behavior | crafting, skill-bar, day-night-cycle, cutscene |
| **UX** | Player-facing polish | tooltips |

---

## Index by kind

### AI / NPC

| Plugin | File | Summary |
|--------|------|---------|
| rpgjs-agent-conversation-log | [agent-conversation-log.md](agent-conversation-log.md) | GUI panel: per-NPC conversation history, hotkey-open; complements agent memory. |
| rpgjs-dialogue-choices-plus | [dialogue-choices-plus.md](dialogue-choices-plus.md) | Conditional choices (variables, items, quest state); drive branching from server. |
| rpgjs-quest-log | [quest-log.md](quest-log.md) | Server quest state + client log UI; sync via player props or onJoinMap. |

### Builder / Dev

| Plugin | File | Summary |
|--------|------|---------|
| rpgjs-builder-dashboard | [builder-dashboard.md](builder-dashboard.md) | In-game panel: maps/events list, debug toggles, spawn test NPCs. |
| rpgjs-hot-reload-events | [hot-reload-events.md](hot-reload-events.md) | Dev-only: watch event files, push logic or clear caches and warn. |

### Gameplay

| Plugin | File | Summary |
|--------|------|---------|
| rpgjs-crafting | [crafting.md](crafting.md) | Recipes + ingredients, server validation, craft UI; basis for AI-NPC task completion. |
| rpgjs-skill-bar | [skill-bar.md](skill-bar.md) | Cooldown/shortcuts GUI; track AI-NPC and player skill tree; gold/skill points from task review. |
| rpgjs-day-night-cycle | [day-night-cycle.md](day-night-cycle.md) | In-world time, tint/overlay; optional Time.DayPhase hook for other plugins. |
| rpgjs-cutscene | [cutscene.md](cutscene.md) | Timeline: camera, dialogue, waits, triggers; future multimodal/AI-generated cutscenes. |

### UX

| Plugin | File | Summary |
|--------|------|---------|
| rpgjs-tooltips | [tooltips.md](tooltips.md) | Hover tooltips for sprites/events; client-only with optional server-driven text. |

---

## Flat index (all plugins)

| Plugin | File | Summary |
|--------|------|---------|
| rpgjs-builder-dashboard | [builder-dashboard.md](builder-dashboard.md) | In-game panel: maps/events list, debug toggles, spawn test NPCs. |
| rpgjs-agent-conversation-log | [agent-conversation-log.md](agent-conversation-log.md) | GUI panel: per-NPC conversation history, hotkey-open; complements agent memory. |
| rpgjs-dialogue-choices-plus | [dialogue-choices-plus.md](dialogue-choices-plus.md) | Conditional choices (variables, items, quest state); drive branching from server. |
| rpgjs-quest-log | [quest-log.md](quest-log.md) | Server quest state + client log UI; sync via player props or onJoinMap. |
| rpgjs-day-night-cycle | [day-night-cycle.md](day-night-cycle.md) | In-world time, tint/overlay; optional Time.DayPhase hook for other plugins. |
| rpgjs-crafting | [crafting.md](crafting.md) | Recipes + ingredients, server validation, craft UI; basis for AI-NPC task completion. |
| rpgjs-skill-bar | [skill-bar.md](skill-bar.md) | Cooldown/shortcuts GUI; track AI-NPC and player skill tree; gold/skill points from task review. |
| rpgjs-tooltips | [tooltips.md](tooltips.md) | Hover tooltips for sprites/events; client-only with optional server-driven text. |
| rpgjs-hot-reload-events | [hot-reload-events.md](hot-reload-events.md) | Dev-only: watch event files, push logic or clear caches and warn. |
| rpgjs-cutscene | [cutscene.md](cutscene.md) | Timeline: camera, dialogue, waits, triggers; future multimodal/AI-generated cutscenes. |

## Sources (in-repo)

- [Creating a plugin](docs/rpgjs-reference/docs/advanced/create-plugin.md) — scaffold, config.json, Module API.
- [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) — HookServer, HookClient, RpgPlugin.
- [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts) — RpgModule, loadModules.
- [RPGJS plugin analysis](docs/rpgjs-plugin-analysis.md) — what we use vs build.
