---
name: Phase 3 Core Agent System Sprint
overview: Implement the core agent system — PerceptionEngine, Skill System, and AgentRunner — required for AI NPCs to perceive, act, and think via LLM.
todos:
  - id: task-006-perception
    content: TASK-006 Build PerceptionEngine (game state → text snapshots, <300 tokens)
    status: completed
  - id: task-007-skills
    content: "TASK-007 Build Skill System (SkillRegistry + 5 MVP skills: move, say, look, emote, wait)"
    status: completed
  - id: skill-live-test
    content: Live skill integration test (skill-test-npc.ts) — verified in game
    status: completed
    dependencies:
      - task-007-skills
  - id: task-008-agent-runner
    content: TASK-008 Build AgentRunner (LaneQueue, LLMClient, core LLM loop)
    status: pending
    dependencies:
      - task-006-perception
      - task-007-skills
isProject: false
---

# Phase 3: Core Agent System Sprint

## Overview

Implement the core agent system so AI NPCs can perceive the game world, execute skills, and run the LLM think-act loop. Implementation order: TASK-006 → TASK-007 → TASK-008.

**Master plan:** See [project_phases_overview.plan.md](./project_phases_overview.plan.md) for all phases (0-6).

## Completed

### TASK-006: PerceptionEngine — DONE

**Files:**

- `src/agents/perception/PerceptionEngine.ts` — implements IPerceptionEngine
- `src/agents/perception/index.ts` — module exports
- `main/events/perception-test-npc.ts` — integration test NPC
- `src/agents/perception/test-manual.ts`, `test-edge-cases.ts` — unit tests

**Verified:** Token budget <300, 8 cardinal directions, entity sorting/capping, `rpgjs build` passes.

### TASK-007: Skill System — DONE

**Files:**

- `src/agents/skills/SkillRegistry.ts` — implements ISkillRegistry
- `src/agents/skills/skills/move.ts`, `say.ts`, `look.ts`, `emote.ts`, `wait.ts`
- `src/agents/skills/index.ts` — module exports
- `src/agents/skills/types.ts` — OpenAIToolDefinition for Kimi K2/K2.5
- `main/events/skill-test-npc.ts` — live integration test

**Verified:** All 5 skills work in game (wait, look, move, emote, say). OpenAI-compatible tool format. Live test runs periodic and onAction.

### Additional Work

- **NPC spawn config:** `main/player.ts` — NPC_SPAWN_CONFIG toggles NPCs (Artist, Photographer, Vendor, Missionary, CatDad disabled to reduce clutter).

## Pending

### TASK-008: AgentRunner — PENDING

**To create:**

- `src/agents/core/AgentRunner.ts` — implements IAgentRunner
- `src/agents/core/LLMClient.ts` — implements ILLMClient (openai SDK + Moonshot)
- `src/agents/core/LaneQueue.ts` — implements ILaneQueue
- `src/agents/core/index.ts` — module exports

**Existing:** `src/agents/core/types.ts`, `llm-test.ts` (Moonshot API pattern).

## Dependencies

- TASK-003 (interfaces) — DONE
- TASK-005 (LLM validated) — DONE
- TASK-006 (PerceptionEngine) — DONE
- TASK-007 (Skill System) — DONE

