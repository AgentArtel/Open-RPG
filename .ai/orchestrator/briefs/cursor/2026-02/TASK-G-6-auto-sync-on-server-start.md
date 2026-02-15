# TASK-G-6: Optional Auto-Sync on Server Start

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Open-RPG (game)
**Agent:** Cursor
**Game-repo task:** NEW
**Priority:** Wave 1 (after G-5)
**Depends on:** G-5 (TMX parser + sync + CLI)
**Blocks:** Nothing directly (convenience feature)

---

## Goal

Add an optional, non-blocking TMX-to-DB sync that runs automatically when the game server starts, controlled by an environment variable. This keeps the database in sync with Tiled map changes without requiring a manual CLI step.

## Context

G-5 provides the sync pipeline as a CLI script (`npm run sync-maps`). This task adds a second trigger point: the game server's `onStart` hook. It's opt-in via `SYNC_TMX_ON_START=true` — disabled by default so it doesn't add startup latency in production unless explicitly enabled.

## Deliverables

1. **Modify `main/server.ts`** — In the `onStart` hook (or equivalent server startup path), add:
   ```typescript
   if (process.env.SYNC_TMX_ON_START === 'true') {
     syncAllMaps().catch(err =>
       console.error('[TMX-Sync] Non-blocking sync failed:', err.message)
     )
   }
   ```
   - Import `syncAllMaps` from the sync module created in G-5.
   - Fire-and-forget (non-blocking) — the server continues starting regardless of sync result.
   - Sync failure logs an error but does NOT prevent the server from starting.

2. **Update `.env.example`** — Add `SYNC_TMX_ON_START=false` with a comment explaining its purpose.

## Acceptance Criteria

- [ ] With `SYNC_TMX_ON_START=true` in `.env`, server start triggers TMX sync and logs `[TMX-Sync]` output.
- [ ] With `SYNC_TMX_ON_START` unset or `false`, no sync runs on start.
- [ ] If sync fails (e.g. Supabase unreachable), the error is logged and the server starts normally.
- [ ] The sync is non-blocking — server startup is not delayed waiting for sync completion.
- [ ] `rpgjs build` passes.
- [ ] `npx tsc --noEmit` passes (or only pre-existing errors).

## Do

- Keep it simple — one `if` check and one async call with `.catch()`.
- Use the same `syncAllMaps` function from G-5 (no duplication).
- Log clearly so developers know sync ran (or was skipped).

## Don't

- Don't make sync blocking — the server must start immediately.
- Don't enable sync by default — it's opt-in.
- Don't duplicate sync logic — import from G-5's module.
- Don't add sync to any other hook (e.g. `onJoinMap`) — this is server-start only.

## Reference

- TMX-to-DB sync plan: `.cursor/plans/tmx-to-db_sync_layer_662fb5b6.plan.md` (Phase 5)
- G-5 sync module: `src/sync/syncMapEntities.ts` (provides `syncAllMaps`)
- Server hooks: `main/server.ts`
