# Idea Synthesis: The Unified System

**Date**: 2026-02-13
**Author**: Claude Code (Orchestrator)

This document weaves all 11 idea docs together into one coherent system, identifies
gaps, proposes fixes, and introduces fresh ideas.

---

## Part 1: How It All Connects

When you step back, all the ideas form a single loop:

```
                    ┌─────────────────────┐
                    │    LIFESPAN CYCLE    │
                    │  (context window)    │
                    └──────────┬──────────┘
                               │
              ┌────────────────▼───────────────┐
              │         NPC IS "BORN"          │
              │  Loads: personality (YAML)     │
              │         soul (Supabase recall) │
              │         capabilities (profile) │
              └────────────────┬───────────────┘
                               │
              ┌────────────────▼───────────────┐
              │         NPC LIVES              │
              │  Perceives → Thinks → Acts     │
              │  Creates content (API skills)  │
              │  Stores tagged memories        │
              │  Posts to social feed          │
              │  Interacts with players        │
              └────────────────┬───────────────┘
                               │
              ┌────────────────▼───────────────┐
              │      LIFESPAN ENDS             │
              │  Context fills / resets        │
              │  Evaluation scores recorded    │
              │  Profile updated               │
              │  "Era" metrics aggregated      │
              └────────────────┬───────────────┘
                               │
              ┌────────────────▼───────────────┐
              │      WORLD RENDERS             │
              │  Tilesets restyle from metrics  │
              │  Task assignments recalculate  │
              │  Fragments generated           │
              └────────────────┬───────────────┘
                               │
                               └──────► (next lifespan)
```

**The key insight**: Every idea is a different facet of this loop.

| Idea | Role in the loop |
|------|------------------|
| 01 (Vision) | The game world IS the coordination layer |
| 05 (LLM Gateway) | Controls thinking cost per tick |
| 06 (Supabase) | The "soul" that persists across lifespans |
| 07 (Session Recorder) | Players teach NPCs new behaviors |
| 08 (API-as-Identity) | What NPCs DO — their purpose |
| 09 (Social/Memory/Fragments) | What NPCs REMEMBER and CREATE |
| 10 (Evaluation) | How NPCs are MEASURED and ASSIGNED |
| 11 (Context/Rendering/Shared DB) | The METAPHYSICS — time, death, rebirth |

---

## Part 2: The Gaps

### Gap 1: Generated Image URLs Expire (Critical)

Every content pipeline breaks without persistent image storage. Image-generation APIs (we use **Gemini**) may return URLs that expire. This affects:
- Photographer NPC output (TASK-018)
- Content Store entries (TASK-019)
- Social feed images (TASK-021)
- Fragment visuals (future)
- Tileset rendering (idea 11)

**Fix**: Add a Supabase Storage step to the `generate_image` skill.

```typescript
// In generate-image skill, after Gemini (or other) image API returns:
const imageUrl = response.url  // or equivalent from Gemini image API
const imageBuffer = await fetch(imageUrl).then(r => r.arrayBuffer())
const path = `npc-content/${agentId}/${Date.now()}.png`
const { data } = await supabase.storage.from('npc-images').upload(path, imageBuffer)
const permanentUrl = supabase.storage.from('npc-images').getPublicUrl(path).data.publicUrl
// Store permanentUrl in npc_content, not the ephemeral API URL
```

This should be a prerequisite step added to TASK-018 or a small standalone task.

---

### Gap 2: Memory Fragmentation (Architectural)

An NPC's "experience" is scattered across three unconnected stores:

| Store | Contains | Searched by |
|-------|----------|-------------|
| `agent_memory` | Conversation history | AgentRunner (always) |
| `npc_content` | Created content + tags | Associative recall (TASK-020) |
| `agent_test_results` | Evaluation scores | ProfileManager (TASK-024) |

**Problem**: When an NPC recalls memories, it only searches `npc_content`. It can't
recall "that conversation where a player asked about mountains" because conversation
history isn't tagged or searchable by perception.

**Fix**: Unified Retrieval Layer.

