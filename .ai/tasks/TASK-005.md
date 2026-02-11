## TASK-005: LLM Integration Feasibility Test

- **Status**: REVIEW
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 1 (Foundation)
- **Type**: Test/Validation
- **Depends on**: TASK-001, TASK-002
- **Blocks**: TASK-006, TASK-007, TASK-008

### Context

Before building the full agent system, we need to validate that the Moonshot AI SDK can be imported and used within the RPGJS server process without conflicts. This is a quick feasibility test that will inform our integration approach. We will use Kimi K2.5 for complex reasoning and K2 for simpler tasks.

### Objective

Verify that `@moonshot-ai/moonshot-sdk` works correctly in the RPGJS server environment and document any considerations for async handling and latency.

### Specifications

1. **Install dependency**:
   ```bash
   npm install @moonshot-ai/moonshot-sdk
   ```

2. **Create test file** `src/agents/core/llm-test.ts`:
   - Import `MoonshotAI` from `@moonshot-ai/moonshot-sdk`
   - Create a simple test function that makes an API call
   - Use a simple prompt like "Say hello in one word"
   - Use model `kimi-k2-0711-preview` (fast, cost-effective for testing)

3. **Integration test**:
   - Call the test function from `main/player.ts` `onConnected` hook
   - Log the response to console
   - Verify no build errors: `rpgjs build`
   - Verify no type errors: `npx tsc --noEmit`

4. **Document findings** in task handoff notes:
   - Installation: any peer dependency issues?
   - Build: any bundling issues with the SDK?
   - Runtime: does the API call succeed?
   - Latency: rough timing for the API call
   - Async handling: any issues with RPGJS's event loop?

### Acceptance Criteria

- [x] `openai` (v6.19.0) added to `package.json` dependencies (see note below on SDK choice)
- [x] `src/agents/core/llm-test.ts` created with working test function
- [x] Test function successfully called from RPGJS server (logs LLM response)
- [x] `rpgjs build` passes with SDK included
- [x] `npx tsc --noEmit` passes (only pre-existing `@types/css-font-loading-module` error)
- [x] Handoff notes document: install notes, build notes, latency observations, async handling approach

### Do NOT

- Commit API keys (use environment variable: `MOONSHOT_API_KEY`)
- Add full agent system implementation (this is just a feasibility test)
- Modify RPGJS framework code
- Use expensive models (stick to Haiku for testing)

### Reference

- TypeScript interfaces: `src/agents/core/types.ts` (`ILLMClient`, `LLMResponse`, etc.)
- Moonshot AI SDK docs: https://platform.moonshot.ai/docs
- RPGJS player hooks: `main/player.ts`

### Handoff Notes

**2026-02-10 — cursor — Implementation complete (PENDING → REVIEW)**

#### SDK Choice: `openai` instead of `@moonshot-ai/moonshot-sdk`

The task brief referenced `@moonshot-ai/moonshot-sdk`, but this package does not
exist on npm. Moonshot AI provides an **OpenAI-compatible REST API** at
`https://api.moonshot.ai/v1` (confirmed in `docs/openclaw-reference/docs/providers/moonshot.md`
and `docs/moonshot-api-integration.md`). The standard approach — used by all existing
project scripts and the OpenClaw reference — is to use the OpenAI client library
with a custom `baseURL`.

