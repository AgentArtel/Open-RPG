## TASK-020: Associative Recall + Environment-Driven Memory

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 6 (API-Powered Skills)
- **Type**: Modify
- **Depends on**: TASK-019 (ContentStore + tagging)
- **Blocks**: Fragment Quest System (future)

### Context

TASK-019 stores NPC-created content with semantic tags. This task makes NPCs
*use* that stored content by recalling it when their environment contains matching
tags. The NPC's perception is converted to tags, those tags are matched against
stored content, and the most relevant content is injected into the LLM prompt.

The key insight: same environment → same tags → same memories → stable personality.
New environment → new tags → different memories → personality evolves naturally.

### Objective

Wire the ContentStore recall query into the AgentRunner so NPCs reference their
own past creations and experiences in conversation. When Clara is in the village
square where she photographed a sunset yesterday, she remembers and mentions it.

### Specifications

**Modify files:**
- `src/agents/core/AgentRunner.ts` — Add recalled content to system prompt context
- `src/agents/memory/ContentStore.ts` — Add optional tag formatting helper

**AgentRunner Recall Integration:**

In the `run()` method, after generating the perception snapshot and before building
the system prompt:

```typescript
// Extract tags from current perception
const perceptionTags = perceptionEngine.extractTags(snapshot)

// Recall matching content (max 3 items, ~150 tokens)
const recalled = await contentStore.recall(this.config.id, perceptionTags, 3)

// Format for system prompt injection
const recallSection = recalled.length > 0
  ? `\n## Your Memories\nThese past experiences feel relevant right now:\n${
      recalled.map(r => {
        const typeLabel = r.content_type === 'image' ? '📷 Photo' : '📝 Note'
        return `- ${typeLabel}: "${r.text_content}" (${r.relevance} associations)`
      }).join('\n')
    }`
  : ''
```

Insert `recallSection` into the system prompt between perception and conversation
memory. The LLM sees it as part of the NPC's inner experience.

**ContentStore.recall() Enhancement:**

Ensure the recall method returns content with a `relevance` score:

```typescript
interface RecalledContent {
  id: string
  contentType: string
  url?: string
  textContent?: string
  relevance: number        // tag overlap count
  createdAt: string
}
```

**Prompt Architecture (after this task):**

```
[System Prompt]
1. Personality (from YAML)
2. Current Perception (snapshot)
3. Your Memories (recalled content — NEW)
4. Recent Conversation (from AgentMemory)
5. Rules / Instructions
```

The recalled memories sit between perception and conversation, bridging what the
NPC sees NOW with what they've experienced BEFORE.

### Acceptance Criteria

- [ ] AgentRunner extracts perception tags before each LLM call
- [ ] AgentRunner queries ContentStore.recall() with perception tags
- [ ] Recalled content injected into system prompt as "Your Memories" section
- [ ] NPC references past content in conversation when relevant tags match
- [ ] Empty recall (no matches) adds no extra tokens to prompt
- [ ] Recall limited to 3 items (~150 tokens) to stay within budget
- [ ] Graceful degradation: if ContentStore query fails, recall section is empty (no crash)
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Modify the ContentStore tables (TASK-019 handles schema)
- Add pgvector embeddings or semantic similarity (tag counting is sufficient)
- Add identity pillars or weighted tags (post-MVP enhancement)
- Build fragment interpretation (future task)
- Change the `IAgentMemory` interface — recall is a ContentStore concern, not conversation memory

### Reference

- Feature idea: `.ai/idea/09-npc-social-memory-fragments.md`
- Implementation plan: `.ai/idea/09a-social-memory-fragments-implementation-plan.md`
- ContentStore: `src/agents/memory/ContentStore.ts` (TASK-019)
- AgentRunner: `src/agents/core/AgentRunner.ts`
- PerceptionEngine: `src/agents/perception/PerceptionEngine.ts`

### Handoff Notes

_(To be filled by implementer)_
