# Tasks — Sprint Index

Tasks are organized by sprint. Each sprint folder contains the task briefs for that phase of development.

## Current sprint (Cursor: start here)

**[sprint-2026-02-studio-game-alignment](sprint-2026-02-studio-game-alignment/)** — Studio + Game alignment. **One place for all tasks in order:** [sprint-2026-02-studio-game-alignment/README.md](sprint-2026-02-studio-game-alignment/README.md). G-0 (Supabase config loading), G-1 (skill plugins), D-6, tmx-enrich, G-5, G-6 (TMX sync), then foundation gate, then G-2 (Photographer). Briefs live in `.ai/orchestrator/briefs/cursor/2026-02/`; this README lists them in execution order.

## Sprints

| Sprint | Phase | Focus | Tasks | Status |
|--------|-------|-------|-------|--------|
| [sprint-2026-02-studio-game-alignment](sprint-2026-02-studio-game-alignment/) | 2026-02 | Studio + Game alignment, foundation gate, TMX sync, Photographer | G-0, G-1, D-6, tmx-enrich, G-5, G-6, G-2–G-4 | **IN PROGRESS** |
| [sprint-0-environment](sprint-0-environment/) | Phase 0 | Project scaffold, dev server, interfaces, test NPC, LLM feasibility | TASK-001–005 | DONE |
| [sprint-1-core-agent](sprint-1-core-agent/) | Phase 3–4 | PerceptionEngine, Skill System, AgentRunner, GameChannelAdapter | TASK-006–009 | DONE |
| [sprint-2-llm-gateway](sprint-2-llm-gateway/) | Phase 3.5 | Multi-provider LLM gateway, Copilot adapter | TASK-010–011 | BACKLOG |
| [sprint-3-persistence](sprint-3-persistence/) | Phase 5 | Supabase memory, player state, AgentManager + YAML | TASK-012–014 | DONE |
| [sprint-4-polish-deploy](sprint-4-polish-deploy/) | Phase 5 | Speech bubbles, conversation log GUI, Railway deploy | TASK-015–017 | DONE |
| [sprint-5-api-identity-social](sprint-5-api-identity-social/) | Phase 6 | Skill plugins (G-1/018a), Photographer (G-2/018), content store, associative recall | TASK-018a–021 | Merged into sprint-2026-02 |
| [sprint-6-evaluation-arena](sprint-6-evaluation-arena/) | Phase 7 | Evaluation schema, examiner NPC, profiles, task assignment, dashboard | TASK-022–026 | BACKLOG |

## How sprints work

- **DONE**: All tasks complete and reviewed
- **IN PROGRESS**: Active sprint with at least one task in progress
- **PENDING**: Queued next after current sprint completes
- **BACKLOG**: Future work, not yet scheduled

### When closing a sprint

- Update `.ai/status.md` and task briefs to DONE.
- If commands, env vars, deployment, quickstart, or repo structure changed this sprint, update `README.md` to match.

### Backlog vs current sprint (2026-02)

- **The backlog was kept as-is.** Sprint-0 through sprint-6 are unchanged; only the index and the new sprint-2026-02 were added. Sprint-5 (TASK-018a–021) is marked "Merged into sprint-2026-02" because those tasks are now executed as G-1, G-2, etc. in the current sprint.
- **While 2026-02 is in progress:** Update status in **sprint-2026-02-studio-game-alignment/README.md** and in **.ai/orchestrator/status.md** (and game-sprint/master as needed). You don't have to touch sprint-5's TASK-018a.md, TASK-018.md, etc. during the sprint.
- **After 2026-02 is finished:** Do a one-time sync of the backlog so it reflects reality: mark sprint-5's TASK-018a, TASK-018 (and 019, 020 when done) DONE in their READMEs and briefs, and set sprint-5 status to DONE in the table above. That way the backlog stays accurate for future reference.

See `.ai/status.md` for the current sprint and active task details.
