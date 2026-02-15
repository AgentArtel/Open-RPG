# Handoff to Claude Code: NPC Reload Reliability

**From:** Cursor (Implementation)  
**To:** Claude Code (Orchestrator)  
**Date:** 2025-02-14  
**Priority:** High — blocks testing of photographer form and config-refresh; NPCs are not loading reliably.

---

## Observed behavior

1. **Game start:** AI NPCs load on the starting map (e.g. `simplemap`) and appear correctly.
2. **Leave map and return:** When the player changes maps (e.g. goes to another map) and then returns to `simplemap`, **NPCs do not reappear**. The map is empty of AI NPCs until server restart.
3. **Browser refresh:** After a full page refresh, **NPCs do not appear** on the map the player rejoins (e.g. after state restore to `simplemap`). They only reappear after **restarting the game server**.
4. We do not have other maps with NPCs yet, so we have only tested `simplemap`.

This makes it impossible to reliably test the photographer form and config-refresh fixes until NPC spawn/reload is stable.

---

## Current implementation (relevant parts)

- **Spawn tracking (module-level):** `npcSpawnedOnMap: Set<string>` in `main/player.ts` — we add a map id after successfully calling `agentManager.spawnAgentsOnMap(map)` in `onJoinMap`.
- **AgentManager:** `spawnedMaps: Set<string>` in `src/agents/core/AgentManager.ts` — prevents duplicate spawns; `spawnAgentsOnMap(map)` returns early if `spawnedMaps.has(map.id)`.
- **onJoinMap** (in `main/player.ts`): Only runs spawn when `map && map.id === 'simplemap' && !npcSpawnedOnMap.has(map.id)`. So we spawn at most once per map id per process lifetime, and only on `simplemap`.
- **No onLeaveMap:** There is currently no `onLeaveMap` hook in the codebase. A previous plan added `onLeaveMap` to clear `npcSpawnedOnMap` and call `agentManager.clearMapAgents(map.id)` so that re-entering the map would allow spawn again; that code may have been reverted or not merged.
- **AgentManager.clearMapAgents:** Implemented in `src/agents/core/AgentManager.ts` — removes the map from `spawnedMaps` and removes all agent instances for that map. So the *agent system* is prepared for re-spawn; the missing piece is reliably clearing the *spawn* decision when the player (or the map) “leaves.”

---

## What we need from you

1. **RPGJS lifecycle research**
   - When exactly does RPGJS call `onLeaveMap`? (We see in `docs/rpgjs-reference/packages/server/src/Scenes/Map.ts` that `player.execMethod('onLeaveMap', [player.getCurrentMap()])` is called inside `changeMap()` before the player’s map id is updated and before `World.leaveRoom`.)
   - When does RPGJS destroy or tear down a map instance and its dynamic events? Is it when the last player leaves the room, or only on server shutdown?
   - On **client disconnect** (e.g. refresh), does the server call `onLeaveMap` for that player, or does the player just disappear from the room without a formal “change map”?
   - How do “rooms” (`World.leaveRoom` / `World.joinRoom`) relate to map instances and to our spawn-tracking? Should we key our cleanup off “last player left the room” or off something else?

2. **Recommended fix**
   - Propose a **reliable** approach so that:
     - **Scenario A:** Player leaves `simplemap` (e.g. changeMap to another map) and later returns → NPCs spawn again (or remain if the map instance and events are still alive — clarify expected behavior).
     - **Scenario B:** Player refreshes the page; when they reconnect and re-join the same map (e.g. after state restore), NPCs appear (we must not treat “reconnect” as “already spawned” if the map was effectively reset or is a new instance).
   - Align with RPGJS patterns: when to use `onLeaveMap`, whether to use room/player-count logic, and how dynamic events’ lifecycle interacts with our agent spawn tracking.
   - Consider whether spawn tracking should be **per map instance** vs **per map id** if RPGJS reuses or recreates map instances.

3. **Deliverable**
   - A short **investigation report** (in `docs/` or `.ai/`) that:
     - Describes the RPGJS lifecycle as it applies to our use case (changeMap, disconnect, rooms, map/event lifecycle).
     - States clearly what we should do (e.g. add `onLeaveMap` and clear both `npcSpawnedOnMap` and `agentManager.clearMapAgents`; and/or clear spawn state when the last player leaves a room; and/or handle `onDisconnected` for the refresh case).
     - Gives a concrete, step-by-step fix (with file/function names) so Cursor can implement it without guessing.

---

## Files to inspect

- `main/player.ts` — `onJoinMap`, (missing) `onLeaveMap`, `onDisconnected`; `npcSpawnedOnMap`.
- `src/agents/core/AgentManager.ts` — `spawnAgentsOnMap`, `spawnedMaps`, `clearMapAgents`.
- RPGJS reference: `docs/rpgjs-reference/packages/server/src/Scenes/Map.ts` (`changeMap`, `loadMap`), and any docs or code about `World.leaveRoom` / `World.joinRoom` and when map instances are destroyed.

---

## Success criteria

- NPCs appear on first join of a map (current behavior, keep it).
- NPCs reappear when the player leaves the map and later returns (changeMap away then back), without restarting the server.
- NPCs appear after a browser refresh when the player reconnects and joins the same map (e.g. restored to `simplemap`), without restarting the server.
- Approach is documented and aligned with RPGJS so we don’t rely on process-lifetime “already spawned” state that never clears.

Thank you for investigating and reporting back with the recommended fix.
