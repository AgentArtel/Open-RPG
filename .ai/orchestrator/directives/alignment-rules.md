# Alignment Rules

These rules ensure Open-RPG (game) and Agent Artel Studio stay in sync. Both developer agents (Cursor, Lovable) must respect these when implementing.

---

## 1. Schema Ownership

- **Game tables live in the `game` schema.** All tables that the game server reads or writes belong in `game.*`. Examples: `agent_configs`, `api_integrations`, `agent_memory`, `player_state`.
- **Studio tables live in `public` schema.** All Studio-only data uses `studio_*` prefixed tables in `public`. Examples: `studio_workflows`, `studio_executions`, `studio_activity_log`, `studio_agent_memory`.
- **Neither repo creates tables in the other's schema without orchestrator review.**

## 2. Studio Query Pattern

Studio MUST use `.schema('game')` for every query to game tables:

```typescript
// Helper (src/lib/gameSchema.ts)
export const gameDb = () => supabase.schema('game');

// CORRECT
gameDb().from('agent_configs').select('*');

// WRONG -- hits public schema, tables don't exist there
supabase.from('agent_configs').select('*');
```

Studio tables use the default (no schema prefix):
```typescript
supabase.from('studio_workflows').select('*');
```

## 3. Game Server Query Pattern

The game server sets `db: { schema: 'game' }` in its Supabase client config, so all `.from()` calls target `game.*` by default. It uses the `service_role` key.

## 4. Migration Flow

1. Schema changes are proposed in a task brief.
2. Orchestrator reviews.
3. Migration is written and applied in `Open-RPG/supabase/migrations/` with the next sequential number.
4. After the migration is live, Studio adapts its queries.
5. Studio does NOT write its own migrations for game schema tables.

## 5. Data Flow Direction

| Data | Written by | Read by |
|------|-----------|---------|
| NPC configs (`agent_configs`) | Studio | Game server |
| API integrations (`api_integrations`) | Studio | Game server |
| NPC memory (`agent_memory`) | Game server | Studio (read only) |
| Player state (`player_state`) | Game server | Studio (read only) |
| Studio workflows/executions | Studio | Studio |

## 6. API Keys and Secrets

- API keys for external services (Gemini, Suno, etc.) are managed in Studio's Credentials page.
- Keys are set as Supabase secrets for Edge Functions.
- The game server never stores or handles raw API keys -- all external API calls go through Supabase Edge Functions.
- Never expose API keys in frontend code, game client code, or database columns.

## 7. No Direct Communication

Studio and the game server do not call each other's APIs. The database is the only integration point. This keeps both apps independently deployable and testable.

## 8. Seed Data

The game repo's migration 009 contains seed data (4 NPCs, 1 integration). This data should be present in the shared Supabase instance and usable for testing Studio features. Do not delete seed data without orchestrator awareness.

## 9. Grant Alignment (Action Required)

The game repo's migration 011 is the **canonical** grant definition for cross-schema access:
- `authenticated` gets full CRUD on `agent_configs` and `api_integrations`
- `anon` gets SELECT only on config tables
- Both get SELECT only on runtime tables (`agent_memory`, `player_state`)

The Studio repo added its own migration (`20260215003933_...sql`) that grants **full CRUD (including DELETE) to `anon` on ALL game tables**. This is more permissive than intended. Specifically:
- `anon` should NOT have DELETE on game tables
- `anon` should NOT have INSERT/UPDATE on `agent_memory` or `player_state`
- `authenticated` should NOT have INSERT/UPDATE/DELETE on `agent_memory` or `player_state` (game server writes these, Studio only reads)

**TODO (D-4 audit):** Reconcile Studio's grants with the game repo's 011. Either remove the Studio migration or narrow it to match 011's intent. The game repo's migration is the source of truth for game schema permissions.

## 10. Foundation Gate

**No Wave 2+ work (G-2, S-4, S-5, G-3, G-4) may begin until the Foundation Verification in [foundation.md](../foundation.md) is complete and the PM signs off.**

The foundation is: the end-to-end pipeline where Studio writes NPC configs and API integrations to the database, and the game server reads them back at runtime. This is the core assumption of the entire sprint.

What "verified" means:
1. Studio can CRUD `agent_configs` and `api_integrations` rows via the UI (Steps 1 & 2)
2. The game server loads NPC configs from `game.agent_configs` in Supabase — not only from YAML files (Step 3)
3. The game server writes memory and player state to Supabase, and Studio can read it (Step 4)

**Known blocker (as of 2026-02-14):** Step 3 fails. `AgentManager.loadConfigs()` reads from YAML files on disk, not from Supabase. A new task (G-0) is required to add Supabase-based config loading to the game. See [foundation.md](../foundation.md) for full details.

Until the foundation gate passes:
- **G-1 (Skill Plugins) may proceed** — it's an internal architecture task that doesn't depend on the DB pipeline
- **S-1/S-2/S-3 verify & polish may proceed** — they exercise the Studio side of the pipeline
- **D-4 (grant audit) may proceed** — it's housekeeping
- **Everything else is HELD**
