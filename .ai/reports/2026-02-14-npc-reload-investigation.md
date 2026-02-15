# Investigation Report: NPC Reload Reliability

**Date:** 2026-02-14
**From:** Orchestrator (Claude Code)
**To:** Cursor (Implementation)
**Priority:** High — blocks NPC testing

---

## 1. Problem Summary

AI NPCs spawn once on `simplemap` at server start. They disappear and never return in two scenarios:

- **Scenario A (map change):** Player leaves `simplemap`, returns later — NPCs are gone.
- **Scenario B (browser refresh):** Player refreshes, reconnects, rejoins `simplemap` — NPCs are gone.

Only a full server restart brings NPCs back.

---

## 2. RPGJS Lifecycle Findings

### 2.1 `changeMap()` — what happens when a player changes maps

From `docs/rpgjs-reference/packages/server/src/Scenes/Map.ts` lines 239-309:

1. If `player.prevMap` exists:
   - Calls `player.execMethod('onLeaveMap', [player.getCurrentMap()])` — **this fires our `onLeaveMap` hook if we define one**
   - Calls `World.leaveRoom(player.prevMap, player.id)` — removes the player from the room
2. Sets `player.map = mapId` and `player.events = {}` (clears player's event references)
3. Calls `this.loadMap(mapId)` — loads or retrieves the cached map instance
4. Calls `World.joinRoom(mapId, player.id)` — adds the player to the new room
5. Calls `player.execMethod('onJoinMap', [mapInstance])` — **this fires our `onJoinMap` hook**

### 2.2 Map instance lifecycle and caching

From `loadMap()` (Scenes/Map.ts lines 83-113):

- Maps are cached in `RpgCommonMap.buffer` — once loaded, the same map instance is reused.
- Maps are NOT recreated on re-entry. The same `RpgMap` object persists.

### 2.3 When are dynamic events destroyed?

From `EventManager.removeObject()` (Game/EventManager.ts lines 91-117):

```
// last player before removed of this map
if (map.nbPlayers === 1 && object.type === PlayerType.Player) {
    // clear cache for this map
    map.remove(true)
}
```

**Critical finding:** When the **last player** leaves a map (i.e., `nbPlayers` drops to 1 and that player is being removed), `map.remove(true)` is called. This:
- Calls `removeEvent(eventId)` for every event on the map (line 208 of Game/Map.ts)
- Deletes the map from `RpgCommonMap.buffer`
- Calls `World.removeRoom(this.id)`

**This means: when the last player leaves `simplemap`, ALL dynamic events (including our NPC events) are destroyed, the map instance is removed from the cache, and the room is torn down.**

When a player later returns, `loadMap()` creates a **brand new** map instance (since the buffer was cleared). This new map has zero dynamic events.

### 2.4 `onDisconnected` — what happens on browser refresh

From `server.ts` lines 450-454:

```
private onPlayerDisconnected(playerId: string) {
    const player: RpgPlayer = World.getUser(playerId) as RpgPlayer
    player.execMethod('onDisconnected')
    this.world.disconnectUser(playerId)
}
```

- `onDisconnected` is called (our hook in `player.ts` fires — saves player state)
- `world.disconnectUser(playerId)` removes the player from whatever room they're in

**Key question: Does `disconnectUser` trigger `onLeaveMap`?**

**No, it does not.** The server calls `player.execMethod('onDisconnected')` and then `this.world.disconnectUser(playerId)`. The `disconnectUser` path goes through `simple-room`'s internal logic, which calls `map.onLeave(player)` (defined in Game/Map.ts line 246), which calls `removeObject(player)`. This eventually triggers the "last player" cleanup (removing all events and the map from buffer). But **`onLeaveMap` is NOT called** — that hook is only invoked inside `changeMap()`.

### 2.5 Reconnect flow

From `server.ts` lines 420-428:

When a player reconnects with an existing session:
```
player = existingUser
if (player.map) {
    player.emit('preLoadScene', { reconnect: true, id: player.map })
    player.emitSceneMap()
    this.world.joinRoom(player.map, playerId)
}
```

This does **NOT** call `player.execMethod('onJoinMap')` — it just re-joins the room. **Our `onJoinMap` hook does not fire on reconnect.**

However, in our case the player was disconnected (refresh) → the session-based reconnect might apply. But we also have `onConnected` calling `player.changeMap(savedState.mapId)`, which DOES go through the full `changeMap()` flow and DOES trigger `onJoinMap`. The key issue is that the map was destroyed when the player disconnected (last player left), so `onJoinMap` fires on a fresh map — but our spawn guard (`npcSpawnedOnMap.has(map.id)`) still says `true` because it's a module-level `Set` that never clears.

---

## 3. Root Cause Analysis

There are **two bugs**, both in `main/player.ts`:

### Bug 1: `npcSpawnedOnMap` never clears

```typescript
const npcSpawnedOnMap: Set<string> = new Set()
```

This module-level `Set` adds `'simplemap'` after the first spawn and **never removes it**. There is no `onLeaveMap` hook. So:
- When the player returns to `simplemap` → `npcSpawnedOnMap.has('simplemap')` is `true` → skip spawn
- When the player reconnects → same thing

### Bug 2: `AgentManager.spawnedMaps` never clears

```typescript
// AgentManager.ts
private readonly spawnedMaps = new Set<string>()
// ...
async spawnAgentsOnMap(map: RpgMap): Promise<void> {
    if (this.spawnedMaps.has(map.id)) return  // <-- early return, never spawns again
```

Even if we fix `npcSpawnedOnMap`, the `AgentManager` has its own guard that also never clears.

### Why it matters:

RPGJS destroys all dynamic events when the last player leaves a map. The map instance itself is removed from the buffer. When a player returns, a fresh map is created with no events. But both spawn guards still say "already spawned" — so nothing spawns.

---

## 4. Recommended Fix

### Approach: Clear spawn tracking when the last player leaves

We need to detect "the map is now empty" and clear both spawn guards. RPGJS's `onLeaveMap` hook fires per-player when they `changeMap()` away, and `onDisconnected` fires on browser refresh. In both cases, we should check if the map is now empty and, if so, clear the spawn state.

There's a subtlety: `onLeaveMap` is NOT called on disconnect (only on `changeMap`). So we also need to handle the disconnect path.

### Step-by-step implementation:

#### Step 1: Add `clearMapAgents()` to `AgentManager`

**File:** `src/agents/core/AgentManager.ts`

Add this method to the `AgentManager` class:

```typescript
/**
 * Clear spawn tracking for a map so agents can be re-spawned on next join.
 * Does NOT remove agent registrations or dispose adapters — just allows
 * spawnAgentsOnMap() to run again for this map.
 */
clearMapSpawnState(mapId: string): void {
    this.spawnedMaps.delete(mapId)
    console.log(`${LOG_PREFIX} Cleared spawn state for map: ${mapId}`)
}
```

Note: Do NOT dispose agents or remove them from `this.agents`. The agent configs, runners, memory, and adapters are still valid. We just need to allow `spawnAgentsOnMap()` to create new dynamic events on the fresh map instance.

#### Step 2: Add `onLeaveMap` hook to `player.ts`

**File:** `main/player.ts`

Add this inside the `player: RpgPlayerHooks` object, after the `onJoinMap` method:

```typescript
onLeaveMap(player: RpgPlayer, map: RpgMap) {
    // Check if this was the last player on the map.
    // When onLeaveMap fires, the player is still technically "on" the map
    // (the hook fires before World.leaveRoom), so nbPlayers includes them.
    // If nbPlayers === 1, this is the last player leaving.
    if (map && map.nbPlayers <= 1) {
        console.log(`[NPC Reload] Last player left ${map.id} — clearing spawn state`)
        npcSpawnedOnMap.delete(map.id)
        agentManager.clearMapSpawnState(map.id)
    }
},
```

**Why `nbPlayers <= 1`?** When `onLeaveMap` fires (from `changeMap()`), the player hasn't been removed from the room yet — `World.leaveRoom()` is called AFTER `onLeaveMap`. So if `nbPlayers` is 1, the leaving player is the only one left, meaning the map is about to become empty.

#### Step 3: Handle disconnect (browser refresh) in `onDisconnected`

**File:** `main/player.ts`

Modify the existing `onDisconnected` to also clear spawn state:

```typescript
onDisconnected(player: RpgPlayer) {
    try {
        const map = player.getCurrentMap<RpgMap>()
        const mapId = map?.id ?? 'simplemap'

        // Clear NPC spawn state if this is the last player on the map.
        // On disconnect, the player is still on the map when this hook fires.
        // world.disconnectUser() is called AFTER this hook.
        if (map && map.nbPlayers <= 1) {
            console.log(`[NPC Reload] Last player disconnecting from ${map.id} — clearing spawn state`)
            npcSpawnedOnMap.delete(mapId)
            agentManager.clearMapSpawnState(mapId)
        }

        // Existing: save player state (fire-and-forget)
        playerStateManager
            .savePlayer({
                playerId: player.id,
                name: player.name ?? 'Player',
                mapId,
                positionX: player.position.x,
                positionY: player.position.y,
                direction: (player as unknown as { direction?: number }).direction ?? 0,
                stateData: {},
            })
            .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err)
                console.error(`[PlayerState] Save on disconnect failed for "${player.id}":`, msg)
            })
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[PlayerState] Disconnect handler error for "${player.id}":`, msg)
    }
},
```

#### Step 4: Remove the `simplemap`-only restriction from `onJoinMap`

**File:** `main/player.ts`

The current code only spawns on `simplemap`:
```typescript
if (map && map.id === 'simplemap' && !npcSpawnedOnMap.has(map.id)) {
```

This should be changed to spawn on any map that has matching NPC configs:
```typescript
if (map && !npcSpawnedOnMap.has(map.id)) {
```

This future-proofs NPC spawning for all maps. The `AgentManager.spawnAgentsOnMap()` already filters by `config.spawn.map === map.id`, so only NPCs configured for that map will spawn.

**Note on scripted NPCs:** The hardcoded scripted NPC spawns (TestNPC, Guard, etc.) are currently hardcoded to specific coordinates and only make sense on `simplemap`. You have two choices:
- Keep the `map.id === 'simplemap'` check around ONLY the scripted NPC section
- Or leave as-is for now and address scripted NPC per-map config later

Recommended: wrap just the scripted NPC block in the `simplemap` check.

#### Step 5: Export `clearMapSpawnState` from AgentManager barrel

**File:** `src/agents/core/index.ts`

Make sure the new method is accessible. Since `agentManager` is already exported as an instance, the method will be available on it automatically. No change needed unless there's a type/interface issue.

---

## 5. Why this works for both scenarios

### Scenario A: Player leaves map and returns

1. Player calls `changeMap('othermap')` → RPGJS fires `onLeaveMap` for `simplemap`
2. If this was the last player → `npcSpawnedOnMap.delete('simplemap')` + `agentManager.clearMapSpawnState('simplemap')`
3. RPGJS internally destroys the map instance and all its dynamic events (via `removeObject` → `map.remove(true)`)
4. Player calls `changeMap('simplemap')` → RPGJS creates a fresh map instance, fires `onJoinMap`
5. `npcSpawnedOnMap.has('simplemap')` is `false` → spawn runs → NPCs appear

### Scenario B: Browser refresh

1. Browser disconnects → `onDisconnected` fires
2. If this was the last player → clear spawn state (same as above)
3. `world.disconnectUser()` tears down the room and map
4. Player reconnects → `onConnected` → loads saved state → `player.changeMap(savedState.mapId)`
5. `changeMap` creates a fresh map → `onJoinMap` fires → spawn guard is clear → NPCs spawn

---

## 6. Edge Cases

### Multiple players on the same map

If Player A leaves but Player B is still on the map:
- `map.nbPlayers` will be > 1 when `onLeaveMap` fires
- Spawn state is NOT cleared (correct — the map and its events are still alive)
- When Player B also leaves, then spawn state clears
- The map is destroyed, and next join creates a fresh instance with fresh NPCs

### AgentManager agent instances survive map teardown

The `AgentManager` keeps agent configs, runners, memory, and adapters across map lifecycle. Only the dynamic events (the visual RPGJS entities) are destroyed. When we re-spawn, `spawnAgentsOnMap()` creates new dynamic events but the underlying agent logic is reused. The `AgentNpcEvent.onDestroy()` already calls `bridge.unregisterAgent(this)`, and `onInit()` re-registers. This is correct.

### What about `AgentManager.configsLoaded` guard?

The `configsLoaded` flag prevents re-reading YAML files. This is fine — configs are loaded once and stay in `this.agents`. Only `spawnedMaps` needs to be cleared per-map.

---

## 7. Files to Change

| File | Change |
|------|--------|
| `src/agents/core/AgentManager.ts` | Add `clearMapSpawnState(mapId: string)` method |
| `main/player.ts` | Add `onLeaveMap` hook with last-player check |
| `main/player.ts` | Update `onDisconnected` to clear spawn state on last-player disconnect |
| `main/player.ts` | (Optional) Remove `simplemap`-only restriction from `onJoinMap` |

---

## 8. Testing Plan

1. **Start server, join `simplemap`** → NPCs should appear (baseline, should already work)
2. **Walk to another map, walk back** → NPCs should reappear on `simplemap`
3. **Refresh browser** → After reconnect + state restore, NPCs should appear
4. **Two players:** Player A on `simplemap`, Player B joins → Player A leaves → NPCs should still be there for Player B. Player B leaves → NPCs removed. Player A returns → NPCs respawn fresh.
5. **Check server logs** for `[NPC Reload] Last player left...` and `[AgentManager] Cleared spawn state for map:...` messages.
