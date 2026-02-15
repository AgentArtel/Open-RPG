# D-5: Content Store Schema Design

- **Status**: DONE
- **Owner**: Orchestrator
- **Blocks**: G-3 (Content Store + Tagging), G-4 (Associative Recall), S-5 (Feed UI)
- **Migration**: `013_content_store.sql`

---

## Overview

Three new tables in the `game` schema to store NPC-generated content with semantic tags and a social feed layer. This is the database foundation for the content pipeline:

```
NPC creates content (image, text, prophecy)
  → stored in game.npc_content with perception snapshot
  → auto-tagged in game.content_tags (perception + LLM-derived)
  → optionally posted to game.npc_posts (social feed)
  → recalled via game.recall_content() RPC (tag-overlap query)
```

---

## Tables

### 1. `game.npc_content` — Artifact Storage

Every piece of content an NPC creates: images from Gemini, text, conversations, prophecies.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | `gen_random_uuid()` |
| agent_id | text NOT NULL | NPC who created it (no FK — content outlives config changes, matches `agent_memory` pattern) |
| content_type | text NOT NULL | `'image'`, `'text'`, `'conversation'`, `'prophecy'` — free-form, no enum |
| url | text | Media URL (Gemini-generated images, etc.) |
| text_content | text | Caption, story, description |
| source_context | jsonb | Full `PerceptionSnapshot` when content was created — enables replay and context understanding |
| created_at | timestamptz | Write-once, no `updated_at` (content is immutable after creation) |

### 2. `game.content_tags` — Semantic Many-to-Many

Tags on content, derived from two sources:
- **Perception tags**: map name, time of day, nearby entity names/types, inventory items
- **Content tags**: LLM-extracted keywords from prompts/captions

| Column | Type | Notes |
|--------|------|-------|
| content_id | uuid FK → npc_content | ON DELETE CASCADE |
| tag | text NOT NULL | Free-form string, lowercase. No controlled vocabulary for MVP |
| confidence | float DEFAULT 1.0 | 0.0–1.0 strength. All 1.0 for MVP; future use for weighted recall |
| source | text DEFAULT 'perception' | `'perception'`, `'llm'`, `'manual'`, `'fragment'` |
| PK | (content_id, tag) | Composite — one tag per content per string |

### 3. `game.npc_posts` — Social Feed Layer

NPC Instagram-style posts. Links to content. Supports approval workflow and future external posting.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | `gen_random_uuid()` |
| content_id | uuid FK → npc_content | ON DELETE CASCADE |
| agent_id | text NOT NULL | NPC who posted |
| npc_name | text NOT NULL | Display name (denormalized for feed queries) |
| caption | text | NPC-written caption |
| approved | boolean DEFAULT false | Studio approval toggle |
| posted_externally | boolean DEFAULT false | Future: Instagram API bridge |
| likes | integer DEFAULT 0 | Simple counter (proper junction table is post-MVP) |
| created_at | timestamptz | |
| updated_at | timestamptz | Trigger-managed via `game.set_updated_at()` from migration 009 |

---

## Indexes

| Index | Table | Column(s) | Purpose |
|-------|-------|-----------|---------|
| idx_npc_content_agent | npc_content | agent_id | Filter content by NPC |
| idx_npc_content_created | npc_content | created_at DESC | Recency sorting |
| idx_content_tags_tag | content_tags | tag | **Critical** — recall query performance |
| idx_npc_posts_agent | npc_posts | agent_id | Filter feed by NPC |
| idx_npc_posts_created | npc_posts | created_at DESC | Feed ordering |

---

## RPC Function

### `game.recall_content(p_agent_id, p_tags, p_limit)`

Server-side tag-overlap query for associative recall. Returns content ranked by relevance (tag overlap count) then recency.

**Parameters:**
- `p_agent_id text` — which NPC's content to search
- `p_tags text[]` — current perception tags to match against
- `p_limit integer DEFAULT 5` — max results

**Returns:** content rows + relevance score

**Used by:** `ContentStore.recall()` in G-3, `AgentRunner` prompt injection in G-4.

---

## Grants

Following the migration 011 pattern:

| Role | npc_content | content_tags | npc_posts |
|------|-------------|-------------|-----------|
| anon | SELECT (auto via 011 default privileges) | SELECT (auto) | SELECT (auto) |
| authenticated | SELECT (auto) | SELECT (auto) | SELECT (auto) + UPDATE + DELETE |
| service_role | ALL (bypasses grants) | ALL | ALL |

**Rationale:**
- `npc_content` and `content_tags` are **runtime tables** — game server writes via service_role, Studio reads only. Same pattern as `agent_memory`.
- `npc_posts` needs authenticated UPDATE (approve posts, toggle `posted_externally`, increment likes) and DELETE (remove inappropriate posts from Studio).
- No INSERT for authenticated on any table — content creation happens game-side via service_role only.

---

## Design Decisions

### 1. No FK on agent_id
Content outlives NPC config changes. If an NPC is removed from `agent_configs`, their historical content remains. Matches the `agent_memory` pattern (no FK there either).

### 2. No RLS
Consistent with all existing game schema migrations. Service_role bypasses RLS anyway. Studio access controlled via role grants.

### 3. No vector embeddings
Simple tag counting (overlap count × recency) is sufficient for MVP. The recall query is a straightforward SQL join. pgvector adds complexity with no proven benefit at this scale.

### 4. Free-form tags, no enum
Tags like `'village_square'`, `'afternoon'`, `'player_alex'`, `'sunset'` are extracted dynamically from perception snapshots and LLM output. A controlled vocabulary would limit emergent behavior.

### 5. Write-once content, mutable posts
`npc_content` has no `updated_at` — content is immutable after creation. `npc_posts` has `updated_at` (approval, likes change). This reflects the data model: artifacts are permanent, social status is fluid.

### 6. Denormalized npc_name on posts
The feed UI needs to display NPC names without joining to `agent_configs`. If an NPC's name changes in configs, historical posts keep the original name. This is intentional — posts are a record of what was, not what is.

### 7. Likes as integer counter
A proper likes system needs a `post_likes(player_id, post_id)` junction table to prevent double-likes. For MVP, a simple counter is enough. Junction table is post-MVP.

---

## Migration File

The complete SQL is at: `.ai/migrations/013_content_store.sql`

Cursor should copy this to `Open-RPG/supabase/migrations/013_content_store.sql` when starting G-3.

---

## What G-3 Builds On This Schema

G-3 (Content Store + Tagging) implements:
1. `ContentStore.ts` — service class with `storeContent()`, `recall()`, `createPost()`, `getRecentPosts()`
2. `PerceptionEngine.extractTags()` — tag extraction from perception snapshots
3. `generate_image` integration — auto-store + auto-tag after image generation
4. `create_post` skill — NPC skill to share content to social feed
5. Skill registration — register `create_post` in the skill barrel

Pattern to follow: `SupabaseAgentMemory` — write-behind flush, graceful degradation, batch inserts.

---

## What S-5 Builds On This Schema

S-5 (Lovable Feed Integration) reads `game.npc_posts` joined with `game.npc_content` to display:
- Grid of NPC-created content (images, text)
- Filter by NPC name
- Approve/like buttons (UPDATE on npc_posts)
- Caption, NPC name, timestamp

Uses `gameDb().from('npc_posts')` via the Studio helper pattern.

---

## Fragment Tables (NOT included — future work)

The idea doc proposes `game.fragments` and `game.player_fragments` for the Fragment Quest System. These are explicitly out of scope for D-5 and G-3. They will be designed as a separate migration (014+) when the fragment system is ready.
