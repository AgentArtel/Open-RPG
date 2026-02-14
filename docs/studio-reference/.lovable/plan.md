
# NPC Builder Page -- Full CRUD for game.agent_configs

## Overview

A new "NPCs" page accessible from the sidebar that lets users create, edit, delete, and toggle AI NPCs. The page mirrors the Credentials page pattern (card grid + modal form) but with game-specific fields. All queries target the `public` schema tables (`agent_configs`, `api_integrations`) since the database already exposes them there.

## Database Access Note

The tables `agent_configs`, `api_integrations`, and `agent_memory` already exist in the `public` schema and contain live data. No migration is needed. Standard `supabase.from('agent_configs')` queries will work. The task doc mentions `.schema('game')` but the Supabase types and PostgREST config expose these tables via `public`, so we use the default schema (no `.schema()` call needed).

## New Files

### 1. `src/pages/NPCs.tsx` -- Main NPC Builder Page

Card grid layout matching the Credentials page pattern:

- Header with title "NPCs" + description + "Create NPC" button
- Search bar to filter by name
- Card grid (1-3 columns responsive) showing each NPC:
  - Sprite icon (male/female emoji), name, map name, skill count badge, enabled dot
  - Hover actions: Edit, Toggle enabled, Delete
- Empty state when no NPCs exist
- Uses `useQuery` for fetching, `useMutation` for create/update/delete with `queryClient.invalidateQueries`

### 2. `src/components/npcs/NPCCard.tsx` -- NPC Card Component

Similar to `CredentialCard.tsx`:
- Shows NPC graphic icon, name, map location, skill count, enabled status dot
- Hover reveals Edit / Toggle / Delete buttons
- Inline toggle for enabled/disabled state

### 3. `src/components/npcs/NPCFormModal.tsx` -- Create/Edit Form Modal

Uses the existing `Modal` component. Form fields organized in sections:

**Identity Section:**
- Name (text input, required)
- ID (text input, auto-slugified from name on create, read-only on edit)
- Graphic (select: male, female)

**AI Section:**
- Personality (textarea, multiline system prompt)
- Idle Model (select: kimi-k2-0711-preview, gemini-2.5-flash, gemini-2.5-pro)
- Conversation Model (same select options)

**Skills Section:**
- Game skills checkboxes: move, say, look, emote, wait
- API skills checkboxes: fetched from `api_integrations` where `enabled=true`, showing integration name
- When an API skill is checked, its `required_item_id` is auto-added to inventory

**Spawn Section:**
- Map (text input, e.g. "simplemap")
- X coordinate (number input)
- Y coordinate (number input)

**Behavior Section:**
- Idle Interval ms (number, default 15000)
- Patrol Radius (number, default 3)
- Greet on Proximity (toggle, default true)

**Other:**
- Inventory (comma-separated text input showing current items, auto-managed by skill selection)
- Enabled (toggle, default true)

**Save button** calls INSERT (create) or UPDATE (edit) on `agent_configs`.

### 4. `src/components/npcs/index.ts` -- barrel export

## Modified Files

### 5. `src/App.tsx`

- Add `'npcs'` to the `Page` type union
- Import `NPCs` page component
- Add `case 'npcs': return <NPCs onNavigate={onNavigate} />;` to `renderPage()`

### 6. `src/components/ui-custom/Sidebar.tsx`

- Import `Users` icon from lucide-react
- Add `{ id: 'npcs', label: 'NPCs', icon: Users }` to `navItems` array, inserted after "Workflows" and before "Executions"

## Data Flow

```text
NPCs Page
  |-- useQuery('agent_configs') -> supabase.from('agent_configs').select('*').order('name')
  |-- useQuery('api_integrations') -> supabase.from('api_integrations').select('skill_name,name,required_item_id').eq('enabled',true)
  |
  |-- Create: supabase.from('agent_configs').insert({...})
  |-- Update: supabase.from('agent_configs').update({...}).eq('id', npcId)
  |-- Delete: supabase.from('agent_configs').delete().eq('id', npcId)
  |-- Toggle: supabase.from('agent_configs').update({ enabled: !current }).eq('id', npcId)
```

## NPC Form State Shape

```typescript
interface NPCFormState {
  id: string;
  name: string;
  graphic: 'male' | 'female';
  personality: string;
  model: { idle: string; conversation: string };
  skills: string[];
  spawn: { map: string; x: number; y: number };
  behavior: { idleInterval: number; patrolRadius: number; greetOnProximity: boolean };
  inventory: string[];
  enabled: boolean;
}
```

## Technical Notes

- The `id` field is the primary key (text, not uuid). On create, auto-generate from name via slugify (lowercase, replace spaces with hyphens, strip special chars). On edit, it's read-only.
- `model`, `spawn`, and `behavior` are JSONB columns -- insert/update them as nested objects.
- `skills` and `inventory` are text arrays -- insert as `string[]`.
- All form components reuse the existing `FormInput`, `FormSelect`, `FormTextarea`, `FormToggle` from `src/components/forms/`.
- Toast notifications via `sonner` for all CRUD operations (matching existing pattern).
- Delete requires `window.confirm()` before proceeding (matching Credentials pattern).

## Files Summary

| File | Action |
|------|--------|
| `src/pages/NPCs.tsx` | Create |
| `src/components/npcs/NPCCard.tsx` | Create |
| `src/components/npcs/NPCFormModal.tsx` | Create |
| `src/components/npcs/index.ts` | Create |
| `src/App.tsx` | Modify -- add 'npcs' page |
| `src/components/ui-custom/Sidebar.tsx` | Modify -- add NPCs nav item |
