# Idea 11: Context-as-Lifespan, Time-as-Rendering, Shared Database

**Status**: APPROVED (conceptual — weave into existing systems)
**Date**: 2026-02-13

---

## 1. Context Length = NPC Lifespan / Training Session

The LLM context window is the NPC's lived experience. When context fills up and
compresses or resets, that's not a technical limitation — it's the NPC's "lifespan"
ending and a new one beginning.

**Implications:**

- **A full context window = one life** of an NPC. What they remember, who they talked
  to, what they created — all bounded by what fits in context.
- **Context compression = aging.** As older messages compress, the NPC "forgets" details
  but retains impressions (summaries). This mirrors real memory decay.
- **Context reset = rebirth.** The NPC starts fresh but with persistent memories pulled
  from Supabase (their "soul" carries over via stored content, profiles, fragments).
- **Training session framing:** Each context window is a "training session" — the NPC
  learns and adapts within it, and their performance can be evaluated (TASK-022–026)
  at the end before the window resets.

**How this connects to existing systems:**

- **AgentMemory** (TASK-012): The conversation buffer IS the lifespan. Buffer size
  directly controls how long an NPC "lives" per session.
- **Associative Recall** (TASK-020): Persistent memories from Supabase bridge lifespans.
  The NPC pulls in past-life memories based on environmental tags.
- **Agent Evaluation** (TASK-022–026): Performance tracked across lifespans shows
  improvement over "generations."
- **Fragments** (idea 09): Past fragments literally ARE memories from previous lifespans.

**No new code needed** — this is a framing/metaphor that guides design decisions:
- Don't fight context limits; design around them as a feature
- Buffer size in agent YAML = lifespan duration
- Evaluation at end of context = end-of-life assessment

---

## 2. Time as "Rendering" — AI-Restyled Tilesets

Time in the game world isn't measured by a clock — it's measured by visual change.
The existing tileset images are restyled by AI based on metrics derived from
simulation/game data, so the world visually evolves without requiring new art assets.

**How it works:**

1. **Metrics drive style**: Aggregate game data (player activity, NPC mood averages,
   economy health, season/cycle counters) into a style vector
2. **AI restyling**: Feed the existing tileset PNGs + style vector to an image model
   (DALL-E, Stable Diffusion) with instructions like "restyle this tileset to feel
   [darker/warmer/decayed/flourishing]"
3. **Hot-swap tilesets**: Replace the active tileset images at runtime or between
   sessions. RPGJS loads tilesets from files — swapping the PNG changes the world

**Key insight**: We DON'T add new tileset images. The existing ones transform.
The village looks the same structurally but feels different over time:
- Prosperous era → warm colors, flowers, bright sky
- Decline → muted palette, cracks, overcast
- Corruption → dark tones, purple haze, twisted textures

**Connection to existing systems:**

- **PerceptionEngine** (TASK-006): Already extracts environmental state. This state
  feeds the style vector.
- **Photographer NPC** (TASK-018): Uses DALL-E already. Same pipeline for tileset
  restyling (img2img or style transfer endpoint).
- **Content Store** (TASK-019): Restyled tilesets ARE content — store versions with
  tags so the world can "recall" past visual states.

**RPGJS constraints:**
- Tileset images ≤ 4096x4096 (WebGL limit) — restyled versions must match dimensions
- Hot-swapping tilesets mid-session may require map reload or custom sprite refresh
- Alternative: restyle between sessions, load the "current era" tileset on server start

**Implementation sketch (future task):**

```typescript
interface RenderingMetrics {
  prosperity: number      // 0-100 from economy data
  socialHealth: number    // 0-100 from NPC interaction frequency
  entropy: number         // 0-100 from conflict/chaos events
  cycle: number           // increments each "rendering" period
}

async function renderEra(metrics: RenderingMetrics, tilesetPath: string): Promise<Buffer> {
  const style = metricsToStylePrompt(metrics)
  // e.g. "Restyle this pixel art tileset: warm golden hour lighting,
  //        blooming flowers, clean stone paths. Maintain exact tile grid."
  const restyled = await imageClient.edit({
    image: fs.readFileSync(tilesetPath),
    prompt: style,
    size: '1024x1024'
  })
  return restyled
}
```

---

## 3. Shared Supabase — One Database, Many Perspectives

Everything in the ecosystem shares one Supabase organization / database. All tables
live together. This means:

- **NPCs share data**: All NPCs read from `npc_content`, `npc_posts`, `agent_profiles`.
  Same data, different interpretations based on their personality and context.
- **Players share state**: Player progress, inventory, interactions — all in one place.
- **Cross-pollination**: The Photographer's images are visible to the Seer's recall.
  The Seer's interpretations feed back into content the Musician might reference.
- **Single source of truth**: No data silos, no sync issues between services.

**What this enables:**

- Any NPC can recall any other NPC's content (via tag-based recall in TASK-020)
- The evaluation system (TASK-022–026) profiles ALL agents in the same tables
- The social feed (TASK-021) shows posts from all NPCs in one stream
- Player state, agent memory, content, evaluations — all queryable together

**Already designed this way**: Our Supabase schema (TASK-012, TASK-019, TASK-022)
already uses a single database with `agent_id` columns to partition by NPC. No
changes needed — this idea confirms we're on the right path.

**Key principle**: Same data, different perspectives. The database is the shared
world state. Each NPC's personality + context determines what they make of it.
