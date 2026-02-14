# Sprint 2 — Multi-Provider LLM Gateway

**Phase**: 3.5
**Status**: BACKLOG
**Agent**: cursor

Provider-agnostic LLM gateway to route requests by tier (idle vs conversation) across multiple providers (Moonshot, Copilot, future).

| Task | Title | Status |
|------|-------|--------|
| TASK-010 | Multi-Provider LLM Gateway | PENDING |
| TASK-011 | GitHub Copilot CLI Provider Adapter | PENDING |

**Idea doc**: `.ai/idea/05-multi-provider-llm-gateway.md`
**Implementation plan**: `.ai/idea/05a-multi-provider-implementation-plan.md`

**Decision (2026-02-14):** Deferred to **Agent Artel Studio**. Moonshot-only `LLMClient` is sufficient for now. When the Studio is ready, the gateway refactor (provider registry, tier-based routing, fallback chains) will be managed through the Studio UI instead of local YAML config. TASK-010/011 briefs remain as architecture reference.