```typescript
interface UnifiedMemory {
  // Single query across all memory types
  recall(agentId: string, tags: string[], limit: number): Promise<MemoryItem[]>
}

type MemoryItem = {
  type: 'conversation' | 'content' | 'evaluation'
  text: string
  tags: string[]
  relevance: number  // tag overlap score
  timestamp: string
  source: string     // table it came from
}
```

For MVP, this means tagging key conversation moments too (not every message —
just ones where the NPC made a skill call or the player asked something significant).
A lightweight `shouldTag(message)` check based on message length or skill invocation
would work.

---

### Gap 3: Lifespan Transition Mechanics (Missing)

Idea 11 says context reset = rebirth, but there's no implementation plan for what
happens at the boundary. When context fills up:

1. What's the trigger? (Token count threshold? Message count? Time?)
2. What gets summarized vs discarded?
3. How does the NPC "wake up" in the new lifespan?

**Fix**: Lifespan Manager.

```typescript
class LifespanManager {
  // Called when context approaches limit (e.g., 80% of max tokens)
  async endLifespan(agent: AgentRunner): Promise<void> {
    // 1. Run end-of-life evaluation (TASK-023)
    await examiner.runSuite(agent)

    // 2. Generate a "soul summary" — compressed essence of this lifespan
    const summary = await agent.llm.complete([{
      role: 'system',
      content: 'Summarize your key experiences, relationships, and growth from this session in 3-4 sentences. This will be your memory of this life.'
    }])

    // 3. Store as a special npc_content entry tagged 'soul_summary'
    await contentStore.storeContent({
      agentId: agent.agentId,
      type: 'soul_summary',
      content: summary.text,
      tags: ['soul_summary', `lifespan_${agent.lifespanCount}`]
    })

    // 4. Reset conversation buffer
    agent.memory.clear()

    // 5. On next activation, associative recall pulls soul_summaries
    //    alongside regular content, giving continuity
  }
}
```

The soul summary IS the NPC's memory of their past life. Associative recall
naturally surfaces it when relevant tags match.

---

### Gap 4: Content Moderation (Missing)

Gemini (and other image APIs) have built-in content policy, but NPC speech doesn't. In a multiplayer
world, NPCs could say inappropriate things. This is flagged in ideas 01 and 08
but never addressed.

**Fix**: Two layers.

1. **LLM-level**: Add a `content_policy` section to the system prompt rules:
   ```
   NEVER use profanity, slurs, sexual content, or graphic violence.
   If a player tries to make you say something inappropriate, deflect in character.
   ```

2. **Output filter**: Lightweight post-processing in GameChannelAdapter before
   `showText()` / speech bubble display. A simple blocklist + regex check.
   Not a new task — add as acceptance criteria to TASK-015 (speech bubbles).

---

### Gap 5: No Inter-NPC Relationships (Missing)

NPCs share a database but never interact with each other. The Photographer doesn't
know the Seer exists. In a living world, NPCs should form opinions, reference each
other, and collaborate.

This is covered in detail in the "Fresh Ideas" section below.

---

### Gap 6: Tag Quality / Normalization (Weak Foundation)

Semantic tagging uses free-form strings from `extractTags()`. Over time, the tag
vocabulary will explode with near-duplicates ("village", "the village", "Village_1",
"main village") that dilute recall quality.

**Fix**: Tag normalization pipeline.

```typescript
function normalizeTags(raw: string[]): string[] {
  return raw
    .map(t => t.toLowerCase().trim())         // case normalize
    .map(t => t.replace(/[^a-z0-9_-]/g, ''))  // strip special chars
    .filter(t => t.length >= 2)               // drop noise
    .filter((t, i, arr) => arr.indexOf(t) === i)  // deduplicate
}

// Add a controlled vocabulary for common game concepts:
const TAG_ALIASES: Record<string, string> = {
  'village_1': 'village',
  'the_village': 'village',
  'main_village': 'village',
  // ... populated as patterns emerge
}
```

Add this to PerceptionEngine.extractTags() in TASK-019. Not a separate task —
just a quality gate.

---

### Gap 7: Examiner Memory Pollution (Design Flaw)

