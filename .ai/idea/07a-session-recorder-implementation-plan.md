# Session Recorder & NPC Jobs — Implementation Plan

## Overview

Implement the feature in three phases. Each phase is shippable on its own: Phase 1 gives session analytics and debugging; Phase 2 adds workflow labeling; Phase 3 adds NPC job replay.

**Detailed task checklist:** `.cursor/plans/session_recorder_and_npc_jobs_ecb35fbf.plan.md` (Cursor plan with todos).

---

## Phase 1: Session Recording (MVP)

**Goal:** Capture every player session as a structured log and persist it.

1. **Types** — `src/sessions/types.ts`: `SessionRecording`, `SessionAction`, `SessionSummary`.
2. **SessionRecorder** — Class: `start(playerId, playerName, mapId)`, `recordAction(playerId, action)`, `end(playerId)`; tile-sampling for move (only record when tile changes). Active sessions in a `Map<playerId, SessionRecording>`.
3. **Storage** — JSON file per completed session in `data/sessions/` (e.g. `session-{id}.json`).
4. **Hooks** — In `main/player.ts`: `onConnected` → start; `onInput` → record input; `onMove` → record move (tile-sampled); `onJoinMap` → record map_change; `onDisconnected` → end, generate summary, save.
5. **Summary** — On disconnect, compute duration, mapsVisited, npcsInteracted, totalMoves, totalActions; optional short narrative (e.g. template-based at first).

**New dir:** `src/sessions/` (types, SessionRecorder, storage, index).

---

## Phase 2: Workflow Labeling

**Goal:** Let users turn a session recording into a named, reusable workflow.

1. **Workflow types** — `Workflow` interface: id, name, description, sourceRecordingId, actions, tags, requiredSkills, startMap, startPosition, estimatedDuration.
2. **WorkflowManager** — Load/save/list workflows; create workflow from recording (copy actions, allow optional trim).
3. **Storage** — JSON in `data/workflows/` (or same structure for later Supabase).
4. **Builder dashboard** — New "Sessions" tab: list recent sessions (from `data/sessions/` or in-memory index), select one, name + tags, "Save as workflow."

---

## Phase 3: NPC Job System

**Goal:** NPCs execute assigned workflows on a schedule by replaying the action sequence.

1. **WorkflowPlayer** — Replay `Workflow.actions` with relative timing (`setTimeout` between steps). Translate each action into a skill call (e.g. input → `move` skill with direction). Use existing `ISkillRegistry` and `GameContext`; run inside the NPC's lane so it's serial with conversation/idle.
2. **JobScheduler** — Timer (e.g. every minute) checks which NPCs have jobs due; for each, enqueue a task that runs `WorkflowPlayer.replay(...)` on that NPC's lane.
3. **Config** — Extend agent YAML with `jobs: [{ workflow: string, schedule: { type: 'daily'|'interval'|'once', ... } }]`. Load in AgentManager and pass to JobScheduler.
4. **Bridge integration** — When a job is running, suppress or lower priority of idle ticks for that NPC; optional "I'm working" response if a player talks to them mid-job.

**Files:** `src/sessions/JobScheduler.ts`, `src/sessions/WorkflowPlayer.ts`, `src/sessions/job-types.ts`. Extend `GameChannelAdapter` (or adapter options) for job state.

---

## Key Constraints (from project rules)

- No `onStep` for replay — use `setTimeout`/`setInterval` for pacing.
- All agent/session code must catch errors; never crash the game server.
- Log with clear prefixes (e.g. `[SessionRecorder]`, `[WorkflowPlayer]`).
- Agent config stays declarative (YAML); jobs are data, not code.
