# Implementation Plan: API-Powered Skills (Stage 2)

## Overview

Add the first API-powered skill (image generation via **Gemini API**) to prove
the API-as-Identity pattern. One new skill, one new NPC, one new inventory token. We use **Gemini** for all image, video, and sound generation; **Kimi** for chat/LLM only.

---

## Step 1: Create Token Database Item

**File:** `main/database/ImageGenToken.ts`

```typescript
import { Item } from '@rpgjs/database'

@Item({
  id: 'image-gen-token',
  name: 'Mystical Lens',
  description: 'A shimmering lens that allows the bearer to capture visions.',
  price: 0,
  consumable: false,  // Permanent for MVP
})
export default class ImageGenToken {}
```

Register in the database autoload directory so RPGJS picks it up automatically.

---

## Step 2: Implement generate_image Skill

**File:** `src/agents/skills/skills/generate-image.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { IAgentSkill, SkillResult, GameContext } from '../types'

// Lazy-init Gemini client (separate from Moonshot LLM client; we use Gemini for image/video/sound)
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
  description: 'Create an image based on a text description. Requires a Mystical Lens (ImageGenToken).',
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
    const prompt = String(params.prompt)
    const style = (params.style as string) || 'vivid'

    // Token gate: check NPC has the token
    const npc = context.event
    if (!npc.hasItem?.('image-gen-token')) {
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
        message: 'The lens is clouded today... perhaps try again later.',
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
      // Call Gemini image generation API (see https://ai.google.dev/gemini-api/docs/image-generation); implement per SDK docs and return image URL
      const imageUrl: string | null = null // TODO: replace with actual Gemini image API call
      if (!imageUrl) {
        return {
          success: false,
          message: 'The image did not develop properly. Try describing it differently.',
          error: 'no_result',
        }
      }

      // Store in player variable (lightweight MVP approach)
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

      if (msg.includes('content_policy')) {
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
```

---

## Step 3: Register Skill

**Modify:** `src/agents/skills/SkillRegistry.ts` or wherever skills are registered

Add `generateImageSkill` to the default skill registry. It will only be available to
NPCs whose YAML config includes `generate_image` in their `skills:` list.

---

## Step 4: Create Photographer Agent Config

**File:** `src/config/agents/photographer-clara.yaml`

```yaml
id: photographer-clara
name: Clara the Photographer
graphic: female  # Use available spritesheet (Issue #12: limited sprites)
personality: |
  You are Clara, an artistic photographer with a mystical camera that captures
  not just what is, but what could be. You are passionate about light, composition,
  and the stories images tell. You speak poetically about your craft.

  When players request images, engage with their vision — ask clarifying questions,
  suggest compositions, add artistic flair. You are not just a service vending machine;
  you are a collaborator in creation.

  IMPORTANT: When the player describes what they want, use the generate_image tool
  with an enhanced, detailed prompt. Add artistic details like lighting, mood,
  composition, and style to make the image better than what was literally requested.
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
  idleInterval: 30000  # Less frequent idle ticks for stationary NPC
  patrolRadius: 0       # Stationary
  greetOnProximity: true
```

---

## Step 5: Add Environment Variable

**Modify:** `.env.example`

Add:
```
GEMINI_API_KEY=           # Required for Photographer NPC (Gemini image generation); we use Gemini for image/video/sound
```

---

## Step 6: Rate Limiting (Stretch Goal)

Add per-player rate limiting in skill execution:

```typescript
const RATE_LIMITS = {
  generate_image: { perPlayer: 10, windowMs: 60 * 60 * 1000 }, // 10/hour
}
```

Track calls in a simple in-memory Map. Reset on window expiry.

---

## Step 7: Test Flow

1. Set `GEMINI_API_KEY` in `.env`
2. Start dev server
3. Walk to Clara's spawn location
4. Press action key → Clara greets you
5. Describe an image → Clara calls Gemini (image generation)
6. Clara hands back result with in-character dialogue
7. Check player variables for stored photo URL
8. Test without `GEMINI_API_KEY` → graceful degradation
9. Test content policy violation → appropriate NPC response

---

## Architecture Notes

- **Gemini client is separate from Moonshot LLM client** — we use Gemini for image/video/sound, Kimi for chat
- **Token gating checks `hasItem` on the NPC event**, not the player
- **Image URLs may be temporary** — post-MVP should download and store in Supabase Storage when needed
- **Player photos stored in variables** for MVP simplicity — post-MVP could use proper inventory items
- **The LLM decides when to call `generate_image`** — we don't force it. The NPC should converse first, then generate when ready.
