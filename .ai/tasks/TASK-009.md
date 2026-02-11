# TASK-009: Build GameChannelAdapter (bridge)

- **Status**: DONE
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 4
- **Type**: Create
- **Depends on**: TASK-008
- **Blocks**: (none)

## Context

Phase 3 delivered AgentRunner, LaneQueue, PerceptionEngine, and skills. The live test NPC (AgentRunnerTestNPC) manually wired runner, lane queue, and setInterval in its own class. Phase 4 introduces a bridge layer so any AI NPC can register with a central Bridge and delegate RPGJS hooks (onAction, idle, etc.) without duplicating wiring. Only bridge types existed; no implementation.

## Objective

Implement GameChannelAdapter and Bridge (Option A from Phase 4 plan). Refactor one AI NPC to use them. Ensure idle ticks and conversation (with in-game dialogue) still work after refactor.

## Specifications

- GameChannelAdapter: implements IGameChannelAdapter; builds AgentEvents from hook calls; enqueues runner.run(event) on LaneQueue; owns idle setInterval; dispose() clears timer.
- Bridge: implements IBridge; registerAgent(event, agentId, adapter); unregisterAgent(event); getAgentId(event); handlePlayerAction/Proximity/Leave; dispose.
- AgentRunnerTestNPC: builds runner/lane in onInit, creates GameChannelAdapter, registers with shared bridge; onAction forwards to bridge.handlePlayerAction; no local setInterval or enqueue logic; onDestroy unregisters and disposes runner.
- Optional: AgentRunner says response text to player when LLM returns text but does not call say tool (conversation dialogue fix).

## Acceptance Criteria

- [x] GameChannelAdapter implements IGameChannelAdapter and enqueues to LaneQueue/runner.
- [x] Bridge implements IBridge (register, unregister, getAgentId, handlePlayerAction/Proximity/Leave, dispose).
- [x] AgentRunnerTestNPC uses bridge: registers on init, forwards onAction to bridge, no local setInterval/enqueue.
- [x] Idle behavior runs via adapter setInterval; conversation and skills behave as before.
- [x] rpgjs build passes; no new runtime errors; one AI NPC works in-game (talk + idle, dialogue shown).
- [x] Bridge manual + edge-case tests added and passing.

## Do NOT

- Implement AgentManager in this task (follow-up).
- Change core types beyond what bridge needs.

## Reference Documents

- `.cursor/plans/phase_4_bridge_layer_d0d93f4d.plan.md`
- `src/agents/bridge/types.ts`
- `docs/openclaw-patterns.md`

## Handoff Notes

**Completed 2026-02-11.**

- **New files**: `src/agents/bridge/GameChannelAdapter.ts`, `src/agents/bridge/Bridge.ts`, `src/agents/bridge/index.ts` (exports + shared `bridge` singleton), `src/agents/bridge/test-manual.ts`, `src/agents/bridge/test-edge-cases.ts`.
- **Refactored**: `main/events/agent-runner-test-npc.ts` — uses Bridge + GameChannelAdapter; registers in onInit, forwards onAction to bridge, unregisters in onDestroy.
- **Dialogue fix**: In `src/agents/core/AgentRunner.ts`, when event is `player_action` and LLM returns text but did not call the say tool, runner now executes the say skill with that text so the player sees the reply in-game.
- **Tests**: Core (5+10), skills (5+8), perception (5+10), bridge (5 manual + 8 edge) — all passing. Live test: bridge registration, idle ticks, and conversation with dialogue verified.
- **Known behavior**: Multiple rapid action-key presses enqueue multiple onAction tasks; player may see several NPC replies in sequence (serialized per agent). Documented in `.ai/status.md` under "Known Behavior (Phase 4 Bridge)".
