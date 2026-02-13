# Idea Folder — Index

This folder holds project vision, research, feature ideas, implementation plans, and plugin explorations. Documents are grouped by **kind** so you can find where each idea fits.

---

## Kinds (where ideas fit)

| Kind | Purpose | When to use |
|------|---------|-------------|
| **Vision** | What we're building and why; roles and source of truth | Strategy, onboarding, alignment |
| **Research** | What to learn, phases, and synthesis | Before implementation; answering open questions |
| **Feature ideas** | Concrete product or architecture ideas (the “what”) | Exploring a new capability before committing |
| **Implementation plans** | Step-by-step how to build a feature | When ready to implement; task breakdown |
| **Plugins** | RPGJS plugin ideas we may build later | Exploring game-side features and add-ons |
| **Artifacts** | Generated or imported content (e.g. Compass) | Reference; may be superseded by idea docs |

---

## By kind

### Vision

| Document | Description |
|----------|-------------|
| [01-idea-doc.md](01-idea-doc.md) | OpenClaw × RPGJS vision: game world as agent environment, command-as-knowledge, scaling. |
| [project-instructions.md](project-instructions.md) | Role, technical context, and pointer to project documents as source of truth. |

### Research

| Document | Description |
|----------|-------------|
| [02-research-outline.md](02-research-outline.md) | Research outline: what to study (RPGJS, OpenClaw, LLM, etc.) and when you're done. |
| [03-project-outline.md](03-project-outline.md) | Project outline: phases from setup to running AI NPCs (Phase 0–2+). |
| [phase3-integration-patterns.md](phase3-integration-patterns.md) | Phase 3 research synthesis: TypeScript interop, agent model, perception, memory, pricing. |

### Feature ideas

| Document | Description |
|----------|-------------|
| [05-multi-provider-llm-gateway.md](05-multi-provider-llm-gateway.md) | Provider-agnostic LLM gateway: route by tier (e.g. Copilot idle, Kimi conversation). |
| [06-supabase-persistence.md](06-supabase-persistence.md) | Supabase as persistence: agent memory, player state, semantic search (pgvector). |
| [07-session-recorder-workflow-npc-jobs.md](07-session-recorder-workflow-npc-jobs.md) | Record player sessions as logs, label them as workflows, assign workflows to NPCs as repeatable daily jobs. |
| [08-api-as-identity-npcs.md](08-api-as-identity-npcs.md) | API-as-Identity: NPC personas built around API access (Photographer=DALL-E, Musician=Suno), token-gated economy, four-stage NPC progression. |
| [09-npc-social-memory-fragments.md](09-npc-social-memory-fragments.md) | NPC social feed (Instagram clone), associative memory via semantic tag recall, Fragment quest system (past/future), environment-driven personality. |
| [10-agent-evaluation-arena.md](10-agent-evaluation-arena.md) | In-game agent benchmarking, performance-driven task assignment, improvement tracking, paid evaluation service for external agents. |

### Implementation plans

| Document | Description |
|----------|-------------|
| [05a-multi-provider-implementation-plan.md](05a-multi-provider-implementation-plan.md) | How to implement the multi-provider LLM gateway (builds on LLMClient). |
| [06a-supabase-implementation-plan.md](06a-supabase-implementation-plan.md) | How to add Supabase persistence (agent memory + player state). |
| [07a-session-recorder-implementation-plan.md](07a-session-recorder-implementation-plan.md) | How to build session recorder, workflow labeling, and NPC job replay (phased). |
| [08a-api-powered-skills-implementation-plan.md](08a-api-powered-skills-implementation-plan.md) | How to add DALL-E image generation skill + Photographer NPC (Stage 2 proof). |
| [09a-social-memory-fragments-implementation-plan.md](09a-social-memory-fragments-implementation-plan.md) | ContentStore + semantic tagging + associative recall + Lovable feed UI + fragment system. |

### Plugins

RPGJS plugin ideas we may implement later. Each has goals, RPGJS hooks, project relevance, and sources.

**Index:** [plugins/README.md](plugins/README.md)

| Kind | Plugins |
|------|---------|
| **AI / NPC** | [agent-conversation-log](plugins/agent-conversation-log.md), [dialogue-choices-plus](plugins/dialogue-choices-plus.md), [quest-log](plugins/quest-log.md) |
| **Builder / Dev** | [builder-dashboard](plugins/builder-dashboard.md), [hot-reload-events](plugins/hot-reload-events.md) |
| **Gameplay** | [crafting](plugins/crafting.md), [skill-bar](plugins/skill-bar.md), [day-night-cycle](plugins/day-night-cycle.md), [cutscene](plugins/cutscene.md) |
| **UX** | [tooltips](plugins/tooltips.md) |

### Artifacts

Generated or imported reference material. May be superseded by the idea docs above.

| Document | Description |
|----------|-------------|
| [compass_artifact_wf-2ebee460-13f6-48ab-8318-d648c1e35b5d_text_markdown.md](compass_artifact_wf-2ebee460-13f6-48ab-8318-d648c1e35b5d_text_markdown.md) | Multi-provider AI integration (Vercel AI SDK, Gemini, Moonshot). |
| [compass_artifact_wf-80e0540b-b6c8-477a-ac61-310637748205_text_markdown.md](compass_artifact_wf-80e0540b-b6c8-477a-ac61-310637748205_text_markdown.md) | (Compass artifact.) |
| [compass_artifact_wf-8865edf3-cc25-47cf-b554-4415a530bdc4_text_markdown.md](compass_artifact_wf-8865edf3-cc25-47cf-b554-4415a530bdc4_text_markdown.md) | (Compass artifact.) |

---

## Quick navigation

- **New to the project?** Start with [01-idea-doc.md](01-idea-doc.md) and [project-instructions.md](project-instructions.md).
- **Planning work?** Use [02-research-outline.md](02-research-outline.md), [03-project-outline.md](03-project-outline.md), and [phase3-integration-patterns.md](phase3-integration-patterns.md).
- **Implementing a feature?** Check for an implementation plan (05a, 06a) or create one.
- **Exploring a game feature?** See [plugins/README.md](plugins/README.md) and the plugin docs by kind above.