**Installed**: 
- `openai` v6.19.0 (4 packages added, no peer dependency warnings)
- `dotenv` v17.2.4 (required to load `.env` files in server-side code — Vite doesn't auto-load them)

This is the correct long-term choice for the `ILLMClient` implementation in TASK-008,
since the `openai` package provides full TypeScript types, streaming support, and
function calling — all features we'll need for the agent system.

#### Files Created/Modified

- **`src/agents/core/llm-test.ts`** (NEW) — Test function with:
  - `import 'dotenv/config'` at top to load `.env` file (Vite doesn't auto-load for server code)
  - `testLLMCall()`: async function that calls Moonshot API
  - Uses `openai` package with `baseURL: 'https://api.moonshot.ai/v1'`
  - Model: `kimi-k2-0711-preview` (fast, cost-effective)
  - Prompt: "Say hello in one word" (system + user message)
  - Returns `{ response, model, latencyMs }`
  - API key resolution: `MOONSHOT_API_KEY` → `KIMI_API_KEY` fallback
  - Error handling: throws descriptive error if no API key found

- **`main/player.ts`** (MODIFIED) — Added LLM test call in `onConnected`:
  - Fire-and-forget pattern: `void testLLMCall().then(...).catch(...)`
  - Logs success with response, model, and latency
  - Logs failure with error message
  - **Never blocks** player connection or crashes the server

- **`package.json`** (MODIFIED) — Added `"openai": "^6.19.0"` to dependencies

#### Installation Notes

- `npm install openai` added 4 packages (openai + 3 transitive deps)
- No peer dependency warnings or conflicts with RPGJS packages
- Existing 32 audit vulnerabilities are all pre-existing (not from openai)

#### Build Compatibility

- **`rpgjs build`**: Passes cleanly. The `openai` package is correctly bundled
  into `dist/server/main.mjs` by Vite's SSR build. The import, `MOONSHOT_BASE_URL`,
  and all test logic appear in the output.
- **`npx tsc --noEmit`**: Only pre-existing error in `@types/css-font-loading-module`
  (TS2717). No new errors from our code.
- **Client build**: The `openai` import is server-only (used in `player.ts` which
  runs on the server). It does NOT appear in the client bundle.

#### Runtime Observations

- **Server startup**: No crashes. Server starts normally with the test code included.
- **API key missing**: When no `MOONSHOT_API_KEY` or `KIMI_API_KEY` is set, the
  test logs `[LLM-Test] ❌ Failed: [LLM-Test] No API key found...` and the game
  continues running normally.
- **API key present**: ✅ **TESTED AND WORKING** (2026-02-10)
  - **Issue discovered**: Vite doesn't automatically load `.env` files for server-side code
  - **Fix applied**: Installed `dotenv` package and added `import 'dotenv/config'` to `llm-test.ts`
  - **Result**: API call succeeds when API key is in `.env` file
  - **Actual output**:
    ```
    [LLM-Test] ✅ Success!
    [LLM-Test]   Response: "Hello"
    [LLM-Test]   Model:    kimi-k2-0711-preview
    [LLM-Test]   Latency:  1535ms
    ```

#### Latency Observations

- **Measured**: 1535ms (~1.5 seconds) for `kimi-k2-0711-preview` with a simple prompt
  - This is within the expected 1-3 second range from Moonshot documentation
  - The fire-and-forget pattern ensures this latency doesn't block gameplay
  - For production, consider using `kimi-k2-turbo-preview` for even faster responses
  - Cached tokens reduce cost by 75% ($0.15/1M vs $0.60/1M input) — important for AgentRunner

#### Async Handling Approach

The key finding: **async/await works perfectly in RPGJS server hooks**.

- `onConnected` is synchronous, but we use `void promise.then().catch()` to run
  the LLM call in the background without blocking.
- `onAction` and `onJoinMap` are already `async` in our codebase, so `await`-based
  LLM calls will work naturally there.
- The RPGJS event loop (60 FPS game tick) is NOT blocked by our async operations
  because Node.js handles I/O asynchronously.
- **Recommendation for AgentRunner**: Use `async/await` directly in event handlers
  (`onAction`, `onDetectInShape`) and fire-and-forget for idle ticks. The LaneQueue
  should serialize per-agent tasks but allow concurrent execution across agents.

#### Recommendations for TASK-008 (AgentRunner)

1. **Use `openai` package** as the LLM client — it's the standard approach for
   OpenAI-compatible APIs and provides TypeScript types, streaming, and tool use.
2. **Configure `baseURL`** to `https://api.moonshot.ai/v1` in the `LLMClient` class.
3. **API key resolution** should follow the existing project convention:
   `.env.project` → `.env` → `MOONSHOT_API_KEY` → `KIMI_API_KEY`.
4. **Model selection**: Use `kimi-k2-0711-preview` (or `kimi-k2-turbo-preview`)
   for idle behavior, and `kimi-k2.5` for conversations.
5. **Streaming**: The `openai` package supports streaming out of the box. Consider
   using it for conversation responses to reduce perceived latency.
6. **Error handling**: Always wrap LLM calls in try/catch. Network errors, rate
   limits, and auth errors should result in graceful fallback behavior.

#### Runtime Validation ✅

**Status**: ✅ FULLY VALIDATED (2026-02-10)

The LLM integration test is **fully working**:
- API key loaded from `.env` file (via `dotenv`)
- Moonshot API call succeeds
- Response received: "Hello" (correct one-word response)
- Model: `kimi-k2-0711-preview` (as specified)
- Latency: 1535ms (within expected range)
- Server continues running normally — no blocking or crashes

**Setup completed**:
1. Created `.env` file with `MOONSHOT_API_KEY`
2. Installed `dotenv` package
3. Added `import 'dotenv/config'` to `llm-test.ts`
4. Restarted dev server
5. Connected player → LLM test fired and succeeded

**TASK-005 is complete and validated!** Ready to proceed with TASK-006 (PerceptionEngine).
