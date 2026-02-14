# Tasks — Sprint Index

Tasks are organized by sprint. Each sprint folder contains the task briefs for that phase of development.

## Sprints

| Sprint | Phase | Focus | Tasks | Status |
|--------|-------|-------|-------|--------|
| [sprint-0-environment](sprint-0-environment/) | Phase 0 | Project scaffold, dev server, interfaces, test NPC, LLM feasibility | TASK-001–005 | DONE |
| [sprint-1-core-agent](sprint-1-core-agent/) | Phase 3–4 | PerceptionEngine, Skill System, AgentRunner, GameChannelAdapter | TASK-006–009 | DONE |
| [sprint-2-llm-gateway](sprint-2-llm-gateway/) | Phase 3.5 | Multi-provider LLM gateway, Copilot adapter | TASK-010–011 | BACKLOG |
| [sprint-3-persistence](sprint-3-persistence/) | Phase 5 | Supabase memory, player state, AgentManager + YAML | TASK-012–014 | DONE |
| [sprint-4-polish-deploy](sprint-4-polish-deploy/) | Phase 5 | Speech bubbles, conversation log GUI, Railway deploy | TASK-015–017 | DONE |
| [sprint-5-api-identity-social](sprint-5-api-identity-social/) | Phase 6 | Skill plugins, Photographer NPC (Gemini), content store, associative recall, Lovable feed | TASK-018a–021 | NEXT |
| [sprint-6-evaluation-arena](sprint-6-evaluation-arena/) | Phase 7 | Evaluation schema, examiner NPC, profiles, task assignment, dashboard | TASK-022–026 | BACKLOG |

## How sprints work

- **DONE**: All tasks complete and reviewed
- **IN PROGRESS**: Active sprint with at least one task in progress
- **PENDING**: Queued next after current sprint completes
- **BACKLOG**: Future work, not yet scheduled

### When closing a sprint

- Update `.ai/status.md` and task briefs to DONE.
- If commands, env vars, deployment, quickstart, or repo structure changed this sprint, update `README.md` to match.

See `.ai/status.md` for the current sprint and active task details.
