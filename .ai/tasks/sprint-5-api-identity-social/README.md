# Sprint 5 — API-as-Identity + Social + Memory

**Phase**: 6
**Status**: NEXT
**Agent**: cursor (018b, 018a, 018–020), lovable (021)

Supabase database-first agent config (source of truth), modular skill plugin system
(MCP-inspired architecture), Photographer NPC with Gemini image-generation skill
(proof of API-as-Identity), NPC content store with semantic tagging, associative recall
for environment-driven memory, and the Lovable social feed UI.

**Supabase-first**: Agent config is loaded from Supabase (`agent_configs` table) when
configured; YAML fallback when Supabase is unavailable. This establishes the database as
the source of truth so the Studio and all future agents/skills/items start in DB.

| Task | Title | Agent | Status |
|------|-------|-------|--------|
| TASK-018b | Supabase Agent Config (Database-First) | cursor | REVIEW |
| TASK-018a | Modular Skill Plugin System | cursor | PENDING |
| TASK-018 | Photographer NPC + Gemini Image Generation | cursor | PENDING |
| TASK-019 | NPC Content Store + Semantic Tagging + Social Posts | cursor | PENDING |
| TASK-020 | Associative Recall + Environment-Driven Memory | cursor | PENDING |
| TASK-021 | Lovable Feed UI + Instagram Bridge | lovable | PENDING |

**Recommended order**: 018b → 018a → 018 → 019 → then 020 (cursor) + 021 (lovable) in parallel.

**Idea docs**: `.ai/idea/08-api-as-identity-npcs.md`, `.ai/idea/09-npc-social-memory-fragments.md`, `.ai/idea/14-modular-skill-plugin-architecture.md`
**Implementation plans**: `.ai/idea/08a-api-powered-skills-implementation-plan.md`, `.ai/idea/09a-social-memory-fragments-implementation-plan.md`
**Architecture brief**: `.ai/briefs/modular-skill-plugin-architecture.md`
**Supabase brief**: `.ai/briefs/supabase-game-integration-now.md`

> PM-directed cross-boundary edit (2026-02-14): Added TASK-018a and updated ordering
> per plugin architecture approval.

> PM-directed cross-boundary edit (2026-02-14): Added TASK-018b (Supabase agent config,
> database-first) as first task in sprint. Supabase is the source of truth for agent
> config when configured; YAML fallback preserved.
