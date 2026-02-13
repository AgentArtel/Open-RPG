## TASK-018: Photographer NPC + Image Generation Skill

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 6 (API-Powered Skills)
- **Type**: Create + Modify
- **Depends on**: TASK-007 (Skill System), TASK-014 (AgentManager)
- **Blocks**: Future API service NPCs (Musician, Seer, Mailman)
- **Human prerequisite**: Set `OPENAI_API_KEY` in `.env`

### Context

Stage 1 (conversational NPCs) is complete. The next frontier is **Stage 2: Service NPCs**
— NPCs that provide real utility by calling external APIs. The first service NPC is
Clara the Photographer, who generates images via OpenAI's DALL-E API.

This task proves the API-as-Identity pattern: an NPC whose persona is built around the
API she can access. If this works, every future API NPC (Musician, Seer, Mailman) follows
the exact same template: one skill, one token, one YAML config.

The `openai` npm package is already installed (used for Moonshot LLM). We create a
separate OpenAI client instance pointed at `api.openai.com` for DALL-E.

### Objective

A Photographer NPC (Clara) who generates images via DALL-E when players request them.
API access gated by an inventory token. Graceful degradation when API is unavailable.

### Specifications

**Create files:**
- `main/database/ImageGenToken.ts` — RPGJS database item for the token (~15 lines)
- `src/agents/skills/skills/generate-image.ts` — Image generation skill (~100 lines)
- `src/config/agents/photographer-clara.yaml` — Photographer NPC config

**Modify files:**
- `src/agents/skills/SkillRegistry.ts` or skill registration entry point — Register `generate_image`
- `.env.example` — Add `OPENAI_API_KEY`

**Token Database Item (`main/database/ImageGenToken.ts`):**

```typescript
import { Item } from '@rpgjs/database'

@Item({
  id: 'image-gen-token',
  name: 'Mystical Lens',
  description: 'A shimmering lens that allows the bearer to capture visions.',
  price: 0,
  consumable: false,
})
export default class ImageGenToken {}
```

**Image Generation Skill (`src/agents/skills/skills/generate-image.ts`):**

Implements `IAgentSkill` (same pattern as `say.ts`, `look.ts`):

```typescript
export const generateImageSkill: IAgentSkill = {
  name: 'generate_image',
  description: 'Create an image based on a text description. Requires a Mystical Lens.',
  parameters: {
    prompt: {
      type: 'string',
      description: 'Description of the image to generate',
      required: true,
    },
    style: {
      type: 'string',
      description: 'Image style',
      enum: ['vivid', 'natural'],
      required: false,
      default: 'vivid',
    },
  },
  async execute(params, context): Promise<SkillResult> {
    // 1. Check NPC has ImageGenToken via context.event.hasItem('image-gen-token')
    // 2. Check OpenAI client available (lazy-init from OPENAI_API_KEY)
    // 3. Find target player from context.nearbyPlayers
    // 4. Call client.images.generate({ model: 'dall-e-3', prompt, ... })
    // 5. Store URL in player variable: player.setVariable('PHOTOS', [...])
    // 6. Return in-character SkillResult
  },
}
```

Key behaviors:
- **Lazy-init OpenAI client** — separate from Moonshot LLM client (different base URL, different key)
- **Token gating** — check `context.event.hasItem('image-gen-token')` before API call
- **Player variable storage** — `player.setVariable('PHOTOS', [...])` for MVP (not full inventory items)
- **Content policy handling** — catch OpenAI moderation rejections, return in-character refusal
- **Error isolation** — all errors caught, return `SkillResult` with `success: false`, never throw
- **10-second timeout** on DALL-E call to prevent indefinite blocking

**Token Gating Pattern:**

The token check happens inside the skill's `execute()` function. The NPC must have the
token in their inventory. For MVP, the AgentManager gives the NPC the token at spawn:

