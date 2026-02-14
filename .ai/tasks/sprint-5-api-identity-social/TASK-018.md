## TASK-018: Photographer NPC + Image Generation Skill

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P1-High
- **Phase**: 6 (API-Powered Skills)
- **Type**: Create
- **Depends on**: TASK-018a (Modular Skill Plugin System — provides plugin infra + inventory support)
- **Blocks**: TASK-019 (Content Store), future API service NPCs
- **Human prerequisite**: Set `GEMINI_API_KEY` in `.env`

### Context

TASK-018a provides the modular skill plugin infrastructure and inventory support. This
task uses that infrastructure to build the first API-backed NPC: Clara the Photographer,
who generates images via Google's Gemini API.

This proves the API-as-Identity pattern: an NPC whose persona is built around the API
she can access. Clara's identity comes from possessing a Mystical Lens (inventory item)
that grants the `generate_image` skill (Gemini API call). If this works, every future
API NPC follows the same template: one skill file + one YAML config.

**New dependency required:** `@google/generative-ai` (official Google SDK for Gemini).

### Objective

1. Build the `generate_image` skill with `skillPlugin` export (Gemini image generation).
2. Create Photographer Clara's YAML config with `inventory: ['image-gen-token']`.
3. Add `GEMINI_API_KEY` to `.env.example`.
4. Add `@google/generative-ai` dependency.

### Specifications

**Image Generation Skill (`src/agents/skills/skills/generate-image.ts`, ~120 lines):**

Implements `IAgentSkill` with `skillPlugin` export:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { IAgentSkill, SkillResult, GameContext } from '../types'
import type { SkillPlugin } from '../plugin'

// Lazy-init Gemini client
let geminiClient: GoogleGenerativeAI | null = null
function getGeminiClient(): GoogleGenerativeAI | null {
  if (geminiClient) return geminiClient
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  geminiClient = new GoogleGenerativeAI(key)
  return geminiClient
}

