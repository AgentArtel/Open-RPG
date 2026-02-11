## TASK-006: Build PerceptionEngine

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 3 (Core Implementation)
- **Type**: Create
- **Depends on**: TASK-003, TASK-005
- **Blocks**: TASK-008

### Context

The PerceptionEngine converts game state (player positions, NPCs, map info) into a text description that the LLM can understand. It implements `IPerceptionEngine` from the TypeScript interfaces.

### Objective

A working PerceptionEngine that generates structured perception snapshots from RPGJS game state, staying within the 300-token budget.

### Specifications

Create `src/agents/perception/PerceptionEngine.ts` implementing `IPerceptionEngine`:

**Key requirements:**
1. **Generate snapshot from game context**:
   - Player position and map name
   - Nearby entities (NPCs, players) with direction and distance
   - Token estimation for budget enforcement

2. **Output format** (`PerceptionSnapshot`):
   ```typescript
   {
     summary: string;           // Brief narrative description
     location: { map: string, position: { x, y } };
     nearbyEntities: NearbyEntity[];  // Max 5 entities
     timestamp: number;
     tokenEstimate: number;     // Must stay under 300
   }
   ```

3. **Entity detection**:
   - Query map for events/players within radius
   - Calculate direction (N/NE/E/SE/S/SW/W/NW) and distance
   - Sort by distance (closest first)
   - Limit to 5 entities (per `MAX_NEARBY_ENTITIES`)

4. **Token estimation**:
   - Rough heuristic: 1 token ≈ 4 characters
   - Trim entities if budget exceeded
   - Prioritize closest entities

**Files to create:**
- `src/agents/perception/PerceptionEngine.ts` — main implementation
- `src/agents/perception/index.ts` — module exports

### Acceptance Criteria

- [ ] `PerceptionEngine` class implements `IPerceptionEngine`
- [ ] `generateSnapshot()` produces valid `PerceptionSnapshot`
- [ ] Token budget enforced (`PERCEPTION_TOKEN_BUDGET = 300`)
- [ ] Nearby entities limited to 5, sorted by distance
- [ ] Direction calculated correctly (8 cardinal directions)
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Unit test or manual test shows working snapshot generation

### Do NOT

- Integrate with actual NPCs yet (that comes in TASK-009)
- Use actual LLM calls in this task (just prepare the perception text)
- Exceed 300 token budget (design constraint)

### Reference

- Interface: `src/agents/perception/types.ts`
- Test NPC: `main/events/test-npc.ts` (shows how to get player/map info)
- RPGJS map API: `docs/rpgjs-reference/docs/guide/event.md`

### Handoff Notes

_(To be filled by implementer)_
