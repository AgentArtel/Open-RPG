# The Complete System: From Foundation to Living World

**Date**: 2026-02-13
**Purpose**: How every piece connects — what we have, what each layer adds,
and what the finished product looks and feels like.

---

## What Exists Today

Right now, the game is a working RPGJS v4 world with two AI NPCs (Elder Theron
and Test Agent) on a tile map. A player connects, walks around, presses Space
near an NPC, and the NPC thinks and responds via Moonshot Kimi. The full pipeline
works end-to-end:

```
Player presses Space
  → onAction() fires
  → GameChannelAdapter creates AgentEvent
  → LaneQueue serializes it
  → AgentRunner builds perception snapshot
  → System prompt assembled (personality + world + skills + memory + rules)
  → Kimi K2 generates response with tool calls
  → Skills execute (say, move, emote, look, wait)
  → Response displayed via showText()
  → Conversation stored in memory buffer
```

**What's real today**: 2 AI NPCs, 8 scripted NPCs, 2 maps, 14 tilesets, 5 skills,
builder dashboard (press B to place NPCs), YAML-driven config, LaneQueue
serialization, perception engine. Supabase schema written but running in-memory.

It works. It's a foundation. Now here's how each layer transforms it.

---

## Layer by Layer: How the System Grows

### Layer 1: Persistence (Sprint 3 — Active)

**What changes**: NPCs remember across server restarts. Player progress saves.

Before this layer, every restart wipes all NPC memory. Elder Theron forgets every
conversation. After this layer, conversations persist in Supabase. The NPC picks
up where it left off.

**The shift**: NPCs go from amnesiacs to beings with history.

```
Before: "Hello, traveler! Who are you?"  (every time)
After:  "Welcome back. Last time you asked about the mountain path."
```

---

### Layer 2: Polish + Deploy (Sprint 4 — Next)

**What changes**: NPCs feel alive in the world, and the world is accessible.

- **Speech bubbles** float above NPCs instead of blocking modal dialogs. NPCs
  mutter things on idle ticks without interrupting gameplay. Walk past the
  Photographer and she says "The light is perfect today..." in a bubble above
  her head. Only action-key conversations open full modals.

- **Conversation log** (press L) shows your history with every NPC. Scroll
  through past exchanges. Filter by NPC. See timestamps.

- **Railway deployment** puts the game online. Anyone with the URL can play.
  The Lovable frontend embeds the game in an iframe alongside the social feed
  and dashboard.

**The shift**: From dev prototype to playable product.

---

### Layer 3: API-as-Identity + Content (Sprint 5 — Backlog)

**What changes**: NPCs DO things. They create. They have purpose.

This is the biggest conceptual leap. Before this layer, NPCs only talk. After
it, they produce real artifacts:

- **The Photographer (Clara)** generates images via DALL-E when players describe
  scenes. "Can you capture the sunset over the village?" → Clara calls
  `generate_image` → real image appears, stored permanently in Supabase Storage,
  tagged with what's in it.

- **Content Store** holds everything NPCs create. Every image, every post, every
  dream — tagged with semantic labels extracted from the moment of creation.
  What map were they on? What time? Who was nearby? What was the prompt about?

- **Associative Recall** transforms NPC cognition. When Clara is near the
  waterfall and a player approaches, her perception tags ("waterfall", "village",
  "afternoon") pull up past content she created in similar conditions. Her system
  prompt now includes: "You previously captured an image of 'sunset reflections
  on water' near here." She references her own history naturally.

- **Social Feed** in the Lovable frontend shows NPC posts in an Instagram-style
  grid. Clara's photographs. Eventually, the Musician's compositions. The Seer's
  visions. Players browse, like, and the liked posts are the ones that matter
  (approval pipeline for optional real Instagram posting).

**The shift**: NPCs go from chatbots to artists. They have portfolios. They
have a creative history that shapes who they are.

**What a player experiences**:
> You walk up to Clara near the bridge. She says "I've been studying the light
> here — reminds me of that portrait session we did last week." You ask her to
> capture the bridge at dusk. She generates an image. It appears in her social
> feed. Other players see it. The Seer, on the other side of the map, will
> later recall that image when someone asks about the bridge.

---

### Layer 4: Evaluation + Specialization (Sprint 6 — Backlog)

**What changes**: NPCs have measurable capabilities that drive their behavior.

- **Examiner NPCs** (scripted, not AI) run structured tests against AI NPCs.
  Creativity challenges, logic puzzles, social scenarios, tool use exercises.
  Scored via LLM-as-judge in a sandboxed runner (so test conversations don't
  pollute real memory).

