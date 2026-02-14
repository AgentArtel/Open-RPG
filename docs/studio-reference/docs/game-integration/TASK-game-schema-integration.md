# Task: Wire Studio to Game Schema — NPC Builder & Integrations Manager

**Status:** READY
**Assignee:** Lovable (Agent Artel Studio)
**Priority:** High
**Created:** 2026-02-14
**Context:** The game server (RPGJS) and Studio share the same Supabase database. Game data lives in the `game` schema. Studio data lives in `public` (as `studio_*` tables). A new migration (011) has been applied that grants Studio's anon/authenticated roles access to `game` schema tables. Studio can now read/write game data using `.schema('game')`.

---

## Background

Agent Artel Studio is the visual builder for an RPGJS game with AI NPCs. The game server reads NPC configurations from `game.agent_configs` and API integration definitions from `game.api_integrations`. Studio needs to manage these tables so that users can create/edit NPCs and integrations visually, and the game picks up changes automatically.

The database cross-schema access is already configured (migration 011). Studio just needs UI pages and Supabase queries to manage the data.

---

## Deliverables

### 1. NPC Builder Page (new page: `npcs`)

A CRUD page for managing AI NPCs. Each row in `game.agent_configs` = one NPC in the game.

**Navigation:** Add "NPCs" to the sidebar (icon: `Users` from lucide-react), between "Workflows" and "Executions".

**List view:**
- Fetch all rows from `game.agent_configs` using `supabase.schema('game').from('agent_configs').select('*').order('name')`
- Display as card grid (like Credentials page) showing: name, graphic, enabled status, map, skill count
- Search/filter by name
- Toggle enabled/disabled inline (UPDATE `enabled` column)
- Click card → open edit modal/page
- "Create NPC" button → open empty form

**NPC Form (modal or dedicated page):**

| Field | DB Column | Input Type | Notes |
| --- | --- | --- | --- |
| Name | `name` | text input | Required |
| ID | `id` | text input (auto-slug from name) | Primary key, read-only on edit |
| Graphic | `graphic` | select: `male`, `female` | Spritesheet ID |
| Personality | `personality` | textarea (multiline) | System prompt for the AI |
| Idle Model | `model.idle` | select | See model options below |
| Conversation Model | `model.conversation` | select | See model options below |
| Skills | `skills` | multi-select checkboxes | Game skills + API skills (see below) |
| Spawn Map | `spawn.map` | text input | Map ID, e.g. `simplemap` |
| Spawn X | `spawn.x` | number input | Pixel X coordinate |
| Spawn Y | `spawn.y` | number input | Pixel Y coordinate |
| Idle Interval (ms) | `behavior.idleInterval` | number input, default 15000 | How often the NPC thinks |
| Patrol Radius | `behavior.patrolRadius` | number input, default 3 | Tiles the NPC wanders |
| Greet on Proximity | `behavior.greetOnProximity` | toggle, default true | Auto-greet nearby players |
| Inventory | `inventory` | multi-select | Token item IDs (e.g. `image-gen-token`) |
| Enabled | `enabled` | toggle, default true | On/off switch |

**Model options for dropdowns:**
```
kimi-k2-0711-preview
gemini-2.5-flash
gemini-2.5-pro
```

**Skills multi-select:**
- **Game skills** (hardcoded): `move`, `say`, `look`, `emote`, `wait`
- **API skills** (from database): Fetch from `supabase.schema('game').from('api_integrations').select('skill_name, name, required_item_id').eq('enabled', true)` — show as additional checkboxes with the integration name
- When an API skill is selected, auto-add its `required_item_id` to the `inventory` array

**CRUD operations:**
```typescript
// Create
await supabase.schema('game').from('agent_configs').insert({ ... });

// Read all
await supabase.schema('game').from('agent_configs').select('*').order('name');

// Read one
await supabase.schema('game').from('agent_configs').select('*').eq('id', npcId).single();

// Update
await supabase.schema('game').from('agent_configs').update({ ... }).eq('id', npcId);

// Delete
await supabase.schema('game').from('agent_configs').delete().eq('id', npcId);

// Toggle enabled
await supabase.schema('game').from('agent_configs').update({ enabled: !current }).eq('id', npcId);
```

---

### 2. Integrations Page (new page: `integrations`)

A CRUD page for managing API integrations. Each row in `game.api_integrations` = one API-backed skill available in the game.

**Navigation:** Add "Integrations" to the sidebar (icon: `Puzzle` from lucide-react), after "NPCs".

**List view:**
- Fetch all rows from `supabase.schema('game').from('api_integrations').select('*').order('name')`
- Display as card grid showing: name, description, skill_name, category, enabled status, required env vars
- Toggle enabled/disabled inline

