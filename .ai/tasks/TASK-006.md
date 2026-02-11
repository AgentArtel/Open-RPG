## TASK-006: Build PerceptionEngine

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 3 (Core Implementation)
- **Type**: Create
- **Depends on**: TASK-003 (interfaces), TASK-005 (LLM validated)
- **Blocks**: TASK-008

### Context

The PerceptionEngine converts RPGJS game state into compact text that the LLM
can understand. It reads the NPC's position, nearby entities, and map info,
then produces a structured `PerceptionSnapshot` within a strict 300-token budget.

Interfaces are already defined in `src/agents/perception/types.ts`.

### Objective

A working PerceptionEngine that implements `IPerceptionEngine` and produces
valid `PerceptionSnapshot` objects from game state.

### Specifications

**Create files:**
- `src/agents/perception/PerceptionEngine.ts` — main implementation
- `src/agents/perception/index.ts` — module exports

**Key requirements:**

1. **Implement `generateSnapshot(context: PerceptionContext)`**:
   - Accept a `PerceptionContext` (agentId, position, map, rawEntities)
   - Calculate direction (8 cardinal: N/NE/E/SE/S/SW/W/NW) and distance
     for each entity relative to the NPC's position
   - Sort entities by distance (closest first)
   - Cap at `MAX_NEARBY_ENTITIES` (5)
   - Generate a one-line narrative `summary` in second person
   - Estimate token count and enforce `PERCEPTION_TOKEN_BUDGET` (300)

2. **Token estimation**:
   - Heuristic: 1 token ≈ 4 characters
   - If over budget, trim entities starting from farthest
   - If still over, truncate summary

3. **Direction calculation**:
   - Use tile-based delta (target.x - npc.x, target.y - npc.y)
   - Map to 8 cardinal directions based on angle

4. **Summary generation**:
   - Format: "You are in {mapName}. {nearbyDescription}."
   - Example: "You are in the village square. A player named Alex
     approaches from the east. Two other NPCs are nearby."
   - Keep to 1-2 sentences

### Acceptance Criteria

- [ ] `PerceptionEngine` class implements `IPerceptionEngine`
- [ ] `generateSnapshot()` returns valid `PerceptionSnapshot`
- [ ] Token budget enforced (< 300 tokens estimated)
- [ ] Entities sorted by distance, capped at 5
- [ ] Direction calculated correctly for all 8 cardinals
- [ ] Empty entity list handled gracefully
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Integrate with live NPCs yet (that's the bridge layer, Phase 4)
- Use LLM calls in perception (this is pure game-state-to-text conversion)
- Add complex NLP or tokenization libraries (heuristic is fine for MVP)

### Reference

- Interface: `src/agents/perception/types.ts` (PerceptionSnapshot, PerceptionContext, NearbyEntity)
- Bridge types: `src/agents/bridge/types.ts` (Position, MapInfo)
- Test NPC: `main/events/test-npc.ts` (shows RPGJS entity/map access patterns)
- RPGJS event guide: `docs/rpgjs-reference/docs/guide/event.md`
- Prior art: `docs/prior-art-analysis.md` — all three projects validate structured text perception
- **Plugin analysis**: `docs/rpgjs-plugin-analysis.md` — Components API can display
  NPC name labels via `setComponentsTop(Components.text('{name}'))`
- **Key API insight**: `RpgEvent extends RpgPlayer` — NPCs have access to all
  position/map query methods that players do

### Handoff Notes

_(To be filled by implementer)_
