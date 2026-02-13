# Implementation Plan: NPC Social Media, Associative Memory, and Fragments

## Overview

Three tasks build the system incrementally. Each is useful on its own.

---

## Step 1: Supabase Tables (TASK-019)

**File:** `supabase/migrations/003_npc_content.sql`

Create the `npc_content`, `content_tags`, and `npc_posts` tables per the schema
in the idea doc. Include indexes for tag-based recall.

Run migration via Supabase dashboard or CLI.

---

## Step 2: Auto-Tag Pipeline (TASK-019)

**File:** `src/agents/memory/ContentStore.ts`

A thin wrapper around Supabase for storing and querying NPC content.

```typescript
export class ContentStore {
  constructor(private supabase: SupabaseClient) {}

  async storeContent(params: {
    agentId: string
    contentType: 'image' | 'text' | 'conversation' | 'prophecy'
    url?: string
    textContent?: string
    tags: string[]
    sourceContext: Record<string, unknown>
  }): Promise<string> {
    // 1. Insert into npc_content → get id
    // 2. Insert tags into content_tags (batch)
    // 3. Return content id
  }

  async recall(agentId: string, perceptionTags: string[], limit = 5): Promise<ContentRow[]> {
    // Execute the tag-overlap recall query
    // Returns content ranked by number of matching tags
  }

  async createPost(params: {
    contentId: string
    agentId: string
    npcName: string
    caption: string
  }): Promise<void> {
    // Insert into npc_posts
  }
}
```

---

## Step 3: Tag Extraction from Perception (TASK-019)

**Modify:** `src/agents/perception/PerceptionEngine.ts`

Add a `extractTags()` method that converts a perception snapshot into a flat
array of string tags:

```typescript
extractTags(snapshot: PerceptionSnapshot): string[] {
  const tags: string[] = []

  // Location
  tags.push(snapshot.location.map)

  // Time
  tags.push(snapshot.time)  // 'morning', 'afternoon', etc.

  // Nearby entities
  for (const entity of snapshot.nearby) {
    tags.push(entity.name.toLowerCase())
    tags.push(entity.type)
  }

  // Self state
  for (const item of snapshot.self.inventory) {
    tags.push(item.toLowerCase())
  }

  return [...new Set(tags)]  // Deduplicate
}
```

---

## Step 4: `create_post` Skill (TASK-019)

**File:** `src/agents/skills/skills/create-post.ts`

```typescript
export const createPostSkill: IAgentSkill = {
  name: 'create_post',
  description: 'Share your latest creation on the village board for others to see',
  parameters: {
    caption: {
      type: 'string',
      description: 'Caption for your post',
      required: true,
    },
  },
  async execute(params, context): Promise<SkillResult> {
    // 1. Get the NPC's most recent content from npc_content
    // 2. Create a post row in npc_posts
    // 3. Return confirmation
  },
}
```

---

## Step 5: Wire generate_image → ContentStore (TASK-019)

**Modify:** `src/agents/skills/skills/generate-image.ts`

After DALL-E returns an image URL, store it in `npc_content` with auto-tags:

```typescript
// After successful DALL-E call:
const perceptionTags = perceptionEngine.extractTags(currentSnapshot)
const contentTags = [...perceptionTags, ...extractPromptTags(prompt)]

await contentStore.storeContent({
  agentId: context.agentId,
  contentType: 'image',
  url: imageUrl,
  textContent: prompt,
  tags: contentTags,
  sourceContext: currentSnapshot,
})
```

The `extractPromptTags()` helper splits the DALL-E prompt into keywords.
For MVP, simple word extraction. Post-MVP, LLM-powered tag generation.

---

## Step 6: Associative Recall in AgentRunner (TASK-020)

**Modify:** `src/agents/core/AgentRunner.ts`

Before building the system prompt, query recalled content:

```typescript
// In run():
const perceptionTags = perceptionEngine.extractTags(snapshot)
const recalled = await contentStore.recall(this.config.id, perceptionTags, 3)

// Add to system prompt context:
const recallContext = recalled.length > 0
  ? `\n## Recalled Memories\n${recalled.map(r =>
      `- [${r.content_type}] "${r.text_content}" (${r.relevance} associations)`
    ).join('\n')}`
  : ''
```

This gives the NPC environmental awareness of their own history. They reference
past work, past conversations, past experiences — all driven by tag overlap.

---

## Step 7: Lovable Feed UI (TASK-021)

**Lovable frontend** — new page/component:

```
/feed — NPC Social Feed

┌──────────────────────────────────────────┐
│  NPC Gallery         [All] [Clara] [Seer]│
├──────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ 📷      │  │ 📷      │  │ 📷      │  │
│  │ sunset  │  │ portrait│  │ forest  │  │
│  │         │  │         │  │         │  │
│  ├─────────┤  ├─────────┤  ├─────────┤  │
│  │Clara    │  │Clara    │  │Clara    │  │
│  │"Golden  │  │"Light   │  │"Shadow  │  │
│  │ hour.." │  │ plays.."│  │ dance.."│  │
│  │ ♡ 12    │  │ ♡ 8     │  │ ♡ 3     │  │
│  └─────────┘  └─────────┘  └─────────┘  │
└──────────────────────────────────────────┘
```

**Data source:** Direct Supabase query from Lovable frontend:
```typescript
const { data: posts } = await supabase
  .from('npc_posts')
  .select('*, npc_content(*)')
  .order('created_at', { ascending: false })
  .limit(20)
```

**Like/Approve button:** Updates `approved: true` and increments `likes`.

**Instagram bridge (toggle):** A Supabase Edge Function or background job that:
1. Queries `npc_posts where approved = true and posted_externally = false`
2. Posts to Instagram via Meta Graph API
3. Sets `posted_externally = true`

Deferred to a separate task — just ensure the `posted_externally` flag is ready.

---

## Step 8: Fragment System (Future Task)

Not included in TASK-019/020/021. Designed here for reference.

**Fragment items:** RPGJS database items with custom data:

```typescript
@Item({
  id: 'lens-fragment',
  name: 'Lens Fragment',
  description: 'A shard that refracts light into stories.',
  consumable: true,
})
export class LensFragment {}
```

**`interpret_fragment` skill:**

```typescript
export const interpretFragmentSkill: IAgentSkill = {
  name: 'interpret_fragment',
  description: 'Read a fragment and reveal its meaning',
  parameters: {
    fragment_id: { type: 'string', required: true },
  },
  async execute(params, context): Promise<SkillResult> {
    // 1. Load fragment from Supabase
    // 2. If past fragment: recall(fragment.tags) → surface existing content
    // 3. If future fragment: generate new content using fragment.tags as prompt seeds
    // 4. Store interpretation in player_fragments
    // 5. Return narrative result
  },
}
```

**Starter fragment choice:** New player hook (`onConnected` or first `onJoinMap`)
presents 3 fragment options. Choice stored in player variables.

---

## Architecture Notes

- **ContentStore is separate from AgentMemory** — AgentMemory handles conversation
  history (text messages). ContentStore handles created artifacts (images, posts).
  They complement each other.
- **Tags are free-form strings** for MVP. No controlled vocabulary. If tag noise
  becomes a problem, add an LLM-powered tag normalization step later.
- **Graceful degradation** — if Supabase is unavailable, content creation still
  works (images still generated), just not stored or recallable. Same fallback
  pattern as SupabaseAgentMemory.
- **Token budget for recall** — 3 recalled items at ~50 tokens each = ~150 tokens.
  Fits within existing perception + memory budget.
