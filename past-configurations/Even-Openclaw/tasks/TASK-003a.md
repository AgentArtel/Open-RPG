## TASK-003a: Refactor plugin to match OpenClaw ChannelPlugin interface

- **Status**: DONE
- **Assigned**: cursor
- **Priority**: P1-High
- **Type**: Refactor
- **Depends on**: TASK-003
- **Blocks**: TASK-007

### Context

TASK-003 was completed before the OpenClaw submodule was available, so the plugin
uses a custom API pattern (`register()` function export, `EvenG1Channel` class).
The real OpenClaw plugin interface is different. Now that the official source is
available at `ai-agent-backend/openclaw/`, this task refactors to match.

**DisplayFormatter and GestureMapper are approved as-is — do NOT change them.**

### Required Reading (read these FIRST!)

1. **Plugin API types**: `ai-agent-backend/openclaw/src/plugins/types.ts`
   - `OpenClawPluginDefinition` (lines 218-227) — the shape of your default export
   - `OpenClawPluginApi` (lines 233-265) — what `register(api)` receives
   - `OpenClawPluginChannelRegistration` (lines 213-216) — what `api.registerChannel()` expects

2. **Channel plugin interface**: `ai-agent-backend/openclaw/src/channels/plugins/types.plugin.ts`
   - `ChannelPlugin` (line 48) — the interface your channel must implement
   - Required: `id`, `meta`, `capabilities`, `config`

3. **Discord reference** (the simplest complete channel plugin):
   - `ai-agent-backend/openclaw/extensions/discord/index.ts` — entry point pattern
   - `ai-agent-backend/openclaw/extensions/discord/src/runtime.ts` — runtime singleton
   - `ai-agent-backend/openclaw/extensions/discord/src/channel.ts` — ChannelPlugin object

### Objective

Refactor the plugin entry point and channel adapter to match the real OpenClaw
plugin interface, so the plugin can actually be loaded by OpenClaw gateway.

### Changes Required

1. **Create `runtime.ts`** (new file)
   ```ts
   import type { PluginRuntime } from "openclaw/plugin-sdk";

   let runtime: PluginRuntime | null = null;

   export function setEvenG1Runtime(next: PluginRuntime) {
     runtime = next;
   }

   export function getEvenG1Runtime(): PluginRuntime {
     if (!runtime) {
       throw new Error("Even G1 runtime not initialized");
     }
     return runtime;
   }
   ```

2. **Rewrite `index.ts`** — change from `export function register()` to default-export `OpenClawPluginDefinition`:
   ```ts
   import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
   import { eveng1Plugin } from "./eveng1-channel.js";
   import { setEvenG1Runtime } from "./runtime.js";

   const plugin = {
     id: "eveng1",
     name: "Even G1",
     description: "Even G1 smart glasses channel plugin",
     register(api: OpenClawPluginApi) {
       setEvenG1Runtime(api.runtime);
       api.registerChannel({ plugin: eveng1Plugin });
     },
   };

   export default plugin;
   ```

3. **Rewrite `eveng1-channel.ts`** — change from `EvenG1Channel` class to `eveng1Plugin` object satisfying `ChannelPlugin`:
   - Export `eveng1Plugin` as a `ChannelPlugin` object (NOT a class)
   - Required fields: `id: "eveng1"`, `meta`, `capabilities`, `config`
   - `capabilities: { chatTypes: ["direct"], polls: false, reactions: false, threads: false, media: false, nativeCommands: false }`
   - `config` adapter: minimal stubs (single account, always configured)
   - `outbound.sendText`: placeholder that logs
   - `gateway.startAccount`: placeholder that logs
   - You can keep `DisplayFormatter` and `GestureMapper` imports for use inside the adapter stubs
   - Read the Discord channel.ts closely for the exact shape

4. **Do NOT modify**: `display-formatter.ts`, `gesture-mapper.ts`, `config-schema.ts`

### Important: TypeScript Resolution

The `openclaw/plugin-sdk` import path is how extensions in the official repo
resolve types. Since our plugin is external to the OpenClaw repo, you may need
to add a `paths` entry to `tsconfig.json` pointing at the submodule:

```json
{
  "compilerOptions": {
    "paths": {
      "openclaw/plugin-sdk": ["../../openclaw/src/plugins/types"]
    }
  }
}
```

Or you can copy the needed type definitions into a local `types.ts` file if the
path mapping proves too complex. Either approach is acceptable — the goal is to
match the interface shape, not necessarily import from the submodule at runtime.

### Steps

```bash
cd ai-agent-backend/extensions/eveng1
# Make changes
npm run build     # must pass
npx tsc --noEmit  # must pass
```

### Acceptance Criteria

- [ ] `index.ts` default-exports an object matching `OpenClawPluginDefinition` shape
- [ ] `runtime.ts` implements the `set/get` singleton pattern
- [ ] `eveng1-channel.ts` exports `eveng1Plugin` object satisfying `ChannelPlugin` interface
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `display-formatter.ts` and `gesture-mapper.ts` unchanged
- [ ] No `any` types used

### Do NOT

- Modify `display-formatter.ts` or `gesture-mapper.ts` (approved as-is)
- Modify `config-schema.ts` (Claude Code's domain)
- Implement actual WebSocket/BLE logic (still skeleton/placeholder)
- Modify files in `ai-agent-backend/openclaw/` (read-only submodule)

### Handoff Notes

**Reviewed 2026-02-08 by Claude Code — APPROVED.**

- `runtime.ts`: Clean singleton, correct `PluginRuntime` import.
- `index.ts`: Default export matches `OpenClawPluginDefinition` shape. Uses `emptyPluginConfigSchema()`.
- `eveng1-channel.ts`: `ChannelPlugin<EvenG1Account>` object with all required properties.
- All 7 type imports verified against real OpenClaw source — all resolve correctly.
- `display-formatter.ts` and `gesture-mapper.ts` unchanged.
- Used direct relative imports (`../../openclaw/src/...`) instead of path mappings — simpler approach, works fine.