- **Performance profiles** aggregate scores across 6 dimensions: creativity,
  tool use, memory, social, reasoning, adaptability. Rolling averages track
  improvement over time.

- **Task assignment** becomes capability-driven. YAML configs specify minimum
  scores per task. An NPC that scores high on creativity and tool use gets
  assigned complex image generation requests. One that scores high on social
  handles group conversations. The system prompt tells the NPC what they're
  good at: "You excel at Creativity (92/100) and Social (85/100)."

- **Dashboard** in Lovable shows radar charts of each NPC's capabilities,
  improvement curves over time, side-by-side comparisons.

**The shift**: NPCs develop expertise. They know what they're good at. The
system routes work to the right NPC.

**What a player experiences**:
> You notice the Photographer has become more creative over time — her recent
> images are more imaginative. The evaluation dashboard shows her creativity
> score climbing from 65 to 92 over the past week. Meanwhile, the guard NPC
> has leveled up in reasoning and now gives genuinely useful navigation advice.

---

### Layer 5: Relationships + Reputation (Idea 12 proposals)

**What changes**: The world has social fabric.

- **Player Reputation**: NPCs track how many times you've visited, how you
  behave, and how much they trust you. Regular visitors get nicknames. Trust
  thresholds unlock new behaviors — an NPC with 80+ trust shares a secret,
  reveals a fragment location, or offers a special commission.

- **NPC Social Graph**: NPCs form opinions of each other based on shared map
  presence and content tag overlap. Clara knows the Seer exists because they're
  both on simplemap. She's seen the Seer's content in the feed. She has a
  one-line opinion: "The Seer speaks in riddles, but she sees true."

**What a player experiences**:
> You've visited Clara 12 times. She greets you by name — "Shadow Walker" —
> a nickname she gave you after your third portrait session. She says: "I heard
> the Seer has been asking about you. She's intense, but you might like what
> she has to show." Clara is recommending another NPC based on her social graph
> opinion and your reputation level.

---

### Layer 6: Lifespan + Dreams + The Chronicle (Ideas 11 + 12)

**What changes**: Time passes. The world has history. NPCs have generations.