**Integration Form:**

| Field | DB Column | Input Type | Notes |
| --- | --- | --- | --- |
| Name | `name` | text input | Display name, e.g. "Image Generation" |
| ID | `id` | text input (auto-slug) | Primary key |
| Description | `description` | textarea | Tooltip text for NPC builder |
| Skill Name | `skill_name` | text input | Function name, e.g. `generate_image` |
| Required Item ID | `required_item_id` | text input | Token item, e.g. `image-gen-token` |
| Required Env Vars | `requires_env` | tag input (array of strings) | e.g. `GEMINI_API_KEY` |
| Category | `category` | select: `api`, `social`, `knowledge` | Grouping |
| Enabled | `enabled` | toggle | Show/hide in NPC builder |

**CRUD operations:** Same pattern as NPCs but targeting `api_integrations` table.

---

### 3. NPC Memory Viewer (optional enhancement to NPC Builder)

When viewing/editing an NPC, show a "Memory" tab that displays recent conversation history.

```typescript
const { data: memory } = await supabase
  .schema('game')
  .from('agent_memory')
  .select('*')
  .eq('agent_id', npcId)
  .order('created_at', { ascending: false })
  .limit(50);
```

Display as a chat-style message list (role: user/assistant/system, content, timestamp).

---

### 4. Dashboard Enhancement

On the Dashboard page, add game stats cards:
- **Active NPCs:** `supabase.schema('game').from('agent_configs').select('id', { count: 'exact' }).eq('enabled', true)`
- **Total Conversations:** `supabase.schema('game').from('agent_memory').select('id', { count: 'exact' }).eq('role', 'user')`
- **API Integrations:** `supabase.schema('game').from('api_integrations').select('id', { count: 'exact' }).eq('enabled', true)`
- **Online Players:** `supabase.schema('game').from('player_state').select('player_id', { count: 'exact' })`

---

### 5. App.tsx Navigation Update

Add new pages to the Page type and routing:

```typescript
type Page = 'dashboard' | 'workflows' | 'executions' | 'credentials' | 'templates' | 'settings' | 'editor' | 'showcase' | 'npcs' | 'integrations';
```

Add cases in `renderPage()` and sidebar items.

---

## Database Access Pattern

**CRITICAL:** All queries to game tables MUST use `.schema('game')`:

```typescript
// CORRECT — hits game.agent_configs
supabase.schema('game').from('agent_configs').select('*');

// WRONG — hits public.agent_configs (doesn't exist or is legacy)
supabase.from('agent_configs').select('*');
```

Studio tables (`studio_workflows`, `studio_executions`, etc.) continue using the default:
```typescript
// CORRECT — hits public.studio_workflows
supabase.from('studio_workflows').select('*');
```

---

## Existing Seed Data (for testing)

These NPCs already exist in `game.agent_configs`:

| id | name | graphic | map | skills |
| --- | --- | --- | --- | --- |
| `elder-theron` | Elder Theron | female | simplemap | move, say, look, emote, wait |
| `test-agent` | Test Agent | female | simplemap | move, say, look, emote, wait |
| `photographer` | Photographer | female | simplemap | move, say, look, emote, wait, generate_image |
| `artist` | Artist | female | simplemap | move, say, look, emote, wait |

One integration exists in `game.api_integrations`:

| id | name | skill_name | required_item_id |
| --- | --- | --- | --- |
| `image-generation` | Image Generation | generate_image | image-gen-token |

---

## Acceptance Criteria

- [ ] NPC Builder page shows all NPCs from `game.agent_configs`
- [ ] Can create new NPC → row appears in `game.agent_configs`
- [ ] Can edit existing NPC → changes persist
- [ ] Can delete NPC → row removed
- [ ] Can toggle NPC enabled/disabled
- [ ] Skills dropdown includes both game skills and API integration skills
- [ ] Selecting an API skill auto-adds the required token to inventory
- [ ] Integrations page shows all rows from `game.api_integrations`
- [ ] Can create/edit/delete integrations
- [ ] Dashboard shows live game stats
- [ ] All game queries use `.schema('game')` prefix
- [ ] All studio queries use default (no schema prefix)

---

## Migration Already Applied

Migration `011_studio_cross_schema_access.sql` has been run (in the **game** repo’s Supabase project). It:
- Exposes `public`, `studio`, and `game` schemas via PostgREST
- Grants `authenticated` role SELECT/INSERT/UPDATE/DELETE on `game.agent_configs` and `game.api_integrations`
- Grants `authenticated` role SELECT on `game.agent_memory` and `game.player_state`
- Grants `anon` role SELECT on config and memory tables
