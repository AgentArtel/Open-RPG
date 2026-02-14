# NPC Builder Plan (Corrected)

> **Status:** CANONICAL SPEC
> **Last Updated:** 2026-02-14
> **Audience:** Lovable AI + Claude Code (integration oversight)

This is the **single source of truth** for the NPC Builder feature. All queries use `supabase.schema('game')`. Do not use the default schema for game tables.

---

## Architecture

- **Game data lives in the `game` schema**: `game.agent_configs`, `game.api_integrations`, `game.agent_memory`, `game.player_state`.
- **Studio data lives in `public`**: `studio_workflows`, `studio_executions`, `studio_activity_log`, `studio_agent_memory`.
- **Studio must use** `supabase.schema('game').from(...)` for every query to game tables.
- **Game server uses** `db: { schema: 'game' }` in its Supabase client configuration.

---

## New Page: NPCs

**Sidebar placement:** Between "Workflows" and "Executions", using the `Users` icon from lucide-react.

---

## New Components

| Component | File | Purpose |
|-----------|------|---------|
| `NpcBuilder` | `src/pages/NPCs.tsx` | Page: list + search + create button |
| `NPCCard` | `src/components/npcs/NPCCard.tsx` | Card in the grid: name, graphic, map, skills, toggle |
| `NPCFormModal` | `src/components/npcs/NPCFormModal.tsx` | Create/edit modal with all NPC fields |
| barrel | `src/components/npcs/index.ts` | Re-exports |

---

## Edits to Existing Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `'npcs'` and `'integrations'` to `Page` union; add cases in `renderPage()` |
| `src/components/ui-custom/Sidebar.tsx` | Add "NPCs" item (Users icon) and "Integrations" item (Puzzle icon) |

---

## Data Access Pattern

**Every `agent_configs` and `api_integrations` access must use `supabase.schema('game')`:**

```typescript
// Helper (src/lib/gameSchema.ts)
import { supabase } from '@/integrations/supabase/client';
export const gameDb = () => supabase.schema('game');

// CORRECT
gameDb().from('agent_configs').select('*');
gameDb().from('api_integrations').select('*');

// WRONG (hits public schema)
supabase.from('agent_configs').select('*');
```

---

## NPC Form Fields

| Field | DB Column | Input Type | Notes |
|-------|-----------|------------|-------|
| Name | `name` | text input | Required |
| ID | `id` | text (auto-slug from name) | Primary key, read-only on edit |
| Graphic | `graphic` | select: `male`, `female` | Spritesheet ID |
| Personality | `personality` | textarea (multiline) | System prompt for the AI |
| Idle Model | `model.idle` | select | See model options |
| Conversation Model | `model.conversation` | select | See model options |
| Skills | `skills` | multi-select checkboxes | Game skills + API skills |
| Spawn Map | `spawn.map` | text input | Map ID, e.g. `simplemap` |
| Spawn X | `spawn.x` | number input | Pixel X coordinate |
| Spawn Y | `spawn.y` | number input | Pixel Y coordinate |
| Idle Interval (ms) | `behavior.idleInterval` | number, default 15000 | How often NPC thinks |
| Patrol Radius | `behavior.patrolRadius` | number, default 3 | Tiles NPC wanders |
| Greet on Proximity | `behavior.greetOnProximity` | toggle, default true | Auto-greet nearby players |
| Inventory | `inventory` | multi-select | Token item IDs |
| Enabled | `enabled` | toggle, default true | On/off switch |

**Model options:**
- `kimi-k2-0711-preview`
- `gemini-2.5-flash`
- `gemini-2.5-pro`

---

## Skills Multi-Select

- **Game skills (hardcoded):** `move`, `say`, `look`, `emote`, `wait`
- **API skills (dynamic):** Fetch from `gameDb().from('api_integrations').select('skill_name, name, required_item_id').eq('enabled', true)` — show as additional checkboxes with the integration name
- **Auto-inventory:** When an API skill is selected, auto-add its `required_item_id` to the `inventory` array. When unchecked, remove the token.

---

## JSON Column Handling

The `model`, `spawn`, and `behavior` columns store JSON. Build/parse from individual form fields:

```typescript
// model column
{ idle: "kimi-k2-0711-preview", conversation: "kimi-k2-0711-preview" }

// spawn column
{ map: "simplemap", x: 300, y: 250 }

// behavior column
{ idleInterval: 15000, patrolRadius: 3, greetOnProximity: true }
```

---

## CRUD Operations

```typescript
// Create
await gameDb().from('agent_configs').insert({
  id: 'merchant',
  name: 'Merchant',
  graphic: 'female',
  personality: 'You are a friendly merchant...',
  model: { idle: 'kimi-k2-0711-preview', conversation: 'kimi-k2-0711-preview' },
  skills: ['move', 'say', 'look', 'emote', 'wait'],
  spawn: { map: 'simplemap', x: 200, y: 300 },
  behavior: { idleInterval: 15000, patrolRadius: 3, greetOnProximity: true },
  inventory: [],
  enabled: true,
});

// Read all
await gameDb().from('agent_configs').select('*').order('name');

// Read one
await gameDb().from('agent_configs').select('*').eq('id', npcId).single();

// Update
await gameDb().from('agent_configs').update({ ... }).eq('id', npcId);

// Delete
await gameDb().from('agent_configs').delete().eq('id', npcId);

// Toggle enabled
await gameDb().from('agent_configs').update({ enabled: !current }).eq('id', npcId);
```

---

## To-Do Checklist

- [ ] Create `src/lib/gameSchema.ts` helper
- [ ] Create `src/pages/NPCs.tsx` page component
- [ ] Create `src/components/npcs/NPCCard.tsx`
- [ ] Create `src/components/npcs/NPCFormModal.tsx`
- [ ] Create `src/components/npcs/index.ts` barrel
- [ ] Add `'npcs'` to Page type in App.tsx
- [ ] Add `<NpcBuilder>` case in `renderPage()`
- [ ] Add "NPCs" to sidebar nav items (Users icon, between Workflows and Executions)
- [ ] Fetch NPC list with `gameDb().from('agent_configs')`
- [ ] Implement create NPC (insert)
- [ ] Implement edit NPC (update)
- [ ] Implement delete NPC (with confirm dialog)
- [ ] Implement toggle enabled (inline)
- [ ] Fetch API skills from `gameDb().from('api_integrations')`
- [ ] Auto-manage inventory tokens when API skills toggled
- [ ] Toast notifications for all CRUD operations
- [ ] React Query invalidation on mutations
- [ ] Search/filter by name

---

## Success Metrics

1. **Correct schema:** Every query to `agent_configs` and `api_integrations` uses `supabase.schema('game')`. No game table queries go to `public`.
2. **List works:** NPC list page loads and displays all rows from `game.agent_configs`.
3. **Create works:** Creating an NPC inserts a row into `game.agent_configs`.
4. **Edit works:** Editing an NPC updates the row in `game.agent_configs`.
5. **Delete works:** Deleting an NPC (with confirmation) removes the row.
6. **Toggle works:** Enable/disable toggle updates `enabled` column inline.
7. **Form complete:** All fields from the table above are present and correctly mapped to JSON columns.
8. **API skills drive inventory:** Selecting `generate_image` auto-adds `image-gen-token` to inventory; unchecking removes it.
9. **Navigation:** "NPCs" appears in sidebar between Workflows and Executions.
10. **UX:** Toast notifications on success/error, no silent failures, list re-fetches after mutations.
