# Object API → Agent Artel Studio Integration (Reminder)

**Status:** Not yet implemented. Do not forget when setting up object API integrations to services.

---

## Context

- **Object API events** (e.g. `ApiObjectEvent`) are planned in Builder Dashboard Phase 2: map objects that trigger an API call or webhook when the player interacts (`onAction`). Currently only `ai-npc` and `scripted` are implemented in the builder; `api` type and `ApiObjectEvent` are not built yet.
- When we implement object API integrations to external services, we must wire those objects so that **onAction → call API / send request** and (where applicable) show or persist the result.

---

## Agent Artel Studio

- **Object APIs will connect to Agent Artel Studio** once that product is built out and schemas are defined.
- When implementing object API integrations later:
  1. Implement `ApiObjectEvent` (or equivalent) and the builder `api` type + registry.
  2. Design the integration so object API events can talk to **Agent Artel Studio** using the agreed schemas (to be defined when Artel Studio is ready).
  3. Keep this reminder in mind so the object API layer is compatible with Agent Artel Studio from the start, or is clearly documented for a follow-up integration.

---

## References

- Builder Phase 2 plan: `.cursor/plans/builder-dashboard-phase2.plan.md` — Section 3 (Static objects and object API events)
- Idea: API-as-Identity NPCs (NPCs using APIs via skills) is separate; this note is about **map objects** that trigger API calls and their future link to Agent Artel Studio.
