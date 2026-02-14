# API-as-Identity NPCs: Service NPCs Powered by Real APIs

## The Idea in One Sentence

Build NPC personas around the APIs they can access — a Photographer creates images via
**Gemini** (image generation), a Musician generates music, a Seer produces visions (video) — with
API access gated by inventory tokens, creating a natural RPG progression system where
both players and NPCs collect tokens to unlock capabilities. We use the **Gemini API** for all image, video, and sound generation; **Kimi** for chat/LLM. Eventually we use the complete Gemini API suite alongside Kimi's complete API suite.

---

## The Problem This Solves

Current AI NPCs can talk but can't *do* anything meaningful. They're chatbots in sprite
costumes. The gap: NPCs can talk OR act, but not both. There's no architecture where AI
characters provide real services, learn new abilities, and affect the game world through
actual external integrations.

---

## The Core Innovation

### API-as-Identity

**Principle:** Build NPC personas around the APIs they can access. The API defines what
they DO. Personality is flavor around that capability.

| NPC Role | API Integration | In-Game Fiction |
|----------|----------------|-----------------|
| Photographer | Gemini (image generation) | "Mystical camera that captures not just what is, but what could be" |
| Musician | Suno / Udio (custom integration) | "Enchanted lute that plays songs from dreams" |
| Seer / Fortune Teller | Gemini (video) or Runway (custom) | "Crystal ball showing visions of possible futures" |
| Mailman | Gmail API | "Carrier pigeon network connecting distant realms" |
| Hall of Records | Google Drive / Storage | "Ancient library with infinite scrolls" |

We use **Gemini** for image, video, and sound generation when needed; **Kimi** for chat/LLM. **Custom APIs or integrations** (e.g. Suno, Udio, Runway) stay as such for music and other specialized services. Full Gemini + Kimi API suites together is the target.

### Why This Works

1. **Natural progression** — Want image generation? Find the Photographer, earn/trade for their token
2. **NPCs become services, not just dialogue** — Real utility for players
3. **Interdependence** — Players need NPCs for API access, NPCs need tokens from world/quests
4. **Emergent development** — NPCs develop personality based on what they do, not hard-coded scripts
5. **Diegetic AI** — All LLM/API usage is wrapped in game fiction (mystical cameras, enchanted lutes)

---

## Token Economy

API integrations are **skills** gated by **inventory tokens**. Both players and NPCs
need tokens to use APIs.

### Token Assignment (MVP)

Tokens pre-assigned in agent YAML config:
```yaml
startingInventory:
  - ImageGenToken
```

Photographer spawns with `ImageGenToken`, can use `generate_image` skill.

### Token Types (Post-MVP)

- **Permanent tokens** — Unlimited uses (Photographer's camera never breaks)
- **Consumable tokens** — Single-use or limited charges
- **Shared tokens** — Multiple NPCs can use same API if both have tokens

### Token Acquisition (Post-MVP)

- Quest rewards grant tokens
- Trading between players/NPCs
- Token crafting from rare materials
- "Starter token" choice system (pick 1 of 3, like Pokemon starters)

---

## Four-Stage NPC Progression

### Stage 1: Conversational NPC (DONE)
Elder Theron — basic conversation + memory. **Validates core agent system.**

### Stage 2: Stationary Service NPC (NEXT)
Photographer at fixed location. Player requests image → NPC calls **Gemini** (image generation) → returns
in-game item with generated image. Token pre-assigned. **Validates API integration
reliability.**

### Stage 3: Autonomous API Agent
Photographer wanders, proactively offers services. "That sunset is beautiful, shall I
capture it?" Same API skill, used proactively. **Validates emergent behavior.**

### Stage 4: Multi-API Ecosystem
Multiple service NPCs coexist. NPCs use each other's services. Musician asks
Photographer for album cover art. **Validates agent coordination and token trading.**

---

## Existing Infrastructure That Supports This

Everything needed for Stage 2 already exists:

| Component | Status | What It Provides |
|-----------|--------|------------------|
| `IAgentSkill` interface | Done | Standard skill contract with `execute()` |
| `SkillRegistry` | Done | Register, retrieve, convert to OpenAI tools |
| `AgentRunner` | Done | LLM loop with tool calling, filters skills by config |
| `AgentManager` + YAML | Done | `skills:` list in YAML already gates which tools LLM sees |
| Gemini API / `@google/generative-ai` | To add | Image (and eventually video/sound) generation via Gemini; Kimi for chat only |
| RPGJS inventory API | Built-in | `hasItem()`, `addItem()`, `removeItem()` |
| `GameContext` | Done | Provides NPC event, nearby players for skill execution |

The only new pieces needed:
1. A `generate_image` skill implementation
2. An `ImageGenToken` database item
3. A `photographer-clara.yaml` agent config
4. Token-gating logic in skill execution (check `hasItem` before API call)

---

## Cost Considerations

We use **Gemini** for image (and eventually video/sound) generation; credits can cover usage. Kimi is used for chat/LLM only.

| API | Use Case |
|-----|----------|
| Gemini (image, video, audio) | Image generation (Sprint 5); video/sound when added |
| Kimi (Moonshot) | Chat/LLM only — no native image gen |

**Rate limiting is critical from day one.** Per-player and per-NPC limits prevent cost spirals.

---

## Agent State Machine

NPCs are always in one of five states (borrowed from AI Town):

```
idle → approaching → conversing → idle
  ↓                     ↓
moving               thinking
  ↓                     ↓
idle                  idle
```

| State | Behavior | Transitions |
|-------|----------|-------------|
| **Idle** | Wander, look, wait, emote. Idle ticks fire. | → approaching, moving |
| **Approaching** | Player in detection range. Turn to face, greet. | → conversing, idle |
| **Conversing** | Active dialogue. Idle ticks suppressed. | → idle |
| **Moving** | Executing movement route. Events buffered. | → idle |
| **Thinking** | Waiting for LLM/API response. "..." animation. | → idle |

---

## Implementation Plan

See **[08a-api-powered-skills-implementation-plan.md](08a-api-powered-skills-implementation-plan.md)**
for phased steps.

Task brief: `.ai/tasks/TASK-018.md` — Photographer NPC + Image Generation Skill

---

## Open Questions

1. **Token economy balance** — Should tokens be consumable or permanent for MVP?
2. **Image storage** — Store URLs in player variables or create proper inventory items?
3. **Content moderation** — How to filter inappropriate image-generation prompts/results?
4. **Agent-to-agent API calls** — Can NPCs request services from each other?
5. **Cost attribution** — Track API costs per-player for billing/analytics?

---

## Success Criteria

### Stage 2 (Photographer MVP)
- Player approaches Photographer NPC
- NPC engages conversationally about the request
- Gemini generates image from player-described prompt
- NPC hands back result with in-character dialogue
- Rate limiting prevents API spam
- Error handling: API failures → graceful NPC response, never crash
- Token gating: NPC without ImageGenToken can't generate images