- **Lifespan cycle**: When an NPC's context window fills (after enough
  conversations and idle ticks), the LifespanManager triggers:
  1. End-of-life evaluation (scores this lifespan's performance)
  2. Soul summary (compressed essence of key experiences)
  3. Dream generation (creative blend of experiences + personality)
  4. Context reset (new lifespan begins)
  5. On rebirth, associative recall pulls in soul summaries and dreams
     from past lives as the NPC's foundational memory

- **NPC Dreams**: The Photographer's dream might be: "I dreamed of a bridge
  made of light, where every traveler's face was a color I'd never seen."
  This dream gets stored as content, tagged, postable to the feed. If the
  Photographer later finds herself near a bridge, the dream resurfaces.
  Past Fragments in the quest system ARE dream fragments.

- **The Chronicler**: A special NPC whose purpose is observation and writing.
  On idle ticks, queries all recent NPC activity. Writes entries: "Day 14:
  Clara captured the waterfall three times today, each from a different angle.
  The Seer spoke of shadows to a curious traveler. The village feels quieter
  than last week." The Chronicle is the narrative backbone of the world.

- **Time as Rendering**: Aggregate metrics from game data (how many player
  visits, NPC content production, evaluation scores, transaction volume)
  feed into a style vector. The existing tileset images get restyled by AI:
  prosperous era = warm colors, blooming flowers. Decline = muted palette,
  overcast skies. Same tile grid, different visual era. The world literally
  looks different based on what's happened in it.

**What a player experiences**:
> You log in after a week away. The village looks different — warmer colors,
> flowers on the paths. The Chronicler tells you: "It's been a good era.
> Clara's work has drawn many visitors. The Seer found three fragments in
> the southern caves." You visit Clara and she says "I had the strangest
> dream — a bridge made of light. Want to help me find it?" She's referencing
> a dream from her previous lifespan, surfaced by associative recall because
> you're standing near the bridge.

---

### Layer 7: Fragments + Economy + Session Recording (Ideas 07, 08, 09)

**What changes**: The world has quests, progression, and NPC-to-NPC economy.

- **Fragment Quest System**: Players find or choose fragments — collectible
  items scattered in the world. Past Fragments surface existing NPC content
  (a dream, an old photograph, a chronicle entry). Future Fragments trigger
  new content generation (the Photographer creates a vision of something that
  hasn't happened yet). Bring fragments to the Seer for interpretation.
  Starter fragment choice (like Pokemon starters) shapes your initial
  relationship with the NPC ecosystem.

- **Token Economy**: API calls cost tokens. Players earn or find ImageGenTokens,
  MusicGenTokens, VisionTokens. Some are permanent (reusable), some consumable,
  some shared. NPCs check inventory before executing API skills. This creates
  natural progression: early game = conversations only, mid game = occasional
  image requests, late game = commissioning complex multi-NPC projects.

- **Emergent NPC Economy**: NPCs trade services. The Musician wants album art
  → requests from the Photographer → transaction logged → content tagged with
  both creators. NPCs that produce popular content get more requests. Working
  relationships deepen the social graph.

- **Session Recording**: Players can record their actions. Recordings become
  named workflows. Workflows get assigned to NPCs as daily jobs. A player
  demonstrates a patrol route → records it → labels it "Morning Patrol" →
  assigns it to the guard NPC. The guard now walks that route every morning
  using the same skill interface the LLM uses. Human play becomes NPC behavior.

**What a player experiences**:
> You find a glowing fragment in the caves. You bring it to the Seer. She
> examines it: "This is from Clara's dream — a bridge of light. It shows a
> future that hasn't happened yet." The fragment triggers Clara to generate
> a new image — the bridge as she dreamed it. The image appears in the feed.
> You chose this fragment over two others at the start of your journey, and
> it shaped which NPC's story you're now part of.

---

## The Full Stack

When every layer is active, here's the complete system:

```
┌─────────────────────────── PLAYER EXPERIENCE ────────────────────────────┐
│                                                                          │
│  Walk around → NPCs chat via speech bubbles → Press Space for dialogue   │
│  Press L for conversation log → Press B for builder dashboard            │
│  Find fragments → Bring to Seer → Unlock NPC content and stories        │
│  Browse social feed → Like NPC posts → See world history in Chronicle    │
│  Earn tokens → Commission NPC services → Watch NPCs trade with each other│
│  Notice the world's colors changing based on what's happening in it      │
│                                                                          │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────────┐
│                            NPC LIFECYCLE                                 │
│                                                                          │
│  BIRTH: Load personality (YAML) + soul memories (Supabase recall)        │
│         + capability profile (evaluation scores) + relationships         │
│                     │                                                    │
│  LIFE:  Perceive (PerceptionEngine snapshots every context)              │
│         Think (LLM via Gateway — cheap model idle, smart model convo)    │
│         Act (Skills: say, move, emote, generate_image, create_post...)   │
│         Remember (tagged content stored, conversations buffered)         │
│         Relate (reputation with players, opinions of other NPCs)         │
│         Create (API skills produce real content: images, music, text)    │
│         Trade (request services from other NPCs, collaborative works)   │
│                     │                                                    │
│  EVALUATION: Examiner NPCs test capabilities (sandboxed)                │
│              Scores update profile → tasks reassigned                    │
│              System prompt updated with self-awareness                   │
│                     │                                                    │
│  DEATH: Context fills → soul summary generated → dream created           │
│         Lifespan metrics feed into world rendering                       │
│         Chronicle records the era                                        │
│                     │                                                    │
│  REBIRTH: New context → recall pulls soul summaries + dreams             │
│           NPC continues with persistent identity, evolved capabilities   │
│                                                                          │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────────┐
│                          DATA LAYER (Supabase)                           │
│                                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │agent_memory  │  │ npc_content  │  │ agent_tests  │  │  fragments  │  │
│  │ conversations│  │ tagged media │  │  test defs   │  │  quest items│  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
│         │                │                  │                 │         │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌──────▼───────┐  ┌─────▼───────┐ │
│  │content_tags │  │  npc_posts   │  │ test_results │  │player_frags │ │
│  │ semantic    │  │  social feed │  │  scores      │  │ inventory   │ │
│  └─────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │agent_profiles│  │player_reputa-│  │npc_relation- │  │player_state│ │
│  │ capabilities │  │tion (trust)  │  │ships (graph) │  │ progress   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ npc-images (Storage bucket) — persistent media from all NPCs   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  All NPCs read the same data. Different personalities = different      │
│  interpretations. The database IS the shared world state.              │
└────────────────────────────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────────────┐
│                         FRONTENDS                                        │
│                                                                          │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐                  │
│  │  RPGJS Game  │  │ Social Feed   │  │  Eval Dash   │                  │
│  │  (iframe)    │  │ (Instagram    │  │  (radar      │                  │
│  │              │  │  clone)       │  │  charts)     │                  │
│  │  Walk, talk, │  │              │  │              │                  │
│  │  explore,    │  │  NPC posts,   │  │  Agent       │                  │
│  │  find frags  │  │  likes,       │  │  profiles,   │                  │
│  │              │  │  Chronicle    │  │  history,    │                  │
│  │              │  │  entries      │  │  comparison  │                  │
│  └──────────────┘  └───────────────┘  └──────────────┘                  │
│                                                                          │
│  All in Lovable frontend, backed by the same Supabase.                  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## The NPC's System Prompt at Full Maturity

When all layers are active, here's what gets assembled for every LLM call:

```
┌─────────────────────────────────────────────────────┐
│ 1. IDENTITY (from YAML)                             │
│    "You are Clara, the village photographer..."     │
│                                                     │
│ 2. YOUR CAPABILITIES (from evaluation profile)      │
│    "You excel at: Creativity (92), Tool Use (88)"   │
│    "You're developing: Reasoning (63)"              │
│                                                     │
│ 3. PEOPLE YOU KNOW (from social graph)              │
│    "The Seer — intense, speaks in riddles"           │
│    "The Musician — friendly, asks for album art"     │
│                                                     │
│ 4. THIS VISITOR (from reputation)                   │
│    "Shadow Walker. Visited 12 times. Trust: 82."    │
│    "Likes portraits. Last visit: 2 days ago."       │
│                                                     │
│ 5. CURRENT PERCEPTION (from PerceptionEngine)       │
│    "You're on simplemap near the bridge."            │
│    "Nearby: Shadow Walker (player), The Seer"       │
│    "Time: afternoon. Weather: clear."               │
│                                                     │
│ 6. YOUR MEMORIES (from associative recall)          │
│    "You previously captured 'sunset on water' here" │
│    "You dreamed of a bridge made of light"          │
│    "The Chronicler wrote about your waterfall series"│
│                                                     │
│ 7. RECENT CONVERSATION (from agent_memory)          │
│    [last N messages with this player]               │
│                                                     │
│ 8. AVAILABLE SKILLS (from profile-filtered tasks)   │
│    say, move, emote, generate_image, create_post    │
│                                                     │
│ 9. RULES                                            │
│    Content policy, response format, token limits    │
└─────────────────────────────────────────────────────┘
```

Every section comes from a different subsystem. Every subsystem feeds into this
prompt. The prompt IS the NPC's consciousness at that moment.

---

## How Value Compounds

The magic isn't any single feature — it's how they multiply each other:

**Content creation × Associative recall** = NPCs that reference their own work
naturally. Clara doesn't just generate images — she remembers them and builds
on them.

**Evaluation × Task assignment** = Self-improving NPCs. Low creativity score
→ fewer creative tasks → practice on simpler ones → scores improve → harder
tasks unlock. No manual tuning needed.

**Social graph × Content store** = NPC-to-NPC awareness. The Musician sees
Clara's latest photograph in the shared database and writes a song about it.
The Chronicler documents both.

**Lifespan × Dreams × Fragments** = Mortality as a feature. NPCs die and
are reborn. Their dreams become quest items. Players collect dream fragments
and bring them to the Seer. The Seer interprets them using the dead NPC's
content history. Death becomes narrative, not failure.

**Session recording × Skill interface** = Players teach NPCs new behaviors.
The same `IAgentSkill.execute()` that the LLM drives can be driven by a
recorded action sequence. The NPC doesn't know the difference.

**Reputation × Token economy** = Trust unlocks access. New players get basic
conversations. Regulars get commissions. Trusted players get fragments and
secrets. The NPC decides, informed by the reputation score in its prompt.

**Rendering × Chronicle × Metrics** = Time you can see. The world's colors
shift based on aggregate data. The Chronicler explains why. Players return
after a week and the village looks and reads differently. History isn't just
data — it's visual and narrative.

---

## Build Order Rationale

Why the sprints are sequenced the way they are:

```
Sprint 3 (persistence) ← Everything downstream needs data to persist
   ↓
Sprint 4 (polish + deploy) ← Playable product, shareable URL
   ↓
Sprint 5 (API identity + content) ← NPCs that DO things, the core innovation
   ↓
Sprint 6 (evaluation) ← Measure quality, auto-assign work
   ↓
Future: relationships, lifespan, dreams, chronicle, fragments, economy, rendering
```

Each sprint is independently valuable. You can deploy after Sprint 4 and have a
working AI NPC game. Sprint 5 makes it remarkable. Sprint 6 makes it self-improving.
The future layers make it a living world.

Nothing depends on everything being done. Everything is better when more is done.
