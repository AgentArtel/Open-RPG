# Pattern: Phased Approach

**Source**: Even-Openclaw
**Category**: Structure

## Description

Break a complex project into numbered phases (P1, P2, P3, P4), each with increasing complexity and clear scope boundaries. Each phase should be independently shippable and have its own task table in `status.md`.

## Evidence

Even-Openclaw used 4 phases:
- **P1 Proof of Concept**: 12 tasks — all completed. Established the foundation.
- **P2 Frontend + Agent Foundation**: 8 steps — all completed. Built the UI layer.
- **P3 Real Data**: 3 tasks — mostly completed (1 partial). Replaced mock data with real integrations.
- **P4 OpenClaw Gateway**: 4 tasks — all completed. Connected to the external platform.

This progression (foundation → features → real data → integration) worked well because each phase built on the previous one without requiring rework.

## When to Use

- Projects with more than 10 total tasks
- Multi-target builds (web + mobile + backend)
- Projects integrating with external APIs or platforms
- Any project where the full scope is too large for a single sprint

## How to Apply

1. **Define phases** in `.ai/status.md` with clear scope for each
2. **Phase 1**: Foundation / Proof of Concept — get something working end-to-end
3. **Phase 2**: Core features — build the main functionality
4. **Phase 3**: Real data / Integration — replace mocks with real backends
5. **Phase 4**: Polish / Advanced features — optimize and extend
6. **Create a task table** for each phase with columns: #, ID, Title, Assigned, Priority, Status, Depends
7. **Use phase-scoped task IDs**: TASK-P1-01, TASK-P2-01, etc.
8. **Complete one phase before starting the next** — don't overlap phases

## Variations

- **2-phase**: For simpler projects — Phase 1 (foundation), Phase 2 (features)
- **Feature-scoped phases**: Instead of complexity tiers, each phase is a feature area
- **Rolling phases**: New phases can be added as the project evolves (Even-Openclaw added P4 after P3)

