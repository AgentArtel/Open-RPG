# ESCALATION: Chat regression — find and restore working state

- **Status**: OPEN (escalated to Claude Code)
- **Assigned**: claude-code
- **Priority**: P0-Critical
- **Type**: Debug / Restore
- **Created**: 2026-02-09
- **Context**: User reports chat (connection + agent responding) was tested and published; it no longer works. User believes the working code is in **one of the frontend commits from awhile back**.

---

## Problem

- **Gateway** connects (green dot, Settings test passes).
- **Chat** does not work: no response when sending a message (or errors/timeouts).
- Eveng1 channel (port 3377) may also fail if the plugin does not load in Docker; gateway chat (port 18789) should work independently.

Previously, the same flow worked: connection + agent responding. A regression was introduced (or environment/backend changed); the fix is likely **reverting or reconciling a prior frontend commit**.

---

## What has already been tried (do not redo blindly)

1. **Gateway API params:** Frontend now sends `idempotencyKey` and does **not** send `agentId` (gateway had returned "Invalid chat.send params: must have required property 'idempotencyKey'; unexpected property 'agentId'").
2. **Error surfacing:** Gateway and timeout errors are shown in the UI and via toast.
3. **Event handling:** Listener subscribes to `chat`, `chat.delta`, `chat.final`, `chat.error` and normalizes snake_case (`session_key`, etc.).
4. **Eveng1 plugin in Docker:** Local `openclaw-shim.ts` added so the plugin can load without OpenClaw source in the image.
5. **Docs:** `docs/CHAT-RECOVERY.md` and in-app hints describe the exact working path (gateway + synced agent + Chat with that agent).

None of the above restored working chat. So the regression is likely:

- A **behavioral or structural change** in the frontend (e.g. when/how we send, how we subscribe to events, or how we derive `openclawAgentId` / `sessionKey`), or
- A **removed or refactored path** that was actually used when it worked.

---

## Your mission (Claude Code)

1. **Locate the last known-good frontend state for chat**
   - Repo: `frontend-lovable/clawlens-companion` (and any parent that tracks it if this is a submodule).
   - Focus on **frontend** commits; user said the fix is “in one of the commits to the frontend awhile back.”
   - Likely useful commits (from `.ai/status.md`): **050e05e** (Phase 4: OpenClaw Gateway Integration), **8aed7e8** (fix: remove dead sessionKey ternary in Chat). Also any commit that touches Chat/gateway/eveng1 between Phase 4 and now.

2. **Compare these files against current**
   - `src/pages/Chat.tsx`
   - `src/hooks/use-openclaw-chat.ts`
   - `src/hooks/use-gateway-api.ts`
   - `src/hooks/use-gateway-connection.ts`
   - `src/hooks/use-eveng1-channel.ts`
   - Optionally: `src/pages/Settings.tsx` (connection test, gateway URL/token).

   Use `git log --oneline -- frontend-lovable/clawlens-companion/src/pages/Chat.tsx` (and same for the hooks) to see history, then `git show <commit>:frontend-lovable/clawlens-companion/src/pages/Chat.tsx` (or path from repo root) to inspect prior versions.

3. **Identify the delta that broke chat**
   - Possible causes: different `chat.send` params, different event subscription (e.g. only `'chat'` vs multiple), different `sessionKey` or `agentId` derivation, different conditions for “use gateway path” vs “use eveng1 path”, or a removed fallback that previously succeeded.
   - Reconcile with **current backend contract**: gateway expects `idempotencyKey`, no `agentId`; events may be `chat` or `chat.delta`/`chat.final`/`chat.error`; payload may be camelCase or snake_case.

4. **Apply a minimal fix**
   - Restore or reimplement the behavior that made chat work (e.g. correct params, subscription, or path selection), while keeping: idempotencyKey, no agentId, and current error handling.
   - Do not remove the eveng1 shim, CHAT-RECOVERY.md, or multi-event normalization unless you prove they are the cause.

5. **Verify**
   - After your change: gateway connected, one agent synced (Agent Management → Sync to OpenClaw), Chat with that agent, send message → reply appears (streaming or full). Document in the task or in a short comment what you changed and why.

---

## Repo layout (for git commands)

- Project root: `Even-Openclaw` (or workspace root).
- Frontend app: `frontend-lovable/clawlens-companion/`.
- If the frontend is in a **submodule**, run git from the submodule dir for `git log`/`git show` on frontend files, e.g.  
  `cd frontend-lovable/clawlens-companion && git log --oneline -- src/pages/Chat.tsx`

---

## References

- **Working path (intended):** `docs/CHAT-RECOVERY.md`, `docs/GATEWAY-TESTING.md`
- **Phase 4 completion:** `.ai/status.md` (050e05e, 8aed7e8)
- **Chat task spec:** `.ai/tasks/TASK-P4-04.md`
- **Gateway API surface:** `.ai/status.md` (OpenClaw Gateway API Surface)

---

## Success criteria

- User can: open Chat, select a **synced** agent, send a message, and see the agent’s reply (streaming or full).
- Gateway connection remains stable (no unnecessary reconnect that drops the reply).
- No regression in eveng1/Default path if the plugin is loaded.

Close this task when the fix is merged and verified, and add a one-line note to `.ai/status.md` under “Recently Completed” (e.g. “TASK-ESCALATE-CHAT-REGRESSION: restore chat via … (claude-code)”).
