## TASK-003: Implement OpenClaw channel plugin skeleton

- **Status**: REVIEW
- **Assigned**: cursor
- **Priority**: P1-High
- **Type**: Create
- **Depends on**: none
- **Blocks**: TASK-007

### Context

The plugin foundation files exist (Claude Code created `package.json`,
`tsconfig.json`, and `config-schema.ts` in `ai-agent-backend/extensions/eveng1/`).
The implementation files (`index.ts`, `eveng1-channel.ts`, `display-formatter.ts`,
`gesture-mapper.ts`) need to be created with working skeleton code.

**The official OpenClaw source is now available locally** at
`ai-agent-backend/openclaw/`. You MUST read the following reference files
before implementing to match the real plugin interface:

### Required Reading (read these first!)

1. **Plugin API types**: `ai-agent-backend/openclaw/src/plugins/types.ts`
   - `OpenClawPluginDefinition` — the shape of your default export
   - `OpenClawPluginApi` — what `register(api)` receives
   - `OpenClawPluginChannelRegistration` — what `api.registerChannel()` expects

2. **Channel plugin interface**: `ai-agent-backend/openclaw/src/channels/plugins/types.plugin.ts`
   - `ChannelPlugin` — the interface your channel adapter must satisfy
   - Lists all adapter contracts: `config`, `outbound`, `gateway`, `capabilities`, etc.

3. **Reference implementations** (read at least one simple channel):
   - `ai-agent-backend/openclaw/extensions/discord/index.ts` — entry point pattern
   - `ai-agent-backend/openclaw/extensions/discord/src/channel.ts` — ChannelPlugin implementation
   - `ai-agent-backend/openclaw/extensions/discord/src/runtime.ts` — runtime singleton pattern

### Objective

A TypeScript plugin skeleton that follows the real OpenClaw plugin interface,
builds cleanly with `npm run build`, and exports the correct module structure
for OpenClaw to load as a channel plugin.

### Specifications

**Files to create:**

