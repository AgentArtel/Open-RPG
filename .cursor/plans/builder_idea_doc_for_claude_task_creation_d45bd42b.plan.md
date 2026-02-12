---
name: Builder idea doc for Claude task creation
overview: Add the full phased builder dashboard approach (Basic MVP, Intermediate, Advanced) to the idea folder so Claude Code can review it and create discrete implementation tasks for Cursor; no task file is created by us.
todos: []
isProject: false
---

# Builder Dashboard: Idea Doc for Claude Review and Task Creation

## 1. Change in approach

- **Do not** create a single TASK-015 that contains the entire phased plan.
- **Do** add the full phased builder approach to the **idea folder** (`.ai/idea/`) so that **Claude Code** can review it and then **create the tasks** (e.g. one task per phase or per feature) for Cursor to implement.
- Workflow: **Idea doc** → Claude reviews → Claude creates tasks in `.ai/tasks/` → Cursor implements each task.

---

## 2. What to add in the idea folder

**Path:** [.ai/idea/plugins/builder-dashboard.md](.ai/idea/plugins/builder-dashboard.md)

Expand the existing builder-dashboard idea doc with the following content (append or integrate so the file remains one coherent idea). Keep the existing Summary, Goals, RPGJS integration, Project relevance, Sources, and Implementation notes; add the new sections below.

### New subsection: RPGJS features used (builder)

- **Visibility:** Everyone = `map.createDynamicEvent` (EventMode.Shared); Only me = `player.createDynamicEvent` (EventMode.Scenario). Dashboard sends `visibility: 'everyone' | 'only-me'`.
- **State and persistence:** `player.setVariable` / `player.getVariable` for builder flags; `player.save()` / `player.load(json)` pattern for optional builder state; placements can be stored (e.g. Supabase) and re-applied on map load.
- **GUI:** `player.gui('builder-dashboard').open(data)`, `gui.on('place', handler)`; client `rpgGuiInteraction('builder-dashboard', 'place', payload)`.
- **Map API:** `map.events` (list), `map.removeEvent(eventId)` (delete); optional `map.createShape` for zones.
- **Input:** Key B already bound to `builder-dashboard` in rpg.toml; server handles in `onInput`.
- **Reference:** Same as `.cursor/rules/10-rpgjs-toolkit.mdc` "In-game builder feature" and `.cursor/plans/in-game_builder_dashboard_branch_b24d547b.plan.md` section 9.

### New subsection: Phased implementation (for task decomposition)

Describe three phases with clear scope and stop points so Claude can create one or more tasks per phase.

**Phase 1 — Basic MVP (first stop point)**

- **Scope:** Press B → open Vue dashboard; choose AI NPC or Scripted NPC and which one (e.g. elder-theron, test-agent, Test NPC, Guard); visibility toggle "Only me" vs "Everyone"; click "Place" then click map → entity appears. No persistence (restart clears).
- **Server:** `onInput` opens `player.gui('builder-dashboard').open(...)`; `gui.on('place', handler)`; `map.createDynamicEvent` or `player.createDynamicEvent` by visibility; `AgentManager.spawnAgentAt(id, map, x, y, visibility, player?)` for AI NPCs; SCRIPTED_EVENT_REGISTRY for scripted.
- **Client:** New `main/gui/builder-dashboard.vue` (id `builder-dashboard`); place mode + pointerdown → pixel to tile → send `place` via rpgGuiInteraction.
- **Verification gate:** `rpgjs build`, `npx tsc --noEmit`; in-game: B opens dashboard, place AI NPC and scripted NPC with "everyone" and "only me", confirm visibility. **Stop here** — merge/pause after Phase 1.

**Phase 2 — Intermediate (second stop point)**

- **Scope:** (1) On-screen Builder button (e.g. floating button calling `applyControl('builder-dashboard')`). (2) Persistence: store placements in Supabase `builder_placements`; on map load re-apply from DB. (3) List placed events on current map; delete via `map.removeEvent(eventId)` and remove from DB.
- **References:** `.cursor/plans/builder-dashboard-phase2.plan.md` (sections 1 and 2).
- **Verification gate:** Build passes; button opens builder; place → restart → rejoin → entity persists; list and delete work. **Stop here** — usable builder with persistence.

**Phase 3 — Advanced (third stop point)**

- **Scope:** (1) Static objects (type `static`, `StaticObjectEvent`). (2) API object type (`api`, `ApiObjectEvent` stub/simple). (3) Sprite/graphic selection: server sends `availableGraphics` in gui.open; builder UI graphic selector; place payload includes `graphic`; events use spawn context for `setGraphic`.
- **References:** `.cursor/plans/builder-dashboard-phase2.plan.md` (sections 3 and 4).
- **Verification gate:** Build passes; place static and API objects with chosen graphic. **Stop here** — full builder feature set.

### New subsection: Implementation references (for assigned agent)

- **Detailed implementation plan:** [.cursor/plans/in-game_builder_dashboard_branch_b24d547b.plan.md](.cursor/plans/in-game_builder_dashboard_branch_b24d547b.plan.md) — server/client steps, AgentManager.spawnAgentAt, GUI spec, key binding.
- **RPGJS toolkit:** [.cursor/rules/10-rpgjs-toolkit.mdc](.cursor/rules/10-rpgjs-toolkit.mdc) — "In-game builder feature" (visibility, state, guides).
- **Phase 2+ details:** [.cursor/plans/builder-dashboard-phase2.plan.md](.cursor/plans/builder-dashboard-phase2.plan.md) — button, persistence schema, static/API objects, sprite selection.
- **Task creation:** Orchestrator (Claude Code) should create tasks in `.ai/tasks/` from this phased breakdown; Cursor implements each task per acceptance criteria.

---

## 3. What not to do

- **Do not** create or edit any file in `.ai/tasks/` (TASK-015 or similar). Claude Code will create tasks after reviewing the idea doc.
- **Do not** modify AGENTS.md, CLAUDE.md, or other orchestrator-owned coordination files.

---

## 4. Summary


| Action | Path                                                                                                                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modify | `.ai/idea/plugins/builder-dashboard.md` — add subsections: "RPGJS features used (builder)", "Phased implementation (for task decomposition)", "Implementation references (for assigned agent)" |


Single deliverable: one updated idea doc that gives Claude enough context to review and create the builder dashboard tasks for Cursor to implement phase by phase.