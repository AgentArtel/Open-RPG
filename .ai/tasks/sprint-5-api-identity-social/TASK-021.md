## TASK-021: Lovable Feed UI + Instagram Bridge

- **Status**: PENDING
- **Assigned**: lovable (frontend)
- **Priority**: P2-Medium
- **Phase**: 6 (API-Powered Skills)
- **Type**: Create
- **Depends on**: TASK-019 (npc_posts table in Supabase)
- **Blocks**: Real Instagram API integration (future)

### Context

NPCs create content and post it to the `npc_posts` Supabase table. This task
builds the frontend that makes those posts visible — an Instagram-style feed in
the Lovable frontend where you can browse NPC creations, filter by NPC, and
like/approve posts.

The Lovable frontend already exists as a separate app that embeds the RPGJS game
via iframe. This task adds a new page/component for the NPC social feed.

### Objective

A photo grid / feed page in the Lovable frontend showing NPC posts from Supabase.
Like button for human curation. `posted_externally` flag ready for future Instagram
bridge toggle.

### Specifications

**Create in Lovable frontend:**
- Feed page (`/feed` route or tab)
- Post card component (image, caption, NPC name, timestamp, like button)

**Feed Layout:**

```
┌──────────────────────────────────────────────┐
│  NPC Gallery           [All ▼] [Clara] [Seer]│
├──────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  🖼️      │  │  🖼️      │  │  🖼️      │   │
│  │          │  │          │  │          │   │
│  ├──────────┤  ├──────────┤  ├──────────┤   │
│  │ Clara    │  │ Clara    │  │ Seer     │   │
│  │ "Golden  │  │ "Shadow  │  │ "A vision│   │
│  │  hour.." │  │  dance.."│  │  of..."  │   │
│  │ 2h ago   │  │ 5h ago   │  │ 1d ago   │   │
│  │ ♡ 12  ✓  │  │ ♡ 3     │  │ ♡ 8  ✓   │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│                                              │
│  ┌──────────┐  ┌──────────┐                  │
│  │  🖼️      │  │  🖼️      │                  │
│  │  ...     │  │  ...     │                  │
│  └──────────┘  └──────────┘                  │
└──────────────────────────────────────────────┘
```

**Data Source:**

```typescript
// Supabase query from Lovable frontend
const { data: posts } = await supabase
  .from('npc_posts')
  .select(`
    id, agent_id, npc_name, caption, approved, likes, created_at,
    npc_content ( id, url, content_type, text_content )
  `)
  .order('created_at', { ascending: false })
  .limit(30)
```

**Like/Approve:**

```typescript
// On like button click
await supabase
  .from('npc_posts')
  .update({ approved: true, likes: currentLikes + 1 })
  .eq('id', postId)
```

Approved posts show a checkmark (✓). These are the posts that would be forwarded
to real Instagram if the bridge is toggled on.

**Filter by NPC:**

Dropdown or tab bar at the top. Filters the Supabase query by `agent_id`.

**Instagram Bridge (toggle — stretch goal):**

A simple toggle in the UI. When enabled, a Supabase Edge Function or cron job:
1. Queries `npc_posts where approved = true and posted_externally = false`
2. Posts to Instagram via Meta Graph API (requires Business account + token)
3. Sets `posted_externally = true`

For MVP, just ensure the `approved` and `posted_externally` flags work correctly.
The actual Instagram API integration can be a separate task.

### Acceptance Criteria

- [ ] Feed page shows NPC posts in a responsive grid
- [ ] Each post card displays: image, caption, NPC name, relative timestamp
- [ ] Like button increments `likes` and sets `approved: true` in Supabase
- [ ] Filter by NPC (dropdown or tabs)
- [ ] Empty state when no posts exist
- [ ] Supabase anon key used (read + limited write via RLS)
- [ ] Mobile-responsive layout
- [ ] `posted_externally` flag exists and is set-ready for future Instagram bridge

### Do NOT

- Build the real Instagram API integration (future task)
- Add comments or replies on posts (keep it simple)
- Add user authentication (public feed for MVP)
- Modify the game server or RPGJS code — this is frontend-only
- Add real-time subscriptions (polling or refresh is fine for MVP)

### Reference

- Feature idea: `.ai/idea/09-npc-social-memory-fragments.md`
- Implementation plan: `.ai/idea/09a-social-memory-fragments-implementation-plan.md`
- Supabase schema: `supabase/migrations/003_npc_content.sql` (TASK-019)
- Existing Lovable frontend (embeds RPGJS game via iframe)
- Meta Graph API (Instagram): https://developers.facebook.com/docs/instagram-platform

### Handoff Notes

_(To be filled by implementer)_