When ExaminerNPC runs tests (TASK-023), it injects events with `playerId: 'examiner'`
into the agent's normal runner. These test interactions get stored in `agent_memory`
alongside real player conversations. The NPC might later recall "The Elder asked me
to describe a scene" as a real memory.

**Fix**: Evaluation sandbox mode.

```typescript
// In ExaminerNPC.runTest():
const sandboxMemory = new InMemoryAgentMemory()  // throwaway
const sandboxRunner = agent.clone({ memory: sandboxMemory })
const result = await sandboxRunner.run(event)
// Real agent memory is untouched
```

This requires AgentRunner to support a `clone()` method that creates a copy with
a different memory backend. Lightweight — just construct a new AgentRunner with the
same config but different memory.

---

### Gap 8: No Player-NPC Relationship Tracking (Missing)

Players interact with NPCs repeatedly, but NPCs don't track relationship state.
The Photographer doesn't know "this player has visited me 5 times and always asks
for portraits" vs "this is a first-time visitor."

This connects to the Fresh Ideas section below.

---

## Part 3: Fresh Ideas

### Idea A: NPC Social Graph — NPCs That Know Each Other

**The gap it fills**: NPCs are isolated agents sharing a database but unaware of
each other.

**How it works**: Add a `npc_relationships` table:

```sql
create table npc_relationships (
  agent_id      text not null,
  target_id     text not null,       -- another NPC
  familiarity   float default 0,     -- 0-100, based on proximity/interaction
  opinion       text default 'neutral', -- 'positive', 'neutral', 'wary'
  last_interaction timestamptz,
  notes         text,                -- LLM-generated impression
  primary key (agent_id, target_id)
);
```

**Familiarity grows from**:
- Shared map presence (PerceptionEngine already detects nearby entities)
- Content overlap (tags in common via ContentStore)
- Player mentions ("the photographer told me to visit you")

**What this enables**:
- Clara says "Oh, you've been talking to the Seer? She's... intense."
- NPCs recommend each other: "For that, you should visit Melody at the tavern."
- NPC gossip: idle tick behavior includes commenting on other NPCs' recent posts
- Collaborative content: the Musician writes a song about the Photographer's latest work

**System prompt injection**: Add a "People You Know" section between personality
and perception, listing familiar NPCs with one-line opinions.

---

### Idea B: Player Reputation System — NPCs Remember You

**The gap it fills**: Players are strangers every conversation despite repeat visits.

**How it works**: Add a `player_reputation` table:

```sql
create table player_reputation (
  player_id     text not null,
  agent_id      text not null,
  visits        integer default 0,
  trust         float default 50,    -- 0-100
  title         text,                -- LLM-assigned nickname
  last_visit    timestamptz,
  primary key (player_id, agent_id)
);
```

**Reputation builds from**:
- Visit count (incremented each `player_action` event)
- Token spending (used services → trust increases)
- Fragment completion (brought fragments to the Seer → trust increases)
- Behavior quality (polite/helpful → trust up, rude/spammy → trust down — scored
  by LLM at end of conversation)

**What this enables**:
- "Welcome back, traveler. I saved something special for you."
- Trust thresholds unlock NPC behaviors (trust >= 80 → NPC shares a secret/fragment)
- NPCs give regulars nicknames: "Ah, the Portrait Collector returns!"
- Pricing tiers: trusted players get more generous token costs
- NPCs warn each other about problematic players (via social graph)

**Trust score in system prompt**: "This player has visited you 7 times. You trust
them (82/100). You call them 'Shadow Walker'."

---

### Idea C: NPC Dreams — The Lifespan Bridge

**The gap it fills**: Lifespan transitions are abrupt. No narrative continuity
between context resets.

**How it works**: When a lifespan ends (Gap 3 fix above), instead of just storing
a soul summary, generate a **dream sequence** — a short creative piece that blends
the NPC's key experiences with their personality.

```typescript
async function generateDream(agent: AgentRunner, soulSummary: string): Promise<string> {
  const dream = await agent.llm.complete([{
    role: 'system',
    content: `You are ${agent.personality.name}. You are falling asleep after a long day.
