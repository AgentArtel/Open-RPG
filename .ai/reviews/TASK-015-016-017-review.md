# Code Review: TASK-015, TASK-016, TASK-017

**Agent:** cursor  
**Submitted:** 2026-02-13  
**Commit:** `4b32195 [AGENT:cursor] [ACTION:submit] [TASK:015,016,017] Sprint 4 complete: speech bubbles, conversation log, Railway deploy`  
**Reviewer:** kimi  

---

## Summary

Sprint 4 tasks (Polish + Deploy) submitted together. All acceptance criteria are met. Build passes. No boundary violations.

---

## Checklist

### Required Checks

| Check | Status | Notes |
|-------|--------|-------|
| Acceptance criteria met | ✅ | All three task briefs satisfied |
| Files within agent boundary | ✅ | All files in Cursor's domain |
| No boundary violations | ✅ | No changes to other agent files |
| Build passes | ✅ | `npm run build` succeeds |
| No regressions | ✅ | Core functionality intact |
| Consistent with conventions | ✅ | Follows RPGJS patterns |
| Commit message format | ✅ | `[AGENT:cursor] [ACTION:submit] [TASK:015,016,017] ...` |
| Task brief updated | ✅ | All tasks marked DONE with handoff notes |

### Optional Checks

| Check | Status | Notes |
|-------|--------|-------|
| Types correct | ✅ | No new TypeScript errors introduced |
| Error handling | ✅ | Try/catch in player.ts, say.ts socket emit |
| Documentation updated | ✅ | Cursor plan file added, task briefs updated |

---

## TASK-015: NPC Speech Bubble GUI

### Acceptance Criteria

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| `main/gui/npc-bubble.vue` exists | ✅ | Created with `rpgAttachToSprite: true`, `rpgScene`/`rpgSocket` injections |
| Component uses `rpgAttachToSprite: true` | ✅ | Static property set |
| Component uses `inject: ['rpgScene']` | ✅ | Also injects `rpgSocket` for event listening |
| Bubble auto-dismisses after ~4s | ✅ | 3.5s fade start, 4s clear |
| `say` skill accepts `mode` parameter | ✅ | Added to parameters, `enum: ['modal', 'bubble']` |
| `GameContext` has `defaultSpeechMode` | ✅ | Added to `types.ts` interface |
| `AgentNpcEvent` sets `defaultSpeechMode` | ✅ | `event.type === 'player_action' ? 'modal' : 'bubble'` |
| Content policy in system prompt | ✅ | Rule added to AgentRunner system prompt |

### Notes

- Bubble implementation uses Socket.IO broadcast via `engine.io.emit` - clever workaround for RPGJS sprite-attached GUI limitations
- Content blocklist check (`BLOCKED_PATTERNS`) added to say skill
- Modal path (blocking dialogue) preserved for `player_action` events

---

## TASK-016: Agent Conversation Log GUI

### Acceptance Criteria

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| `main/gui/conversation-log.vue` exists | ✅ | Full side panel with tabs, scrollable messages |
| Toggles via 'L' key | ✅ | `rpg.toml` keybind + `rpgKeypress` subscription |
| Non-blocking (`blockPlayerInput: false`) | ✅ | Set in `player.ts` onInput handler |
| Messages grouped by NPC with tabs | ✅ | `npcList` computed property, filter by `selectedNpc` |
| Shows role, content, timestamp | ✅ | `senderName` maps role to NPC name or "You" |
| Messages sorted newest-first | ✅ | `.sort((a, b) => b.timestamp - a.timestamp)` |
| Empty state displayed | ✅ | "No conversations yet. Talk to an NPC!" |
| `AgentManager.getConversationsForPlayer()` | ✅ | Implemented, returns `ConversationSnapshot[]` |
| User messages stored with `playerId` | ✅ | Added in `AgentRunner.run()` when `event.player` exists |

### Notes

- `getAllMessages()` already existed on `IAgentMemory` - good reuse
- User message storage added to AgentRunner with `metadata: { playerId }` for filtering
- Panel styling matches task spec (dark theme, blue accents)

---

## TASK-017: Deploy to Railway

