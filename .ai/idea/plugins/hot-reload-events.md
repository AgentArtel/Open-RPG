# rpgjs-hot-reload-events

## Summary

Dev-only plugin: watch event files and push updated logic without full reload, or at least clear caches and warn. Depends on engine support.

## Goals

- In development, when event (or map) files change on disk, avoid a full game restart where possible.
- Preferred: push updated logic to the server (and optionally client) so new event behavior is applied without restart. This may require the engine to support dynamic module/event re-registration.
- Fallback: if the engine does not support hot reload, at least detect file changes, clear relevant caches if any, and warn the developer to restart (e.g. in console or a small overlay).
- Limit to dev mode only: no impact on production builds; can be stripped or disabled via env/flag.

## RPGJS integration

- **Server:** Primary. Event classes are loaded by the server; hot reload would require re-requiring or re-executing the module that defines events. Use Node `fs.watch` (or chokidar) on the events directory; then either call into the engine’s module loader (if exposed) or emit a custom hook (e.g. `Dev.EventsChanged`) and document “restart required.” [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) (`HookServer.Start` to start watcher), [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts).
- **Client:** Optional; client typically receives event definitions from server. If server pushes new logic, client may need to refresh scene or re-fetch. [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) (`HookClient`).
- **Config:** Namespace for watched paths and whether to attempt live reload or only warn. [create-plugin.md](docs/rpgjs-reference/docs/advanced/create-plugin.md).
- **Constraint:** RPGJS v4 uses autoload and compiler; event files are part of the build. Hot reload may require compiler or server support to re-run the build step or re-load the bundle. Document engine constraints clearly.

## Project relevance

- Speeds up iteration on AI NPC events (e.g. [main/events/](main/events/)) and other event scripts. Reduces restart cycles during development.
- Must not introduce global mutable state or affect production; see [.cursor/rules/99-verification.mdc](.cursor/rules/99-verification.mdc) and [AGENTS.md](AGENTS.md). Ownership: Cursor.

## Sources

- [Creating and sharing a plugin](docs/rpgjs-reference/docs/advanced/create-plugin.md)
- [Plugin.ts](docs/rpgjs-reference/packages/common/src/Plugin.ts) — HookServer, HookClient
- [Module.ts](docs/rpgjs-reference/packages/common/src/Module.ts) — RpgModule, loadModules
- [AGENTS.md](AGENTS.md)
- [RPGJS guide](docs/rpgjs-guide.md) / autoload — how events are loaded and built

## Implementation notes

- Research whether RPGJS compiler or server exposes a way to re-load or re-register events at runtime. If not, the plugin is “watch + warn + optional cache clear” only.
- Use a safe watcher (e.g. debounce, ignore node_modules and temp files) to avoid excessive restarts or errors during save.
- Document in the plugin readme that hot reload is best-effort and may require engine changes in future.