Generate a dream that weaves together your recent experiences into a surreal, poetic
fragment (3-5 sentences). This dream will become a memory you carry forward.`
  }, {
    role: 'user',
    content: `Your experiences today: ${soulSummary}`
  }])
  return dream.text
}
```

**What this enables**:
- Dreams become content in the ContentStore (tagged, recallable, postable)
- The Photographer's dreams are visual → generate a Gemini image of the dream
- Dreams show up in the social feed as a special post type ("Clara dreamed...")
- Past Fragments could BE dream fragments from previous lifespans
- Players can ask NPCs "What did you dream about?" → NPC recalls dream content

**Why it matters**: This turns a technical limitation (context reset) into a
narrative feature. NPCs don't just forget and restart — they dream, and dreams
carry forward as a form of persistent memory.

---

### Idea D: The Chronicle — An Observer NPC

**The gap it fills**: Nobody documents what happens in the world. Events happen
and fade.

**How it works**: A special NPC ("The Chronicler") whose API-as-Identity skill is
**writing**. Instead of generating images or music, the Chronicler writes about
what's happening in the world.

**Behavior**:
- Idle tick: queries `npc_content` and `npc_posts` for recent activity across
  ALL NPCs. Generates a short entry: "Day 14: Clara captured an image of the
  waterfall today. Meanwhile, the Seer spoke of shadows to a curious traveler."
- Proximity trigger: if a player approaches, the Chronicler shares recent entries
- Periodic synthesis: every N lifespans, generates a "chapter" summarizing the era

**The Chronicle IS the rendered time**. When tileset rendering (idea 11) asks "what
era are we in?", the Chronicle's aggregated entries provide the narrative context
alongside the numeric metrics.

**What this enables**:
- A living history of the world that players can read
- The rendering metrics gain narrative meaning (the Chronicler explains WHY
  prosperity dropped — "few visitors came this week")
- The Chronicler's posts appear in the social feed as "World Updates"
- Other NPCs can recall Chronicle entries via tag overlap — creating shared
  cultural knowledge

No new API integration needed — the Chronicler's skill is just `create_post`
using LLM text generation (already available via the conversation model). Pure
content creation from observation.

---

### Idea E: Emergent Economy — NPCs Trade Services

**The gap it fills**: Token economy is currently player→NPC only. NPCs don't
interact economically.

**How it works**: Extend the token/service system so NPCs can request services
from each other through the LaneQueue.

**Example flow**:
1. The Musician wants album art → creates a service request
2. AgentManager routes the request to the Photographer as an AgentEvent
3. The Photographer generates an image → stores in ContentStore
4. The Musician receives the image reference → uses it in their next post
5. Transaction logged in `npc_transactions` table

```sql
create table npc_transactions (
  id            uuid primary key default gen_random_uuid(),
  requester_id  text not null,
  provider_id   text not null,
  service       text not null,           -- 'generate_image', 'create_music'
  request       text,                    -- what was asked
  result_id     uuid references npc_content,  -- what was delivered
  status        text default 'pending',  -- pending, completed, failed
  created_at    timestamptz default now()
);
```

**What this enables**:
- NPCs develop working relationships (feeds into Social Graph, Idea A)
- Content becomes richer — collaborative works tagged with both creators
- Economy emerges: NPCs that produce popular content get more requests
- Players observe NPC-to-NPC interactions happening in the world
- Stage 4 of idea 08 (Multi-API Ecosystem) happens naturally

---

### Idea F: Adaptive Difficulty via Agent Profiles

**The gap it fills**: The evaluation system (idea 10) measures NPCs but doesn't
adapt the game experience.

**How it works**: Agent profiles inform not just task assignment but also how NPCs
challenge players.

- An NPC with high `reasoning` score gives harder puzzles to advanced players
- An NPC with high `social` score handles multiple players in the same
  conversation gracefully
- An NPC with low `creativity` sticks to scripted responses more often (hybrid
  mode: LLM for conversation, but pre-written for creative tasks)