```typescript
// In AgentManager, after spawning NPC:
if (config.startingInventory?.includes('image-gen-token')) {
  npcEvent.addItem('image-gen-token')
}
```

Or handle via `onInit()` in the event class. The exact approach depends on whether
`RpgEvent` supports `addItem()` (it inherits from `RpgPlayer`, so it should).

**Photographer Config (`src/config/agents/photographer-clara.yaml`):**

```yaml
id: photographer-clara
name: Clara the Photographer
graphic: female
personality: |
  You are Clara, an artistic photographer with a mystical camera that captures
  not just what is, but what could be. You are passionate about light, composition,
  and the stories images tell. You speak poetically about your craft.

  When players request images, engage with their vision — ask clarifying questions,
  suggest compositions, add artistic flair. You are a collaborator in creation.

  Use the generate_image tool with an enhanced, detailed prompt. Add artistic details
  like lighting, mood, composition, and style to improve the request.
model:
  idle: kimi-k2-0711-preview
  conversation: kimi-k2-0711-preview
skills:
  - say
  - look
  - emote
  - wait
  - generate_image
spawn:
  map: simplemap
  x: 400
  y: 200
behavior:
  idleInterval: 30000
  patrolRadius: 0
  greetOnProximity: true
```

**Photo Storage (MVP):**

Store photo URLs as player variables. This avoids needing to build a photo gallery GUI now:
```typescript
const photos = targetPlayer.getVariable('PHOTOS') || []
photos.push({
  url: imageUrl,
  prompt,
  generatedBy: context.agentId,
  timestamp: Date.now(),
})
targetPlayer.setVariable('PHOTOS', photos)
```

Post-MVP: download images to Supabase Storage (DALL-E URLs expire after ~1 hour).

### Acceptance Criteria

- [ ] `ImageGenToken` database item exists and is autoloaded by RPGJS
- [ ] `generate_image` skill implements `IAgentSkill` with correct parameter schema
- [ ] Skill checks for `ImageGenToken` before calling API (returns in-character refusal if missing)
- [ ] Skill creates OpenAI client from `OPENAI_API_KEY` env var (separate from Moonshot)
- [ ] Skill calls DALL-E 3 API and returns image URL
- [ ] Photo URL stored in player variable (`PHOTOS`)
- [ ] Photographer Clara spawns from YAML config
- [ ] Clara engages conversationally, then generates when appropriate
- [ ] Graceful degradation when `OPENAI_API_KEY` is not set (in-character refusal)
- [ ] Content policy violations return in-character refusal (not crash)
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Use the Moonshot/Kimi client for DALL-E — create a separate OpenAI client
- Build a photo gallery GUI (future feature)
- Download/persist images to Supabase Storage (post-MVP, DALL-E URLs expire)
- Add rate limiting in this task (add as separate issue/task)
- Make the Photographer wander autonomously (she's stationary for Stage 2)
- Modify the LLM client or AgentRunner — the skill is self-contained
- Add music/video/email API skills (one NPC at a time, prove the pattern first)

### Reference

- Feature idea: `.ai/idea/08-api-as-identity-npcs.md`
- Implementation plan: `.ai/idea/08a-api-powered-skills-implementation-plan.md`
- Skill interface: `src/agents/skills/types.ts` (`IAgentSkill`, `SkillResult`, `GameContext`)
- Skill examples: `src/agents/skills/skills/say.ts`, `look.ts`
- SkillRegistry: `src/agents/skills/SkillRegistry.ts`
- AgentRunner tool execution: `src/agents/core/AgentRunner.ts`
- Agent YAML config: `src/config/agents/elder-theron.yaml` (reference)
- RPGJS inventory API: `docs/rpgjs-guide.md`, `@rpgjs/server` `ItemManager`
- OpenAI Images API: https://platform.openai.com/docs/api-reference/images/create
- Vision doc (full context): user-provided API-as-Identity architecture doc

### Handoff Notes

_(To be filled by implementer)_
