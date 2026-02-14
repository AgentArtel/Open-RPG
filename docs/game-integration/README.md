# Game Integration — Studio Instructions

This folder holds **all instructions and prompts for Lovable** (Agent Artel Studio) that relate to wiring Studio to the Open-RPG game's database. Keeping them here keeps Studio work separate from the game repo's own task system (`.ai/tasks/` in the game repo).

## Contents

| File | Purpose |
|------|--------|
| **VISION-studio-game-architecture.md** | Start here — the big picture: what the game is, what Studio's role is, how data flows, what to build and why |
| **TASK-game-schema-integration.md** | Detailed task brief: NPC Builder, Integrations page, dashboard stats, field mappings, acceptance criteria |
| **NPC-BUILDER-PLAN.md** | **Canonical spec** for the NPC Builder: corrected schema, to-do checklist, success metrics. This is the single source of truth. |
| **LOVABLE-PROMPTS.md** | Copy/paste prompts for Lovable (migration SQL + Parts 1–4) |

## Reading Order

1. **VISION** first — understand the architecture and why Studio exists
2. **TASK** second — detailed specs for the first set of features
3. **NPC-BUILDER-PLAN** — the corrected, canonical NPC Builder spec (schema=game everywhere)
4. **PROMPTS** fourth — paste into Lovable when ready to build

## Flow

- The **game repo** (Open-RPG) owns: migrations (including `011_studio_cross_schema_access.sql`), schema docs, and game code.
- The **Studio repo** (this one) owns: these docs and any future Studio-only task/prompt files for Lovable.
- When you work in Lovable, use the prompts in `LOVABLE-PROMPTS.md` and the spec in `TASK-game-schema-integration.md`. Do not mix Studio instructions into the game repo's `.ai/tasks/`.

## Syncing this folder into the live Studio repo

This folder lives under `docs/studio-reference/` in the game repo (a git subtree of the Studio repo). To have the same instructions in the **actual** Agent Artel Studio repo (the one Lovable pushes to), either:

1. **Copy** `docs/game-integration/` into the Studio repo (e.g. via Lovable: "Add a docs/game-integration folder with these files"), or
2. **Push the subtree** from the game repo to the Studio remote so the Studio repo gets these files.
