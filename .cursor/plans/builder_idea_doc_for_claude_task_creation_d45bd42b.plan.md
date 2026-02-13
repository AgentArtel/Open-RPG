---
name: Builder idea doc for Claude task creation
overview: Add the full phased builder dashboard approach (Basic MVP, Intermediate, Advanced) to the idea folder so Claude Code can review it and create discrete implementation tasks for Cursor. Includes chat context, current implementation status (what is already built and tested vs not), and a full list of linked files for Claude to review. No task file is created by us.
todos: []
isProject: false
---

# Builder Dashboard: Idea Doc for Claude Review and Task Creation

## 1. Change in approach

- **Do not** create a single TASK-015 that contains the entire phased plan.
- **Do** add the full phased builder approach to the **idea folder** (`.ai/idea/`) so that **Claude Code** can review it and then **create the tasks** (e.g. one task per phase or per feature) for Cursor to implement.
- Workflow: **Idea doc** → Claude reviews → Claude creates tasks in `.ai/tasks/` → Cursor implements each task.

---

## 2. Context: What was discussed in this chat

- **In-game builder goal:** GUI to add things to the map while playing and label by type (events, AI NPCs, objects, APIs); visibility toggle so placements can be "only me" (creator/admin) or "everyone."
- **RPGJS player state:** `player.save()` returns JSON; `player.load(json)` restores it on join. Builder state/placements can use the same pattern (variables, or separate store keyed by map/player).
- **Kimi JSON mode (optional):** Moonshot API supports structured JSON output; could be used later for NPC/builder command responses; not required for MVP.
- **Visibility:** Everyone = `map.createDynamicEvent` (EventMode.Shared); Only me = `player.createDynamicEvent` (EventMode.Scenario). Dashboard sends `visibility: 'everyone' | 'only-me'`.
- **Supportive features:** save/load, setVariable/getVariable, map.events + removeEvent, gui.open/on, input binding, map.createShape (optional), AgentManager spawnAgentAt. Documented in the builder plan section 9 and in the toolkit "In-game builder feature" section.
- **Guides reviewed:** create-event.md, create-shape.md, synchronization.md, save.md, inputs.md, env.md, commands (common, gui), classes (event, map, player) — all relevant to the builder; the plan and toolkit cite them.
- **Doc updates made in this chat:** The implementation plan (in-game_builder_dashboard_branch_b24d547b.plan.md) was updated with visibility toggle, persistence/out-of-scope refs, RPGJS features table (section 9), and guide references. The RPGJS toolkit rule (10-rpgjs-toolkit.mdc) was updated with the "In-game builder feature" section (visibility, state, persistence, guides table, link to plan). No task file was created; idea doc is the source for Claude to create tasks.

---

## 3. Current implementation status (what exists and what is not done)

**Already implemented and testable:**

- **[rpg.toml](rpg.toml):** `[inputs.builder-dashboard]` with `name = "builder-dashboard"` and `bind = "b"`.
- **[main/gui/builder-dashboard.vue](main/gui/builder-dashboard.vue):** Vue dashboard; category tabs (AI NPC / Scripted NPC); sub-lists from server props; "Click Map to Place" and place mode; pointerdown to world/tile conversion to `rpgGuiInteraction('builder-dashboard', 'place', { mapId, x, y, type, id })`; Close button. **Does not send `visibility`** in the place payload.
- **[main/player.ts](main/player.ts):** In `onInput`, when `input === 'builder-dashboard'`, opens `player.gui('builder-dashboard').open({ mapId, aiNpcConfigs, scriptedEvents })` and registers `gui.on('place', ...)`. Place handler: for `ai-npc` calls `agentManager.spawnAgentAt(data.id, map, data.x, data.y)` (4 args only); for `scripted` uses `SCRIPTED_EVENT_REGISTRY` and **only** `map.createDynamicEvent` (no "only me" path). No visibility handling.
- **[src/agents/core/AgentManager.ts](src/agents/core/AgentManager.ts):** `spawnAgentAt(configId, map, x, y)` exists; always uses `map.createDynamicEvent` (Shared only). **No** `visibility` or `player` parameter; no Scenario (only-me) spawn.

**Not yet implemented:**

- Visibility toggle in the builder UI and in the place payload (`visibility: 'everyone' | 'only-me'`).
- Server: use `player.createDynamicEvent` when visibility is "only me" (scripted and, when added, AI NPC); extend `spawnAgentAt` with optional `visibility` and `player` for Scenario spawn.
- Phase 2: On-screen Builder button, persistence (e.g. Supabase `builder_placements`), list/remove placed events.
- Phase 3: Static objects, API objects, sprite/graphic selection.

So **Phase 1 Basic MVP is partially done** (place AI NPC and scripted NPC on map via click works); **visibility toggle and Scenario-mode placement are the remaining Phase 1 scope** before calling Phase 1 complete.

---

## 4. Files for Claude Code to review

Claude should review these before creating tasks. Each is linked and has a one-line purpose.