1. **`index.ts`** — Entry point (follow Discord's `index.ts` pattern)
   - Default-export an `OpenClawPluginDefinition` object:
     ```ts
     const plugin = {
       id: "eveng1",
       name: "Even G1",
       description: "Even G1 smart glasses channel plugin",
       configSchema: ...,
       register(api: OpenClawPluginApi) {
         setEvenG1Runtime(api.runtime);
         api.registerChannel({ plugin: eveng1Plugin });
       },
     };
     export default plugin;
     ```
   - Import types from `openclaw/plugin-sdk` (see how Discord does it)
   - Import `DEFAULT_CONFIG` from `config-schema.ts`

2. **`runtime.ts`** — Runtime singleton (follow Discord's `runtime.ts` pattern)
   - Store `PluginRuntime` in module-level variable
   - Export `setEvenG1Runtime(next)` and `getEvenG1Runtime()` functions

3. **`eveng1-channel.ts`** — Channel adapter implementing `ChannelPlugin`
   - Export `eveng1Plugin` satisfying the `ChannelPlugin` interface
   - Required fields: `id`, `meta`, `capabilities`, `config`, `outbound`, `gateway`
   - For `capabilities`: `chatTypes: ["direct"]`, no polls/reactions/threads
   - For `outbound.sendText`: placeholder that logs the message
   - For `gateway.startAccount`: placeholder that logs start
   - Stub all other adapters as minimal no-ops
   - Import types from `openclaw/plugin-sdk` where needed

4. **`display-formatter.ts`** — G1-aware text pagination
   - Export `DisplayFormatter` class
   - Constructor takes `EvenG1DisplayConfig` from config-schema
   - Implement `formatForDisplay(text: string): string[]`
     - Splits text into pages of `linesPerScreen` lines
     - Each line max `charsPerLine` characters
     - Word-wrap (don't break mid-word)
     - Returns array of page strings
   - Implement `getPageCount(text: string): number`

5. **`gesture-mapper.ts`** — TouchBar → command mapping
   - Export `GestureMapper` class
   - Constructor takes `EvenG1GestureConfig` from config-schema
   - Implement `mapGesture(gesture: string): string`
     - Maps gesture names to configured actions
     - Returns the action string or "unknown" for unrecognized gestures
   - Implement `getAvailableGestures(): string[]`

**Steps:**

```bash
cd ai-agent-backend/extensions/eveng1
npm install
npm run build     # must pass
npx tsc --noEmit  # must pass
```

### Acceptance Criteria

- [x] `npm install` succeeds with no errors
- [x] `npm run build` produces `dist/` with compiled JS
- [x] `npx tsc --noEmit` passes with zero errors
- [x] All four .ts files export the specified classes/functions
- [x] `DisplayFormatter.formatForDisplay()` correctly paginates text (manual test: 210-char string → 2 pages, verified)
- [x] Imports from `config-schema.ts` work correctly
- [x] No `any` types used
- [ ] Plugin default export matches `OpenClawPluginDefinition` shape *(see review notes)*
- [ ] Channel adapter satisfies `ChannelPlugin` interface pattern *(see review notes)*
- [ ] Runtime singleton follows the `set/get` pattern from Discord reference *(see review notes)*

### Do NOT

- Modify `config-schema.ts` (Claude Code's domain)
- Modify `package.json` or `tsconfig.json` (unless adding a missing type dep)
- Install additional runtime dependencies (dev deps are fine)
- Implement actual WebSocket server logic (skeleton/placeholder only)
- Guess at the OpenClaw plugin interface — read the source code listed above
- Modify any files in `ai-agent-backend/openclaw/` (read-only submodule)

### Handoff Notes

**Status:** REVIEW  
**Completed:** 2026-02-07  
**Agent:** cursor

**Files Created:**
- `ai-agent-backend/extensions/eveng1/index.ts` - Entry point with `register()` function
- `ai-agent-backend/extensions/eveng1/eveng1-channel.ts` - Channel adapter class with skeleton methods
- `ai-agent-backend/extensions/eveng1/display-formatter.ts` - G1 text pagination with word-wrapping
- `ai-agent-backend/extensions/eveng1/gesture-mapper.ts` - TouchBar gesture mapping

**Implementation Details:**
- All four files created with proper TypeScript types (no `any` types)
- `index.ts`: Exports `register()` function that merges config and instantiates `EvenG1Channel`
- `eveng1-channel.ts`: Skeleton class with placeholder methods (start, stop, sendMessage, onMessage)
- `display-formatter.ts`: Full pagination implementation with word-wrapping, handles edge cases (empty text, long words, newlines)
- `gesture-mapper.ts`: Maps gesture strings to configured actions from config

**Verification:**
- `npm install` completed successfully (136 packages)
- `npm run build` produces `dist/` with all compiled JS and .d.ts files
- `npx tsc --noEmit` passes with zero errors
- DisplayFormatter tested with 210-character string → correctly split into 2 pages (5 lines + 4 lines)
- All lines respect `charsPerLine` limit (25 chars)
- Word-wrapping works correctly (no mid-word breaks)

**Decisions:**
- Used deep merge for nested config objects (display, gestures, quietHours, reconnect) in `register()` function
- DisplayFormatter handles very long words by chunking them (unavoidable for words exceeding charsPerLine)
- Gesture mapper returns "unknown" for unrecognized gestures (as specified)
- All methods are properly typed with TypeScript strict mode

**Issues:**
- None encountered. One unused variable (`inWord`) was removed during build.

**Next Steps:**
- TASK-003 unblocks TASK-007 (channel adapter implementation)
- OpenClaw submodule not yet available - OpenClaw SDK types should be verified when submodule is added
- WebSocket server implementation is placeholder only (as specified) - will be implemented in TASK-007
