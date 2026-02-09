## TASK-004: Build test NPC with patrol route and player interaction

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 1
- **Type**: Create
- **Depends on**: TASK-002
- **Blocks**: none

### Context

Phase 1.2 of the research outline calls for building a test NPC to understand
the RPGJS event system. This NPC will serve as the foundation pattern for
AI-controlled NPCs later. It validates our understanding of the RPGJS APIs
documented in the compass artifacts.

### Objective

A working RPGJS NPC that spawns on a map, patrols a route, detects player
proximity, and responds to player interaction with dynamic text. This proves
the RPGJS APIs work as documented.

### Specifications

- Create an NPC event class in `src/modules/main/server/events/`
- Use `@EventData` with `EventMode.Shared`
- On init: set graphic, start `infiniteMoveRoute` with random movement
- On action: respond to player with `showText` (static text for now)
- Attach a detection shape for proximity awareness
- On `onDetectInShape`: log player approach (foundation for agent trigger)
- Spawn on the default map

### Acceptance Criteria

- [ ] NPC appears on the map when game starts
- [ ] NPC walks around randomly on its own
- [ ] Player can press action near NPC and see dialogue
- [ ] Detection shape logs when player enters/leaves radius
- [ ] `rpgjs build` passes
- [ ] No crashes when player interacts with NPC

### Do NOT

- Connect to LLM or agent system — this is pure RPGJS exploration
- Implement the full GameChannelAdapter yet
- Add agent memory or perception

### Reference Documents

- `idea/02-research-outline.md` — Phase 1.2: NPC/Event System
- Compass artifact on RPGJS internals (in idea/ folder)

### Handoff Notes

[Updated by the assigned agent when status changes]
