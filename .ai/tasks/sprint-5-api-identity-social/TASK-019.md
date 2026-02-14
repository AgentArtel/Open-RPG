## TASK-019: NPC Content Store + Semantic Tagging + Social Posts

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 6 (API-Powered Skills)
- **Type**: Create + Modify
- **Depends on**: TASK-012 (Supabase client), TASK-018 (generate_image skill)
- **Blocks**: TASK-020 (Associative Recall), TASK-021 (Lovable Feed UI)

### Context

When NPCs create content (images via Gemini, text, conversations), that content
disappears. There's no way to recall it, browse it, or build on it. This task
creates the storage and tagging infrastructure that makes NPC-created content
persistent, searchable, and shareable.

Every piece of content gets semantic tags derived from the NPC's perception (map,
entities, time) and the content itself (keywords from prompts/captions). These tags
power the associative recall system (TASK-020) and the social feed (TASK-021).

### Objective

A `ContentStore` service that stores NPC-created content in Supabase with semantic
tags, a `create_post` skill for NPCs to share content to a social feed, and auto-tag
integration into the `generate_image` skill.

### Specifications

**Create files:**
- `supabase/migrations/003_npc_content.sql` — Three tables: `npc_content`, `content_tags`, `npc_posts`
- `src/agents/memory/ContentStore.ts` — Store, tag, recall, and post content (~120 lines)
- `src/agents/skills/skills/create-post.ts` — `create_post` skill for NPCs

**Modify files:**
- `src/agents/perception/PerceptionEngine.ts` — Add `extractTags()` method
- `src/agents/skills/skills/generate-image.ts` — Store content + tags after image-generation call
- Skill registration entry point — Register `create_post` skill

**Database Schema (`003_npc_content.sql`):**

```sql
create table npc_content (
  id             uuid primary key default gen_random_uuid(),
  agent_id       text not null,
  content_type   text not null,
  url            text,
  text_content   text,
  source_context jsonb default '{}',
  created_at     timestamptz default now()
);

create table content_tags (
  content_id  uuid references npc_content on delete cascade,
  tag         text not null,
  confidence  float default 1.0,
  source      text default 'perception',
  primary key (content_id, tag)
);

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

create index idx_content_tags_tag on content_tags(tag);
create index idx_npc_content_agent on npc_content(agent_id);
create index idx_npc_posts_agent on npc_posts(agent_id);
```

**ContentStore (`src/agents/memory/ContentStore.ts`):**

Methods:
- **`storeContent(params)`** — Insert into `npc_content` + batch insert tags into `content_tags`. Returns content ID.
- **`recall(agentId, tags, limit)`** — Tag-overlap query: find content where tags match, ranked by overlap count + recency. Returns `ContentRow[]`.
- **`createPost(params)`** — Insert into `npc_posts` linking to a content ID.
- **`getRecentPosts(agentId?, limit?)`** — Fetch posts for feed display.

Graceful degradation: if Supabase is unavailable, log and return empty results (never throw).

**Tag Extraction (`PerceptionEngine.extractTags()`):**

```typescript
extractTags(snapshot: PerceptionSnapshot): string[] {
  const tags: string[] = []
  tags.push(snapshot.location.map)       // 'village_square'
  tags.push(snapshot.time)               // 'afternoon'
  for (const entity of snapshot.nearby) {
    tags.push(entity.name.toLowerCase()) // 'player_alex'
    tags.push(entity.type)               // 'player'
  }
  return [...new Set(tags)]
}
```

**generate_image Integration:**

After the image-generation API returns a URL, store in ContentStore:

```typescript
const perceptionTags = perceptionEngine.extractTags(currentSnapshot)
const promptWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3)
const allTags = [...new Set([...perceptionTags, ...promptWords])]

await contentStore.storeContent({
  agentId: context.agentId,
  contentType: 'image',
  url: imageUrl,
  textContent: prompt,
  tags: allTags,
  sourceContext: currentSnapshot,
})
```

**`create_post` Skill:**

```typescript
export const createPostSkill: IAgentSkill = {
  name: 'create_post',
  description: 'Share your latest creation on the village board for all to see',
  parameters: {
    caption: { type: 'string', description: 'Caption for your post', required: true },
  },
  async execute(params, context): Promise<SkillResult> {
    // 1. Query most recent npc_content for this agent
    // 2. Create npc_posts row linking to it
    // 3. Return confirmation
  },
}
```

### Acceptance Criteria

- [ ] SQL migration creates `npc_content`, `content_tags`, `npc_posts` tables with indexes
- [ ] `ContentStore.storeContent()` inserts content + tags in Supabase
- [ ] `ContentStore.recall()` returns content ranked by tag overlap count
- [ ] `ContentStore.createPost()` creates a post linked to content
- [ ] `PerceptionEngine.extractTags()` returns deduplicated tag array from snapshot
- [ ] `generate_image` skill auto-stores content + tags after successful image-generation call
- [ ] `create_post` skill registered and available in YAML config
- [ ] Graceful degradation: no crash when Supabase is unavailable
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Build the Lovable feed UI (that's TASK-021)
- Implement the recall injection into AgentRunner (that's TASK-020)
- Add fragment tables or skills (future task)
- Use pgvector embeddings — simple tag counting is sufficient for MVP
- Download/persist generated images to Supabase Storage (post-MVP; we use Gemini for image gen)
- Build real Instagram API integration (deferred)

### Reference

- Feature idea: `.ai/idea/09-npc-social-memory-fragments.md`
- Implementation plan: `.ai/idea/09a-social-memory-fragments-implementation-plan.md`
- ContentStore pattern: similar to `SupabaseAgentMemory` (write-behind, graceful fallback)
- Supabase client: `src/config/supabase.ts`
- PerceptionEngine: `src/agents/perception/PerceptionEngine.ts`
- generate_image skill: `src/agents/skills/skills/generate-image.ts` (TASK-018)

### Handoff Notes

_(To be filled by implementer)_