export const generateImageSkill: IAgentSkill = {
  name: 'generate_image',
  description: 'Create an image based on a text description. Requires a Mystical Lens.',
  parameters: {
    prompt: { type: 'string', description: 'Description of the image to generate', required: true },
    style: { type: 'string', description: 'Image style hint', enum: ['vivid', 'natural'], required: false },
  },
  async execute(params, context): Promise<SkillResult> {
    const prompt = String(params.prompt)
    const style = (params.style as string) || 'vivid'

    // Token gate: NPC must have the Mystical Lens
    if (!context.event.hasItem?.('image-gen-token')) {
      return {
        success: false,
        message: 'I need my mystical lens for that, but I seem to have misplaced it.',
        error: 'missing_token',
      }
    }

    // Check Gemini client available
    const client = getGeminiClient()
    if (!client) {
      return {
        success: false,
        message: 'The lens is clouded today... the creative energy doesn\'t flow here.',
        error: 'api_unavailable',
      }
    }

    // Find target player
    const targetPlayer = context.nearbyPlayers[0]?.player
    if (!targetPlayer) {
      return {
        success: false,
        message: 'No one nearby to give the photograph to.',
        error: 'no_target',
      }
    }

    try {
      // Use Gemini's image generation capability
      // Include style hint in the prompt
      const enhancedPrompt = style === 'natural'
        ? prompt
        : `${prompt} — rendered in a vivid, striking style`

      // Call Gemini image generation with 10s timeout
      // (Exact API usage depends on @google/generative-ai SDK version —
      //  check current docs for image generation method)
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Generate an image: ${enhancedPrompt}` }] }],
        // generationConfig for image output — check SDK docs
      })

      const imageUrl = extractImageUrl(result) // Implementation depends on SDK response format
      if (!imageUrl) {
        return {
          success: false,
          message: 'The image did not develop properly. Try describing it differently.',
          error: 'no_result',
        }
      }

      // Store in player variable (MVP approach)
      const photos = targetPlayer.getVariable('PHOTOS') || []
      photos.push({
        url: imageUrl,
        prompt,
        generatedBy: context.agentId,
        timestamp: Date.now(),
      })
      targetPlayer.setVariable('PHOTOS', photos)

      return {
        success: true,
        message: `*carefully develops the photograph and hands it to you* Here — I've captured: "${prompt}". The image is stored in your collection.`,
        data: { imageUrl, prompt },
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[generate_image] API error: ${msg}`)

      if (msg.includes('SAFETY') || msg.includes('content_policy') || msg.includes('blocked')) {
        return {
          success: false,
          message: 'My lens refuses to capture that vision. Perhaps something more... appropriate?',
          error: 'content_policy',
        }
      }

      return {
        success: false,
        message: 'The light was not right. My lens could not focus. Try again in a moment.',
        error: 'api_error',
      }
    }
  },
}

export const skillPlugin: SkillPlugin = {
  name: 'generate_image',
  create: () => generateImageSkill,
  requiredItem: 'image-gen-token',
  requiresEnv: ['GEMINI_API_KEY'],
  category: 'api',
}
```

Key behaviors:
- **Lazy-init Gemini client** — `new GoogleGenerativeAI(process.env.GEMINI_API_KEY)`
- **Token gating** — `context.event.hasItem('image-gen-token')` → in-character refusal if missing
- **In-character failures** for missing API key, content policy, no target player
- **10-second timeout** on Gemini call
- **Player variable storage** — `player.setVariable('PHOTOS', [...])` for MVP
- **Error isolation** — all errors caught, `SkillResult` with `success: false`, never throws

**Note:** The exact Gemini image generation API may differ from the pseudocode above. Cursor should
check the current `@google/generative-ai` SDK docs for the correct method (e.g., `imagen` model
or `generateContent` with image output config). The skill structure and error handling pattern
are the important parts — adapt the API call to match the SDK.

**Register in barrel file (`src/agents/skills/plugins.ts`):**

Add one line (TASK-018a creates this file with the 5 existing skills):
```typescript
export { skillPlugin as generateImagePlugin } from './skills/generate-image'
```

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

### Files Summary

**New files:**

| File | Purpose | Est. lines |
|------|---------|------------|
| `src/agents/skills/skills/generate-image.ts` | Gemini image generation skill + `skillPlugin` | ~120 |
| `src/config/agents/photographer-clara.yaml` | Photographer NPC config | ~25 |

**Modified files:**

| File | Change |
|------|--------|
| `src/agents/skills/plugins.ts` | Add one barrel export line for `generateImagePlugin` |
| `package.json` | Add `@google/generative-ai` dependency |
| `.env.example` | Add `GEMINI_API_KEY` |

### Acceptance Criteria

- [ ] `@google/generative-ai` dependency added to `package.json`
- [ ] `generate_image` skill implements `IAgentSkill` with `skillPlugin` export
- [ ] Skill checks `hasItem('image-gen-token')` before API call (in-character refusal if missing)
- [ ] Skill creates Gemini client from `GEMINI_API_KEY` (lazy-init)
- [ ] Skill calls Gemini image generation API with timeout
- [ ] Content policy / safety violations return in-character refusal
- [ ] Photo URL stored in player variable (`PHOTOS`)
- [ ] Clara spawns from YAML config with `inventory: ['image-gen-token']`
- [ ] Clara engages conversationally, then generates when appropriate
- [ ] Graceful degradation when `GEMINI_API_KEY` is not set
- [ ] `plugins.ts` barrel updated with one new export line
- [ ] `.env.example` updated
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Use DALL-E / OpenAI for image generation — use Gemini via `@google/generative-ai`
- Modify `SkillPlugin` types, barrel file structure, or `AgentManager` registration (that's TASK-018a)
- Build a photo gallery GUI (TASK-019+ scope)
- Download/persist images to Supabase Storage (post-MVP)
- Add rate limiting (separate issue/task for Sprint 6+)
- Make the Photographer wander autonomously (stationary for Stage 2)

### Reference

- Plugin system: TASK-018a provides `SkillPlugin`, barrel file, inventory support
- Architecture rationale: `.ai/idea/14-modular-skill-plugin-architecture.md`
- API-as-Identity vision: `.ai/idea/08-api-as-identity-npcs.md`
- Implementation plan (original): `.ai/idea/08a-api-powered-skills-implementation-plan.md`
- Skill interface: `src/agents/skills/types.ts` (`IAgentSkill`, `SkillResult`, `GameContext`)
- Skill examples: `src/agents/skills/skills/say.ts`, `move.ts`
- Agent YAML config: `src/config/agents/elder-theron.yaml`

### Handoff Notes

_(To be filled by implementer)_
