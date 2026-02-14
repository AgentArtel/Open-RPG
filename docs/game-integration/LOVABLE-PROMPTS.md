# Lovable Prompts — Studio ↔ Game Integration

Copy/paste these into Lovable as prompt messages. You may need to break them into parts if they're too long.

---

## Prompt (Part 1 — Migration & Data Access)

First, run this SQL migration in the Supabase SQL Editor. This grants the Studio app access to the `game` schema tables where the RPGJS game server stores its NPC configurations:

```sql
-- Grant Studio (anon/authenticated) access to game schema
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, studio, game';
NOTIFY pgrst, 'reload config';

GRANT USAGE ON SCHEMA game TO anon, authenticated;

-- Config tables: Studio can read AND write
GRANT SELECT, INSERT, UPDATE, DELETE ON game.agent_configs TO authenticated;
GRANT SELECT ON game.agent_configs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON game.api_integrations TO authenticated;
GRANT SELECT ON game.api_integrations TO anon;

-- Runtime tables: Studio can READ only
GRANT SELECT ON game.agent_memory TO authenticated, anon;
GRANT SELECT ON game.player_state TO authenticated;

-- Functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA game TO authenticated, anon;

-- Future tables auto-grant
ALTER DEFAULT PRIVILEGES IN SCHEMA game GRANT SELECT ON TABLES TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA game GRANT EXECUTE ON FUNCTIONS TO authenticated, anon;
```

After running that, verify it works by running in SQL Editor:
```sql
SELECT * FROM game.agent_configs;
```
You should see 4 NPCs (Elder Theron, Test Agent, Photographer, Artist).

---

## Prompt (Part 2 — NPC Builder Page)

Now add an "NPCs" page to the app. This is a CRUD page for managing AI game characters stored in the `game.agent_configs` table.

**Sidebar:** Add "NPCs" item with the Users icon from lucide-react, placed between "Workflows" and "Executions" in the sidebar.

**Add to App.tsx:** Add `'npcs'` to the Page type union and a case in renderPage() for a new `<NpcBuilder onNavigate={onNavigate} />` component.

**NPC list view:**
- Fetch NPCs with `supabase.schema('game').from('agent_configs').select('*').order('name')`
- Show as a card grid (same style as Credentials page)
- Each card shows: name, graphic badge, map name, skill count, enabled/disabled toggle
- Search bar to filter by name
- "Create NPC" button opens the form modal
- Click a card to edit

**NPC form (modal):**
Fields:
- Name (text, required)
- ID (text, auto-generated slug from name, read-only when editing)
- Graphic (select: `male` or `female`)
- Personality (multiline textarea — this is the AI system prompt)
- Idle Model (select: `kimi-k2-0711-preview`, `gemini-2.5-flash`, `gemini-2.5-pro`)
- Conversation Model (same select options)
- Skills (multi-select checkboxes)
  - Hardcoded game skills: `move`, `say`, `look`, `emote`, `wait`
  - Dynamic API skills: fetch from `supabase.schema('game').from('api_integrations').select('skill_name, name, required_item_id').eq('enabled', true)` and show as additional checkboxes
- Spawn Map (text input, e.g. "simplemap")
- Spawn X (number), Spawn Y (number)
- Idle Interval ms (number, default 15000)
- Patrol Radius (number, default 3)
- Greet on Proximity (toggle, default true)
- Inventory (multi-select of token items — auto-populate when API skills are selected)
- Enabled (toggle, default true)

**Important**: The `model` column stores JSON like `{"idle":"kimi-k2-0711-preview","conversation":"kimi-k2-0711-preview"}`. The `spawn` column stores `{"map":"simplemap","x":300,"y":250}`. The `behavior` column stores `{"idleInterval":15000,"patrolRadius":3,"greetOnProximity":true}`. Build/parse these JSON objects from the individual form fields.

**Smart behavior**: When a user checks an API skill (like `generate_image`), automatically add its `required_item_id` (like `image-gen-token`) to the inventory array. When they uncheck it, remove the token.

**CRUD operations** — all queries MUST use `.schema('game')`:
```typescript
// Create
await supabase.schema('game').from('agent_configs').insert({
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

// Update
await supabase.schema('game').from('agent_configs')
  .update({ name: 'Updated Name', personality: '...' })
  .eq('id', 'merchant');

// Delete
await supabase.schema('game').from('agent_configs').delete().eq('id', 'merchant');

// Toggle
await supabase.schema('game').from('agent_configs')
  .update({ enabled: false })
  .eq('id', 'merchant');
```

---

## Prompt (Part 3 — Integrations Page)

Add an "Integrations" page for managing API-backed skills stored in `game.api_integrations`.

**Sidebar:** Add "Integrations" item with the Puzzle icon, after "NPCs".

**List view** — fetch with `supabase.schema('game').from('api_integrations').select('*').order('name')`:
- Card grid showing: name, description, skill_name, category badge, enabled toggle
- "Add Integration" button

**Integration form:**
- Name (text) — display name like "Image Generation"
- ID (auto-slug from name)
- Description (textarea)
- Skill Name (text) — the function name like `generate_image`
- Required Item ID (text) — the token item like `image-gen-token`
- Required Env Vars (tag/chip input — array of strings like `GEMINI_API_KEY`)
- Category (select: `api`, `social`, `knowledge`)
- Enabled (toggle)

Same CRUD pattern with `.schema('game')`.

---

## Prompt (Part 4 — Dashboard Stats)

On the Dashboard, replace or supplement the existing stat cards with live game data:

```typescript
// Active NPCs
const { count: npcCount } = await supabase.schema('game')
  .from('agent_configs').select('id', { count: 'exact', head: true }).eq('enabled', true);

// Total Player Messages
const { count: msgCount } = await supabase.schema('game')
  .from('agent_memory').select('id', { count: 'exact', head: true }).eq('role', 'user');

// API Integrations
const { count: intCount } = await supabase.schema('game')
  .from('api_integrations').select('id', { count: 'exact', head: true }).eq('enabled', true);

// Online Players
const { count: playerCount } = await supabase.schema('game')
  .from('player_state').select('player_id', { count: 'exact', head: true });
```

Show these as StatCards: "Active NPCs", "Player Messages", "API Integrations", "Online Players".
