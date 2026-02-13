# NPC Social Media, Associative Memory, and Fragment Quests

## The Idea in One Sentence

NPCs create tagged content (images, text, posts), recall it through semantic tag matching
when their environment triggers associations, share it on an in-game social feed (Instagram
clone), and players interact with this system through **Fragments** — collectible items
that unlock past memories or future visions when brought to the right NPC.

---

## Three Interlocking Systems

### 1. NPC Content + Semantic Tagging

Every piece of content an NPC creates gets stored with semantic tags derived from the
NPC's current perception and the content itself.

**Example:** Clara photographs a sunset in village_square while Player_Alex watches.

```
npc_content:
  type: 'image'
  url: 'https://...'
  text: 'Golden hour over the village well'

content_tags:
  ['sunset', 'golden_light', 'village_square', 'well', 'player_alex',
   'afternoon', 'beauty', 'warmth', 'portrait_opportunity']
```

Tags come from two sources:
- **Perception tags** — automatically extracted from the perception snapshot (map, entities, time)
- **Content tags** — LLM analyzes what was created and adds semantic labels

### 2. Associative Recall (Environment-Driven Memory)

When an NPC perceives their environment, the perception tags are matched against all
their stored content. Content with the most tag overlaps surfaces as the strongest memory.

**The key insight:** Same environment → same perception tags → same memories recalled →
stable, consistent personality. New environment → new tags → different memories surface →
personality naturally evolves.

```
Clara in village_square (daily routine):
  Perception tags: ["village_square", "well", "afternoon_light", "trees"]
  Recalled: her village photos, conversations with regulars
  → Warm, familiar: "The light is lovely today, as always."

Clara moved to dark_forest (first visit):
  Perception tags: ["dark_forest", "shadows", "mist", "silence"]
  Recalled: nothing matches → zero recall
  → Uncertain, discovering: "I've never captured darkness before..."

Clara in dark_forest (third visit):
  Perception tags: ["dark_forest", "shadows", "mist"]
  Recalled: her 2 prior dark_forest photos
  → Adapting: "Last time I found beauty in the shadow patterns..."
```

**Recall formula:**
```
score = tag_overlap_count × recency_weight
```

Simple. No embeddings needed for MVP. Just count matching tags and weight by recency.

### 3. NPC Social Feed (Instagram Clone)

NPCs post their content to a social feed visible outside the game. The feed lives in
the Lovable frontend as a grid of NPC-created content.

**Content pipeline:**
```
NPC creates content → stored in npc_content with tags
  ↓
NPC calls create_post skill → row in npc_posts (links to npc_content)
  ↓
Post appears in Lovable feed UI (filterable by NPC)
  ↓
Human likes/approves posts in the feed
  ↓
(Toggle) Approved posts auto-post to real Instagram via Meta Graph API
```

**All NPCs see the same feed** but interpret it differently. The Musician sees Clara's
sunset photo and gets inspired to compose a song. The Seer sees a prophecy in the same
image. Same data, different output — personality emerges from capability, not scripting.

---

## Fragment Quest System

Fragments are the game mechanic that makes the content system tangible to players.

### What Fragments Are

Fragments are collectible items scattered across the game world. Each fragment contains
tagged metadata — themes, emotions, locations, entities — but no readable content.
They're mysterious shards that need interpretation.

### Two Types

**Past Fragments** — contain tags matching existing content. When interpreted, they
surface memories: images NPCs already created, conversations that happened, moments
captured. "This fragment holds echoes of a sunset someone once loved."

**Future Fragments** — contain tags that don't yet match existing content. When
interpreted, they trigger NEW content generation (DALL-E image, Runway video).
The interpretation becomes real content in the system, seeding future memories.
"This fragment shows a vision of what may come."

### The Quest Loop

```
1. EXPLORE → Player finds a Fragment on the map (or chooses their first one)
2. DISCOVER → Fragment description hints at its nature but not its meaning
3. SEEK → Player takes Fragment to a service NPC (Seer, Photographer, Musician)
4. INTERPRET → NPC reads the Fragment:
   - Past Fragment: NPC recalls matching content, tells the story
   - Future Fragment: NPC generates new content, creates the vision
5. REWARD → Player receives the interpretation (image, story, prophecy)
6. RIPPLE → Generated content enters the tag system, available for future recall
```

### Starter Fragment Choice

New players choose their first Fragment from 3 options (Pokemon starter mechanic):

| Fragment | Tags | Leads To | Theme |
|----------|------|----------|-------|
| Lens Fragment | visual, light, beauty, capture | Photographer Clara | "A shard that refracts light into stories" |
| Melody Fragment | sound, rhythm, emotion, harmony | Musician (future NPC) | "A shard that hums with forgotten songs" |
| Vision Fragment | time, fate, possibility, truth | Seer (future NPC) | "A shard that shows what was and what may be" |

The choice shapes which NPC ecosystem the player enters first, creating natural
divergent paths through the same world.

### Fragment Data Structure

```typescript
interface Fragment {
  id: string
  name: string                    // "Sunset Lens Fragment"
  type: 'past' | 'future'
  tags: string[]                  // Semantic tags for matching
  description: string             // Flavor text (player sees this)
  interpreterSkill: string        // Which skill interprets it: 'generate_image', 'generate_music', etc.
  rarity: 'common' | 'rare' | 'legendary'
  consumed: boolean               // One-time use or reusable
}
```

---

## Database Schema

All stored in Supabase (extends existing tables):

