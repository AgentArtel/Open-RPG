## TASK-013: Player State Persistence via Supabase

- **Status**: DONE
- **Assigned**: cursor
- **Priority**: P2-Medium
- **Phase**: 5 (Player Persistence)
- **Type**: Create + Modify
- **Depends on**: TASK-012 (Supabase client singleton must exist)
- **Blocks**: Nothing

### Context

Player state (position, map, name, variables) is lost when the browser tab closes
or the server restarts. RPGJS's built-in `@rpgjs/save` plugin uses client-side
localStorage, which doesn't work for a server-authoritative multiplayer game.

With Supabase already set up from TASK-012, we can store player state server-side
in Postgres. Save on disconnect, restore on reconnect.

### Objective

A `PlayerStateManager` that saves player position and state to Supabase when they
disconnect, and restores it when they reconnect. Players pick up where they left off.

### Specifications

**Create files:**
- `supabase/migrations/002_player_state.sql` — Player state table
- `src/persistence/PlayerStateManager.ts` — Save/load/delete player state
- `src/persistence/index.ts` — Exports

**Modify files:**
- `main/player.ts` — Add save on disconnect, load on connect

**Database Schema (`002_player_state.sql`):**

```sql
create table player_state (
  player_id     text primary key,
  name          text,
  map_id        text,
  position_x    integer,
  position_y    integer,
  direction     smallint default 0,
  state_data    jsonb default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create or replace function update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger player_state_updated
  before update on player_state
  for each row execute function update_timestamp();
```

**PlayerStateManager (`src/persistence/PlayerStateManager.ts`, ~80 lines):**

```typescript
export interface PlayerState {
  playerId: string
  name: string
  mapId: string
  positionX: number
  positionY: number
  direction: number
  stateData: Record<string, unknown>
}
```

Methods:
- **`savePlayer(state: PlayerState)`**: Upsert into `player_state` table.
  Logs errors, never throws.
- **`loadPlayer(playerId: string)`**: Select from `player_state` by `player_id`.
  Returns `PlayerState | null`. Returns `null` on error or not found.
- **`deletePlayer(playerId: string)`**: Delete from `player_state`.
  For account cleanup if needed.

**Player Hooks (`main/player.ts`):**

In `onConnected` or `onJoinMap`:
```typescript
const playerState = await playerStateManager.loadPlayer(player.id)
if (playerState) {
  // Restore to saved map and position
  if (playerState.mapId && playerState.mapId !== currentMapId) {
    await player.changeMap(playerState.mapId, {
      x: playerState.positionX,
      y: playerState.positionY,
    })
  }
}
```

Add `onDisconnected` hook:
```typescript
onDisconnected(player: RpgPlayer) {
  const map = player.getCurrentMap()
  playerStateManager.savePlayer({
    playerId: player.id,
    name: player.name ?? 'Player',
    mapId: map?.id ?? 'simplemap',
    positionX: player.position.x,
    positionY: player.position.y,
    direction: player.direction ?? 0,
    stateData: {},
  }).catch(err => {
    console.error('[PlayerState] save on disconnect failed:', err)
  })
}
```

**Graceful degradation:**
- If Supabase is unavailable (no env vars), skip save/load entirely
- If load returns `null`, player starts at default spawn (existing behavior)
- If save fails, log error but don't prevent disconnect
- Use the same `getSupabaseClient()` singleton from TASK-012

### Acceptance Criteria

- [x] SQL migration creates `player_state` table with auto-updating `updated_at`
- [x] `PlayerStateManager.savePlayer()` upserts player state
- [x] `PlayerStateManager.loadPlayer()` retrieves saved state
- [x] `main/player.ts` saves state on `onDisconnected`
- [x] `main/player.ts` restores state on `onConnected`/`onJoinMap`
- [x] Player position persists across browser refresh (manual test)
- [x] No crash when Supabase is unavailable (graceful skip)
- [x] `rpgjs build` passes
- [x] `npx tsc --noEmit` passes

### Do NOT

- Use `@rpgjs/save` plugin (it's client-side localStorage)
- Store sensitive data in `state_data` (no passwords, tokens, etc.)
- Add authentication or user accounts (future feature)
- Modify the Supabase client singleton (built in TASK-012)
- Auto-save on a timer (save only on disconnect for MVP)
- Handle `changeMap` restoration for maps that don't exist (just catch and use default)

### Reference

- Feature idea: `.ai/idea/06-supabase-persistence.md`
- Implementation plan: `.ai/idea/06a-supabase-implementation-plan.md`
- Supabase client: `src/config/supabase.ts` (TASK-012 output)
- Player hooks: `main/player.ts`
- RPGJS player API: `docs/rpgjs-guide.md`
- Plugin analysis (why @rpgjs/save was skipped): `docs/rpgjs-plugin-analysis.md`

### Handoff Notes

**Implemented by Cursor (commit d145283, 2026-02-14).**

Files created:
- `src/persistence/PlayerStateManager.ts` (195 lines) — save/load/delete with Supabase, graceful null-client no-op
- `src/persistence/index.ts` (32 lines) — barrel exports + `createPlayerStateManager()` factory
- `supabase/migrations/002_player_state.sql` (36 lines) — table, trigger, comment
- `src/persistence/VERIFICATION.md` — manual test instructions
- `src/persistence/test-manual.ts` — DB round-trip test script
- `src/persistence/test-edge-cases.ts` — edge case tests

Files modified:
- `main/player.ts` — `onConnected` loads state and restores map/position; `onDisconnected` saves state fire-and-forget

Implementation matches spec exactly. Direction accessed via cast `(player as unknown as { direction?: number }).direction ?? 0` since RpgPlayer typing doesn't expose it directly. All errors caught — never crashes.
