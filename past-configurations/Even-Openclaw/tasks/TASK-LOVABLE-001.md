# TASK-LOVABLE-001: Review updates and run Supabase migrations

- **Status**: DONE
- **Assigned**: Lovable
- **Priority**: P0
- **Type**: Review + Operations
- **Depends on**: Commits `293b523` and `86bb753` on `main`
- **Blocks**: None

---

## Context

Cursor implemented the **Phased Agent Foundation Plan** (steps 1–8) and pushed two commits to `main`:

1. **`293b523`** — Phased Agent Foundation (migrations, eveng1 Supabase routing, agent_skills, workforces, routing rules, Chat “Chat with” selector).
2. **`86bb753`** — Audit follow-ups (real routing rules on Agent Management, port comment, drop `agents.skills` migration, use-agents now derives skills from `agent_skills`).

Lovable needs to **review the frontend changes** in `frontend-lovable/clawlens-companion` and **run all new Supabase migrations** so the dashboard and Supabase stay in sync.

---

## Objective

1. **Run all required Supabase migrations** (in order) in the ClawLens Companion project.
2. **Review the updated UI** and confirm no regressions: Agent Management, Workforces page, Chat “Chat with” selector, routing rules section.
3. **Regenerate Supabase types** (optional but recommended) so `integrations/supabase/types.ts` includes any new tables/columns from migrations; then remove unnecessary `(supabase as any)` casts if types are correct.

---

## Migrations to run (in order)

Run these in the **Supabase dashboard** (SQL Editor) or via `supabase db push` / your usual migration flow for `frontend-lovable/clawlens-companion`:

| Order | Migration file | Purpose |
|-------|----------------|---------|
| 1 | `20260209000000_add_agents_channel_openclaw.sql` | Add `channel_id`, `openclaw_agent_id` to `agents` |
| 2 | `20260209100000_agent_skills.sql` | Create `agent_skills` table; migrate data from `agents.skills` |
| 3 | `20260209200000_workforces_routing.sql` | Create `workforces`, `workforce_members`, `routing_rules` |
| 4 | `20260209300000_user_settings_chat_target.sql` | Add `current_chat_agent_id`, `current_chat_workforce_id` to `user_settings` |
| 5 | `20260209400000_drop_agents_skills_column.sql` | Drop deprecated `agents.skills` column |

**Location:** `frontend-lovable/clawlens-companion/supabase/migrations/`

**Important:** Run in the order above. Do **not** run migration 5 before migrations 1–2: migration 2 copies data from `agents.skills` into `agent_skills`; if `agents.skills` is already dropped, that step fails. Migration 5 is safe only after 1–4 are applied.

---

## Frontend areas to review

- **Agent Management** (`/agents`): Channel dropdown (None / eveng1), OpenClaw Agent ID field, Skills section (add/remove via `agent_skills`), Routing rules card (real data from API + “Manage →” link to Workforces).
- **Workforces** (`/workforces`): New page; list workforces, create/edit, members, default agent; routing rules list and add/edit/delete.
- **Chat** (`/chat`): “Chat with” dropdown (Default, agents, workforces); selection persisted to `user_settings`.
- **Sidebar**: “WORKFORCES” nav item and `/workforces` route in App.

---

## Optional: Supabase type generation

After migrations are applied:

- Regenerate TypeScript types from your Supabase project (e.g. `supabase gen types typescript` or your project’s codegen step).
- If `user_settings`, `agent_skills`, `workforces`, `workforce_members`, `routing_rules` are now in the generated types, you can remove the `(supabase as any)` casts in `use-user-settings.ts` and use proper typing where applicable.

---

## Acceptance criteria

- [ ] All five migrations above have been run successfully against the Supabase project used by ClawLens Companion.
- [ ] No migration errors; `agents` has no `skills` column after migration 5; `user_settings` has `current_chat_agent_id` and `current_chat_workforce_id`.
- [ ] Quick smoke test: Agent Management loads; Workforces page loads; Chat “Chat with” selector works; routing rules section on Agent Management shows real rules or “No routing rules” and “Manage →” link.
- [ ] (Optional) Types regenerated and casts cleaned up if desired.

---

## Handoff

- **Repo:** `Even-Openclaw` (branch `main`).
- **Frontend app:** `frontend-lovable/clawlens-companion`.
- **Migrations path:** `frontend-lovable/clawlens-companion/supabase/migrations/`.
- **Reference:** Full plan in `docs/FEATURE-PHASED-AGENT-MANAGEMENT.md`; audit summary was provided separately.
