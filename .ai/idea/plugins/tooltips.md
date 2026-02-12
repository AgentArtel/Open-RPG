# rpgjs-tooltips

## Summary

Hover tooltips for sprites and events showing name, description, and optional custom payload. Client-only with optional server-driven text.

## Goals

- Show a tooltip when the player hovers over a sprite or event (or a designated hit area): e.g. name and short description.
- Support custom payload (e.g. “Quest giver”, “Sells potions”) so events and NPCs can define richer tooltips.
- Prefer client-only implementation: tooltip content can be derived from sprite/event data already synced to the client. Optionally allow server to push or override text (e.g. dynamic “Currently busy”) for specific instances.
- Keep tooltips lightweight and non-blocking; optional delay before show and hide to avoid flicker.

## RPGJS integration

- **Client:** Primary implementation. Use `SceneOnChanges` or sprite/add logic to attach hover detection to sprites; `AddGui` for the tooltip component (or a single global tooltip that moves). Read name/description from sprite or event params (e.g. `spriteData.name`, custom props). [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) (`HookClient.SceneAddSprite`, `HookClient.SceneOnChanges`, `HookClient.AddGui`).
- **Server:** Optional. If tooltip text is dynamic (e.g. “Stock: 3”), server can set a custom prop on the event/player that syncs to client; plugin reads that prop for the tooltip body.
- **Config:** Namespace for delay, max width, and whether to use server-driven text. [create-plugin.md](docs/rpgjs-reference/docs/advanced/create-plugin.md).

## Project relevance

- Improves UX for AI NPCs: hover to see name and role (“Elder Theron”, “Village elder”) before talking. Optional server-driven line (e.g. “Thinking…” or “In conversation”) for live state.
- Fits non-blocking, ambient info; see [RPGJS plugin analysis](docs/rpgjs-plugin-analysis.md) (Components API, sprite-attached GUI). Ownership: Cursor; see [AGENTS.md](AGENTS.md).

## Sources

- [Creating and sharing a plugin](docs/rpgjs-reference/docs/advanced/create-plugin.md)
- [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) — HookClient
- [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts) — RpgModule, loadModules
- [RPGJS plugin analysis](docs/rpgjs-plugin-analysis.md) — Components, sprite-attached GUI
- [AGENTS.md](AGENTS.md)

## Implementation notes

- Decide hit detection: use existing sprite bounds or a separate invisible shape. Avoid blocking click/action when tooltip is shown.
- If server-driven text is used, define a small contract (e.g. `event.tooltipLine` or a dedicated sync key) so the client knows what to display.
- Consider accessibility: optional keyboard focus and screen-reader-friendly labels.