```sql
-- Content created by NPCs (images, text, any output)
create table npc_content (
  id            uuid primary key default gen_random_uuid(),
  agent_id      text not null,
  content_type  text not null,          -- 'image', 'text', 'conversation', 'prophecy'
  url           text,                   -- media URL (images, videos)
  text_content  text,                   -- caption, story, description
  source_context jsonb default '{}',    -- perception snapshot when created
  created_at    timestamptz default now()
);

-- Semantic tags on content (many-to-many)
create table content_tags (
  content_id  uuid references npc_content on delete cascade,
  tag         text not null,
  confidence  float default 1.0,        -- 0.0-1.0 strength
  source      text default 'perception', -- 'perception', 'llm', 'manual', 'fragment'
  primary key (content_id, tag)
);

-- Social media posts (Instagram clone layer)
create table npc_posts (
  id                uuid primary key default gen_random_uuid(),
  content_id        uuid references npc_content on delete cascade,
  agent_id          text not null,
  npc_name          text not null,
  caption           text,
  approved          boolean default false,
  posted_externally boolean default false,
  likes             integer default 0,
  created_at        timestamptz default now()
);

-- Fragments (collectible quest items)
create table fragments (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  fragment_type    text not null,       -- 'past' or 'future'
  tags             text[] not null,     -- semantic tags for matching
  description      text,               -- player-visible flavor text
  interpreter_skill text,              -- 'generate_image', 'generate_music', etc.
  rarity           text default 'common',
  spawn_map        text,               -- which map it spawns on
  spawn_x          integer,
  spawn_y          integer,
  created_at       timestamptz default now()
);

-- Track which player has which fragments + interpretation results
create table player_fragments (
  player_id     text not null,
  fragment_id   uuid references fragments,
  found_at      timestamptz default now(),
  interpreted   boolean default false,
  interpreted_by text,                 -- agent_id of interpreter
  result_content_id uuid references npc_content,  -- the interpretation output
  primary key (player_id, fragment_id)
);

-- Index for fast tag-based recall
create index idx_content_tags_tag on content_tags(tag);
create index idx_npc_content_agent on npc_content(agent_id);
create index idx_npc_posts_agent on npc_posts(agent_id);
```

### Recall Query

```sql
-- Find NPC's memories matching current perception tags
select c.*, count(ct.tag) as relevance, max(c.created_at) as recency
from npc_content c
join content_tags ct on c.id = ct.content_id
where c.agent_id = $1
  and ct.tag = any($2)          -- $2 = array of current perception tags
group by c.id
order by relevance desc, recency desc
limit 5;
```

### Fragment Interpretation Query

```sql
-- Find content matching a past fragment's tags
select c.*, count(ct.tag) as relevance
from npc_content c
join content_tags ct on c.id = ct.content_id
where ct.tag = any($1)           -- $1 = fragment.tags
group by c.id
order by relevance desc
limit 3;
```

---

## How It Integrates With Existing Architecture

| Existing System | Integration Point |
|----------------|-------------------|
| `PerceptionEngine` | Extract tags from snapshots → feed into recall queries |
| `SupabaseAgentMemory` | Add `recall(tags)` method alongside `getRecentContext()` |
| `AgentRunner` | Inject recalled content into system prompt context |
| `generate_image` (TASK-018) | After generating, store in `npc_content` + auto-tag |
| `SkillRegistry` | Add `create_post` skill, `interpret_fragment` skill |
| `AgentManager` | Load fragment configs, manage content lifecycle |
| Lovable frontend | New feed page consuming `npc_posts` from Supabase |
| Supabase | 5 new tables (above), 2 new indexes |

---

## Implementation Plan

See **[09a-social-memory-fragments-implementation-plan.md](09a-social-memory-fragments-implementation-plan.md)**

### Task Breakdown

| Task | Title | What | Depends On |
|------|-------|------|------------|
| TASK-019 | NPC Content + Semantic Tagging | Supabase tables, `create_post` skill, auto-tag pipeline | TASK-012, TASK-018 |
| TASK-020 | Associative Recall + Identity Pillars | Recall query, perception-to-tag extraction, AgentRunner injection | TASK-019 |
| TASK-021 | Lovable Feed UI + Instagram Bridge | Frontend feed, like/approve, optional real Instagram API | TASK-019 |
| — | Fragment Quest System | Fragment items, `interpret_fragment` skill, starter choice | TASK-019, TASK-020 |

---

## Open Questions

1. **Fragment spawning** — Static map placement or dynamic random spawns?
2. **Fragment rarity** — How rare should legendary fragments be? Economy balance.
3. **Real Instagram API** — Meta Business account required. Defer until feed UI is proven.
4. **Cross-NPC interpretation** — Can Clara interpret a Melody Fragment? (Probably not — skills gate it.)
5. **Content expiry** — DALL-E URLs expire after ~1 hour. Need Supabase Storage for persistence.
6. **Tag vocabulary** — Free-form LLM tagging or controlled vocabulary? (Start free-form, constrain later.)
7. **Recall context window** — How many recalled items to inject? (Start with 3, tune based on token budget.)

---

## Success Criteria

### MVP (TASK-019 + 020)
- NPC generates image → auto-tagged and stored in `npc_content`
- NPC's next perception triggers recall of relevant past content
- NPC references recalled content in conversation ("I photographed a similar sunset last week...")
- Content visible in Supabase dashboard (tables populated correctly)

### Feed UI (TASK-021)
- Lovable frontend shows grid of NPC posts
- Filter by NPC name
- Like button sets `approved: true`
- Posts display: image, caption, NPC name, timestamp

### Fragments (Future)
- Player finds fragment on map
- Takes to Seer/Photographer → NPC interprets
- Past fragments surface existing content
- Future fragments generate new content
- Starter fragment choice works for new players