**The evaluation becomes self-regulating**: NPCs naturally gravitate toward
behaviors they score well on, because:
1. Profile scores determine available tasks (TASK-025)
2. System prompt includes capabilities (TASK-025)
3. NPCs preferentially use their strengths
4. Performance improves → scores improve → more tasks unlocked

This creates emergent specialization without explicit programming.

---

## Part 4: Proposed Priority for Gap Fixes

| Priority | Gap/Idea | Effort | Impact | When |
|----------|----------|--------|--------|------|
| **P0** | Gap 1: Supabase Storage for images | Small | Unblocks all content | Add to TASK-018 |
| **P0** | Gap 4: Content moderation in prompts | Tiny | Safety | Add to TASK-015 |
| **P1** | Gap 3: Lifespan Manager + soul summaries | Medium | Enables the lifecycle | New task |
| **P1** | Gap 6: Tag normalization | Small | Quality of recall | Add to TASK-019 |
| **P1** | Gap 7: Evaluation sandbox mode | Small | Data integrity | Add to TASK-023 |
| **P1** | Idea B: Player reputation | Medium | Relationship depth | New task |
| **P2** | Gap 2: Unified Memory Layer | Medium | Richer recall | New task |
| **P2** | Idea A: NPC Social Graph | Medium | World feels alive | New task |
| **P2** | Idea C: NPC Dreams | Small | Narrative continuity | Bundle with Gap 3 |
| **P2** | Idea D: The Chronicle | Small | World history | New YAML config |
| **P3** | Idea E: NPC-to-NPC economy | Large | Emergent behavior | Future sprint |
| **P3** | Idea F: Adaptive difficulty | Medium | Player experience | After evaluation |

---

## Part 5: The Revised Unified Architecture

After filling gaps and adding fresh ideas, the complete system looks like this:

```
┌──────────────────────────────────────────────────────────────────┐
│                        GAME WORLD (RPGJS)                       │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ Photographer│  │    Seer    │  │  Musician  │  │ Chronicler│  │
│  │  (Gemini)   │  │(Gemini/Rwy)│  │(Suno/Udio) │  │ (Writer)  │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬─────┘  │
│        │               │               │               │        │
│  ┌─────▼───────────────▼───────────────▼───────────────▼─────┐  │
│  │                    AGENT LAYER                             │  │
│  │  AgentRunner → LLM Gateway → Skills → LaneQueue          │  │
│  │  PerceptionEngine → Unified Memory → Profile Manager      │  │
│  │  Lifespan Manager → Dream Generator → Content Store       │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │                    SHARED SUPABASE                         │  │
│  │  agent_memory │ npc_content │ content_tags │ npc_posts    │  │
│  │  agent_profiles │ agent_test_results │ agent_tests        │  │
│  │  player_reputation │ npc_relationships │ npc_transactions │  │
│  │  player_state │ fragments │ player_fragments              │  │
│  │  npc-images (Storage bucket)                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    Players     │  │  Examiner NPCs  │  │  World Renderer │  │
│  │  (real humans) │  │  (scripted)     │  │  (tileset AI)   │  │
│  └────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         │                                          │
         ▼                                          ▼
┌─────────────────┐                      ┌─────────────────────┐
│  Lovable Frontend│                      │   External APIs     │
│  - Social Feed   │                      │   - Gemini (image,  │
│  - Eval Dashboard│                      │     video, audio)   │
│  - Game iframe   │                      │   - Kimi (chat)     │
│  - Fragment view │                      │   - Custom: Suno,   │
│                 │                      │     Udio, Instagram │
└─────────────────┘                      └─────────────────────┘
```

---

## Part 6: What's NOT Missing (Strengths to Preserve)

1. **Diegetic design** — Every technical system is wrapped in game fiction. Don't break this.
2. **Interface-driven architecture** — IAgentMemory, IAgentSkill, ILLMClient. Keep swapping implementations, never changing interfaces.
3. **LaneQueue serialization** — One thing at a time per NPC. This prevents every race condition. Don't add parallelism.
4. **YAML-driven NPC configuration** — Adding a new NPC = adding a YAML file. No code changes. Preserve this.
5. **Incremental buildability** — Each idea works independently. Don't create hard dependencies between systems that don't need them.
