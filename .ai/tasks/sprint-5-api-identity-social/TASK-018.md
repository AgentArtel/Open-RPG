## TASK-018: Photographer NPC + Image Generation Skill

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 6 (API-Powered Skills)
- **Type**: Create + Modify
- **Depends on**: TASK-018a (Modular Skill Plugin System), TASK-007 (Skill System), TASK-014 (AgentManager)
- **Blocks**: Future API service NPCs (Musician, Seer, Mailman)
- **Human prerequisite**: Set `GEMINI_API_KEY` in `.env`
- **New dependency**: `@google/generative-ai` (Gemini SDK for image generation)

> **Note**: TASK-018a provides the plugin infrastructure (SkillPlugin types, barrel
> file, `AgentManager` refactor, `AgentConfig.inventory`, `ImageGenToken` item).
> This task uses that infrastructure to build the first API-backed skill and NPC.
> PM-directed cross-boundary edit (2026-02-14).

### Context

Stage 1 (conversational NPCs) is complete. The next frontier is **Stage 2: Service NPCs**
— NPCs that provide real utility by calling external APIs. The first service NPC is
Clara the Photographer, who generates images via **Google's Gemini API** (image generation, e.g. Imagen / Gemini image models).

This task proves the API-as-Identity pattern: an NPC whose persona is built around the
API she can access. If this works, every future API NPC (Musician, Seer, Mailman) follows
the exact same template: one skill, one token, one YAML config.

**Media strategy:** We use **Gemini** for all image, video, and sound generation when needed. Kimi/Moonshot is used for chat/LLM only (no native image gen). We will eventually use the complete Gemini API suite alongside Kimi's complete API suite. For this task, use the Gemini API for image generation only.

### Objective

A Photographer NPC (Clara) who generates images via the Gemini API when players request them.
API access gated by an inventory token. Graceful degradation when API is unavailable.

### Specifications

**Create files:**
- `src/agents/skills/skills/generate-image.ts` — Image generation skill with `skillPlugin` export (~120 lines)
- `src/config/agents/photographer-clara.yaml` — Photographer NPC config with `inventory`

**Modify files:**
- `src/agents/skills/plugins.ts` — Add one barrel export line for `generateImagePlugin`
- `.env.example` — Add `GEMINI_API_KEY`

**Note:** `ImageGenToken` database item and plugin infrastructure are provided by TASK-018a.

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
    // 2. Check Gemini client available (lazy-init from GEMINI_API_KEY)
    // 3. Find target player from context.nearbyPlayers
    // 4. Call Gemini image generation API (e.g. Imagen / image-gen model)
    // 5. Store URL in player variable: player.setVariable('PHOTOS', [...])
    // 6. Return in-character SkillResult
  },
}
```

Key behaviors:
- **Lazy-init Gemini client** — separate from Moonshot LLM client; use `@google/generative-ai` or Gemini REST API with `GEMINI_API_KEY`
- **Token gating** — check `context.event.hasItem('image-gen-token')` before API call
- **Player variable storage** — `player.setVariable('PHOTOS', [...])` for MVP (not full inventory items)
- **Content policy handling** — catch Gemini moderation/safety rejections, return in-character refusal
- **Error isolation** — all errors caught, return `SkillResult` with `success: false`, never throw
- **10-second timeout** on image-generation call to prevent indefinite blocking

**Token Gating Pattern:**

The token check happens inside the skill's `execute()` function. The NPC must have the
token in their inventory. TASK-018a handles granting inventory items at spawn via
`AgentNpcEvent.onInit()` (using `addItem()` — `RpgEvent` inherits from `RpgPlayer`).
Clara's YAML config includes `inventory: ['image-gen-token']`, so she spawns with the token.

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
inventory:
  - image-gen-token
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

Post-MVP: download images to Supabase Storage (generated image URLs may expire; persist when needed).

### Acceptance Criteria

- [ ] `generate_image` skill implements `IAgentSkill` with correct parameter schema
- [ ] `generate_image` skill exports a `skillPlugin` object (uses TASK-018a plugin system)
- [ ] `skillPlugin` is added to `plugins.ts` barrel file (one line)
- [ ] Skill checks for `ImageGenToken` before calling API (returns in-character refusal if missing)
- [ ] Skill creates Gemini client from `GEMINI_API_KEY` env var (separate from Moonshot LLM client)
- [ ] Skill calls Gemini image generation API and returns image URL
- [ ] Photo URL stored in player variable (`PHOTOS`)
- [ ] Photographer Clara YAML config exists with `inventory: ['image-gen-token']`
- [ ] Photographer Clara spawns from YAML config via AgentManager
- [ ] Clara engages conversationally, then generates when appropriate
- [ ] Graceful degradation when `GEMINI_API_KEY` is not set (in-character refusal)
- [ ] Content policy violations return in-character refusal (not crash)
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Use the Moonshot/Kimi client for image generation (Kimi has no image-gen API) — use Gemini
- Build a photo gallery GUI (future feature)
- Download/persist images to Supabase Storage (post-MVP; generated URLs may expire)
- Add rate limiting in this task (add as separate issue/task)
- Make the Photographer wander autonomously (she's stationary for Stage 2)
- Modify the LLM client or AgentRunner — the skill is self-contained
- Add music/video/email API skills (one NPC at a time, prove the pattern first)
- Modify plugin infrastructure (SkillPlugin types, barrel pattern, AgentManager refactor) — that's TASK-018a
- Create `ImageGenToken` database item — that's TASK-018a

### Reference

- Plugin infrastructure: TASK-018a (`.ai/tasks/sprint-5-api-identity-social/TASK-018a.md`)
- Plugin architecture: `.ai/idea/14-modular-skill-plugin-architecture.md`
- Feature idea: `.ai/idea/08-api-as-identity-npcs.md`
- Implementation plan: `.ai/idea/08a-api-powered-skills-implementation-plan.md`
- Skill interface: `src/agents/skills/types.ts` (`IAgentSkill`, `SkillResult`, `GameContext`)
- Skill examples: `src/agents/skills/skills/say.ts`, `look.ts`
- SkillRegistry: `src/agents/skills/SkillRegistry.ts`
- AgentRunner tool execution: `src/agents/core/AgentRunner.ts`
- Agent YAML config: `src/config/agents/elder-theron.yaml` (reference)
- RPGJS inventory API: `docs/rpgjs-guide.md`, `@rpgjs/server` `ItemManager`
- Gemini image generation: https://ai.google.dev/gemini-api/docs/image-generation
- Orchestrator decisions: `.ai/chats/claude-code-cursor-plugin-architecture-response.md`

### Handoff Notes

_(To be filled by implementer)_