| Purpose | Path |
|--------|------|
| Builder implementation plan (server/client steps, visibility, refs) | [.cursor/plans/in-game_builder_dashboard_branch_b24d547b.plan.md](.cursor/plans/in-game_builder_dashboard_branch_b24d547b.plan.md) |
| Phase 2+ plan (button, persistence, static/API, sprite) | [.cursor/plans/builder-dashboard-phase2.plan.md](.cursor/plans/builder-dashboard-phase2.plan.md) |
| RPGJS builder approach (visibility, state, guides) | [.cursor/rules/10-rpgjs-toolkit.mdc](.cursor/rules/10-rpgjs-toolkit.mdc) — "In-game builder feature" section |
| Idea doc to be updated (current goals, integration notes) | [.ai/idea/plugins/builder-dashboard.md](.ai/idea/plugins/builder-dashboard.md) |
| **Existing code** — builder input and GUI open | [main/player.ts](main/player.ts) (builder block ~lines 101–165) |
| **Existing code** — dashboard Vue component | [main/gui/builder-dashboard.vue](main/gui/builder-dashboard.vue) |
| **Existing code** — spawn one AI NPC at (x,y) | [src/agents/core/AgentManager.ts](src/agents/core/AgentManager.ts) (`spawnAgentAt` ~lines 244–264) |
| Input config (B key) | [rpg.toml](rpg.toml) |
| RPGJS Shared vs Scenario, variables | [docs/rpgjs-reference/docs/guide/create-event.md](docs/rpgjs-reference/docs/guide/create-event.md) |
| RPGJS save/load, props | [docs/rpgjs-reference/docs/guide/synchronization.md](docs/rpgjs-reference/docs/guide/synchronization.md), [docs/rpgjs-reference/docs/guide/save.md](docs/rpgjs-reference/docs/guide/save.md) |
| RPGJS GUI (server open, client interaction) | [docs/rpgjs-reference/docs/commands/gui.md](docs/rpgjs-reference/docs/commands/gui.md) (and GuiManager API it includes) |
| RPGJS inputs | [docs/rpgjs-reference/docs/guide/inputs.md](docs/rpgjs-reference/docs/guide/inputs.md) |
| Optional: dynamic shapes | [docs/rpgjs-reference/docs/guide/create-shape.md](docs/rpgjs-reference/docs/guide/create-shape.md) |

---

## 5. What to add in the idea folder

**Path:** [.ai/idea/plugins/builder-dashboard.md](.ai/idea/plugins/builder-dashboard.md)

Expand the existing builder-dashboard idea doc with the following content (append or integrate so the file remains one coherent idea). Keep the existing Summary, Goals, RPGJS integration, Project relevance, Sources, and Implementation notes; add the new sections below.

### New subsection: Current implementation status (for Claude when creating tasks)

- **Already in repo:** rpg.toml has `builder-dashboard` input (bind B). main/gui/builder-dashboard.vue exists (tabs, place mode, click map, place payload without visibility). main/player.ts opens builder on B and handles `place` for ai-npc (spawnAgentAt) and scripted (SCRIPTED_EVENT_REGISTRY + map.createDynamicEvent only). AgentManager.spawnAgentAt(configId, map, x, y) exists — Shared only, no visibility/player.
- **Phase 1 remaining:** Add visibility toggle (UI + payload); server branch on visibility to use player.createDynamicEvent for "only me" and map.createDynamicEvent for "everyone"; extend spawnAgentAt with optional visibility and player for AI NPC Scenario spawn. Then Phase 1 is complete.
- **Phase 2 and 3:** Not started; see phased implementation below and builder-dashboard-phase2.plan.md.

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
- **Verification gate:** `rpgjs build`, `npx tsc --noEmit`; in-game: B opens dashboard, place AI NPC and scripted NPC with "everyone" and "only me", confirm visibility. **Stop here** — merge/pause after Phase 1. (Placement without visibility is already implemented; remaining Phase 1 work is visibility toggle + Scenario support.)

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
- **Files for Claude to review:** Include in the idea doc the full list from this plan's section 4 (or a link to this plan) so Claude has one place to see all linked files: both builder plans, toolkit, idea doc, existing code (player.ts, builder-dashboard.vue, AgentManager), rpg.toml, and RPGJS guides (create-event, synchronization, save, gui, inputs, create-shape).
- **Task creation:** Orchestrator (Claude Code) should create tasks in `.ai/tasks/` from this phased breakdown; Cursor implements each task per acceptance criteria.

---

## 6. What not to do

- **Do not** create or edit any file in `.ai/tasks/` (TASK-015 or similar). Claude Code will create tasks after reviewing the idea doc.
- **Do not** modify AGENTS.md, CLAUDE.md, or other orchestrator-owned coordination files.

---

## 7. Summary


| Action | Path                                                                                                                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modify | `.ai/idea/plugins/builder-dashboard.md` — add subsections: "Current implementation status (for Claude when creating tasks)", "RPGJS features used (builder)", "Phased implementation (for task decomposition)", "Implementation references (for assigned agent)". Include the full "Files for Claude Code to review" table (section 4) in the idea doc or link to this plan so Claude has one place to see all linked files. |


Single deliverable: one updated idea doc that gives Claude enough context to review and create the builder dashboard tasks for Cursor to implement phase by phase.