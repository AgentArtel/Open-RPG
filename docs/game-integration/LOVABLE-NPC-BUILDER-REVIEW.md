# Lovable NPC Builder — First Delivery Review & Next Steps

**Date:** 2026-02-14  
**Scope:** NPC Builder page only (first task)

---

## What Lovable Delivered

- **`src/pages/NPCs.tsx`** — List view with search, card grid, Create NPC button, useQuery/useMutation for CRUD and toggle.
- **`src/components/npcs/NPCCard.tsx`** — Card showing graphic, name, map, skill count, enabled dot; Edit / Toggle / Delete actions.
- **`src/components/npcs/NPCFormModal.tsx`** — Full form: Identity (name, id, graphic), AI (personality, idle/conversation model), Skills (game + API with auto-inventory), Spawn (map, x, y), Behavior (idleInterval, patrolRadius, greetOnProximity), Inventory (comma-separated), Enabled. Slugify id from name on create; API skill selection auto-manages inventory.
- **`src/components/npcs/index.ts`** — Barrel export.
- **`src/App.tsx`** — Added `npcs` page and route.
- **`src/components/ui-custom/Sidebar.tsx`** — Added NPCs nav item (Users icon).

Structure, form fields, and UX (toasts, confirm on delete, invalidation) match the brief.

---

## Critical Fix Applied: Use `game` Schema

**Issue:** Every Supabase call used the default schema (e.g. `supabase.from('agent_configs')`), which hits `public`. In this project, game tables live in the **`game`** schema. The game server reads from `game.agent_configs`. Using the default schema means Studio would see/edit different (or empty) data than the game.

**Fix (applied in `docs/studio-reference`):** All six call sites in `NPCs.tsx` were updated to use `supabase.schema('game').from('agent_configs')` or `supabase.schema('game').from('api_integrations')`. Query keys were also namespaced to `['game', 'agent_configs']` and `['game', 'api_integrations']` to avoid cache collision with any future public-schema usage.

**Lovable must apply the same fix in the live Studio repo:**

1. In `src/pages/NPCs.tsx`, replace every:
   - `supabase.from('agent_configs')` → `supabase.schema('game').from('agent_configs')`
   - `supabase.from('api_integrations')` → `supabase.schema('game').from('api_integrations')`
2. Use query keys `['game', 'agent_configs']` and `['game', 'api_integrations']` (and invalidate those keys in mutations).

Reference: `docs/studio-reference/src/pages/NPCs.tsx` in the open-rpg repo (after the merge that includes this fix) shows the correct pattern.

---

## Checklist vs Corrected Plan

| Requirement | Status |
|-------------|--------|
| Every query uses `.schema('game')` | ❌ Delivered without; ✅ fixed in ref |
| NPCs page + list from game.agent_configs | ✅ |
| Search/filter by name | ✅ |
| NPCCard with Edit / Toggle / Delete | ✅ |
| NPCFormModal with all sections & fields | ✅ |
| Game skills + API skills from api_integrations | ✅ |
| API skill selection auto-adds required_item_id to inventory | ✅ |
| Create / Edit / Delete / Toggle with toasts & invalidation | ✅ |
| Confirm before delete | ✅ |
| App.tsx + Sidebar (NPCs between Workflows and Executions) | ✅ |

---

## Next Steps

### 1. Lovable: Apply schema fix in Studio repo

Prompt for Lovable:

> In `src/pages/NPCs.tsx`, all Supabase calls for NPCs and integrations must use the **game** schema so Studio edits the same data the game uses. Change every `supabase.from('agent_configs')` to `supabase.schema('game').from('agent_configs')` and every `supabase.from('api_integrations')` to `supabase.schema('game').from('api_integrations')`. Also use query keys `['game', 'agent_configs']` and `['game', 'api_integrations']` and invalidate those keys in mutations. See the task doc and VISION for why: game tables live in the `game` schema, not `public`.

### 2. Verify end-to-end

After the schema fix is in the Studio repo:

- Ensure migration 011 has been run on the Supabase project (exposes `game` schema and grants anon/authenticated).
- Open Studio → NPCs. You should see the same NPCs the game server loads (e.g. Elder Theron, Test Agent, Photographer, Artist) if the game and Studio share the same Supabase project.
- Create/edit/disable an NPC in Studio; reload the game map and confirm the NPC list/state matches.

### 3. Next task: Integrations page

Once the NPC Builder is correct and verified, proceed to the **Integrations** page (CRUD for `game.api_integrations`), again using `supabase.schema('game').from('api_integrations')` for all queries. Spec: `TASK-game-schema-integration.md` § 2.

### 4. Optional: Dashboard game stats

Add dashboard stat cards that read from `game` schema (e.g. active NPC count, integration count, player count). Same pattern: `.schema('game').from(...)`.

---

## Summary

- **Shipped:** NPC Builder structure and UX are correct; form, skills, and inventory logic match the brief.
- **Must fix:** Use `game` schema for all `agent_configs` and `api_integrations` access so Studio and the game share one source of truth.
- **Next:** Schema fix in Studio → verify → then Integrations page.