### Acceptance Criteria

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| `railway.toml` exists | ✅ | DOCKERFILE build, `/health` healthcheck, restart policy |
| `main/server.ts` with `/health` endpoint | ✅ | Returns `{ status: 'ok', uptime, timestamp }` |
| Uses `engine.app` (confirmed API) | ✅ | `onStart(engine: RpgServerEngine)` hook |
| Dockerfile uses `$PORT` | ✅ | `ENV PORT=3000`, `EXPOSE $PORT` |
| Dockerfile has HEALTHCHECK | ✅ | wget-based check against `/health` |
| `package.json` has `engines.node: "18"` | ✅ | Changed from `>=14` to `"18"` |

### Notes

- Health check endpoint tested and returns 200 in dev mode
- Human needs to set env vars in Railway dashboard (MOONSHOT_API_KEY, SUPABASE_URL, etc.)

---

## Files Reviewed

| File | Status | Assessment |
|------|--------|------------|
| `main/gui/npc-bubble.vue` | ✅ | Clean Vue component, follows RPGJS sprite-attached GUI pattern |
| `main/gui/conversation-log.vue` | ✅ | Well-structured panel, proper injections, toggle behavior |
| `main/server.ts` | ✅ | Correct server hook structure, health check registered |
| `main/player.ts` | ✅ | Input handler for 'conversation-log' added, error handling |
| `main/events/AgentNpcEvent.ts` | ✅ | `defaultSpeechMode` added to `buildRunContext()` |
| `src/agents/skills/skills/say.ts` | ✅ | `mode` parameter, content blocklist, bubble emit via Socket.IO |
| `src/agents/skills/types.ts` | ✅ | `defaultSpeechMode?: 'modal' \| 'bubble'` added to `GameContext` |
| `src/agents/core/AgentManager.ts` | ✅ | `getConversationsForPlayer()` implemented with proper filtering |
| `src/agents/core/AgentRunner.ts` | ✅ | User message storage with `playerId` metadata |
| `railway.toml` | ✅ | Build/deploy config per Railway spec |
| `Dockerfile` | ✅ | PORT env, HEALTHCHECK instruction |
| `package.json` | ✅ | Engine pin to Node 18 |
| `rpg.toml` | ✅ | `conversation-log` keybind added |
| `.ai/tasks/sprint-4-polish-deploy/*` | ✅ | Task statuses updated to DONE |

---

## Findings

### 1. Clean implementation of bubble mode
The say skill uses `inject(RpgServerEngine)` to access the Socket.IO instance for broadcasting bubble events. This is a pragmatic workaround given RPGJS's GUI system limitations for NPC-attached components.

### 2. Conversation data persistence
User messages are now stored in memory (and Supabase when configured) with `playerId` metadata, enabling per-player conversation history. The `getConversationsForPlayer()` method correctly filters to show only relevant exchanges.

### 3. Railway deployment ready
All infrastructure pieces in place: health endpoint, Docker healthcheck, proper PORT handling, restart policy. Human just needs to create Railway project and set env vars.

### 4. Three-tier speech strategy implemented
- `player_action` → `modal` (blocking dialogue)
- `player_proximity` → `bubble` (non-blocking)
- `idle_tick` → `bubble` (ambient)

### 5. Pre-existing TypeScript errors not in scope
The `tsc --noEmit` errors are in test files (`test-edge-cases.ts`, `test-manual.ts`) and `node_modules` - none introduced by this commit.

---

## Feedback

**None required.** All tasks meet acceptance criteria.

**Optional future improvements** (not blocking):
- Speech bubble UI could be shown for all players on the same map (currently broadcasts to all connected clients, filter by map if needed)
- Conversation log panel currently refreshes only on open; real-time updates would require WebSocket subscription (not in scope)

---

## Decision

| Verdict | **APPROVED** |
|---------|--------------|

All three tasks (TASK-015, TASK-016, TASK-017) are complete and meet acceptance criteria. Ready to merge to `pre-mortal`.

---

## Next Actions

1. **Merge to `pre-mortal`**: `git merge cursor/TASK-015-016-017 --no-ff`
2. **Update `.ai/status.md`**: Mark TASK-015, TASK-016, TASK-017 as DONE
3. **Human PM**: Create Railway project, set env vars (MOONSHOT_API_KEY, SUPABASE_*, NODE_ENV), deploy
4. **Next sprint**: Sprint 5 (API-as-Identity + Social) ready to begin
