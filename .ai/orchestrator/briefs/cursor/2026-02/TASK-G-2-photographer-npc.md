# TASK-G-2: Photographer NPC + Gemini Image Generation

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Open-RPG (game)
**Agent:** Cursor
**Game-repo task:** TASK-018
**Priority:** Wave 2 (after G-1 ships)
**Depends on:** G-1 (Modular Skill Plugin System)
**Blocks:** G-3 (Content Store)

---

## Goal

Build the first API-backed NPC: a Photographer who can generate images via Gemini using the new skill plugin system. This proves the plugin architecture (G-1) end-to-end and establishes the pattern for all future API NPCs (Musician, Seer, Scholar, etc.).

## Context

The Photographer NPC already exists as a seed row in `game.agent_configs` with `generate_image` in her skills and `image-gen-token` in her inventory. The `image-generation` integration exists in `game.api_integrations`. What's missing is the actual `generate_image` skill implementation and the Supabase Edge Function that calls Gemini.

## Deliverables

1. **`generate_image` skill plugin** — a new file in `src/agents/skills/` that exports a `skillPlugin` with:
   - `name: 'generate_image'`
   - `requiredItem: 'image-gen-token'`
   - `requiresEnv: ['GEMINI_API_KEY']`
   - `category: 'api'`
   - The skill calls the Supabase Edge Function `generate-image` and returns the result URL or an in-character failure.
2. **Barrel export** — one line added to `src/agents/skills/plugins.ts`.
3. **Supabase Edge Function** (`generate-image`) — calls Gemini Imagen API with the prompt, returns the image URL. API key read from Supabase secrets.
4. **`ImageGenToken` item** — a game item definition so `hasItem('image-gen-token')` works at runtime.
5. **In-character failure messages** for: missing API key, rate limit, content policy rejection, missing token.
6. **Photographer personality tuning** — update the seed personality in migration 009 or via a new migration if needed, so the Photographer naturally offers to take photos and uses the skill when asked.

## Acceptance Criteria

- [ ] Photographer NPC can generate an image when a player asks (e.g., "take a photo of a sunset").
- [ ] The `generate_image` skill uses the plugin interface from G-1 (not hardcoded in AgentManager).
- [ ] The skill is gated by `image-gen-token` — removing the token from inventory disables the skill.
- [ ] Missing `GEMINI_API_KEY` produces an in-character failure ("The lens is clouded..."), not a crash.
- [ ] The Edge Function is deployed and callable from the game server.
- [ ] Other NPCs (Elder Theron, Test Agent, Artist) are unaffected — they don't have the token and don't see the skill.
- [ ] The generated image URL is returned to the player in the conversation.

## Do

- Use the `SkillPlugin` interface from G-1.
- Call Gemini via Supabase Edge Function (not directly from the game server).
- Read `GEMINI_API_KEY` from Supabase secrets in the Edge Function.
- Return structured `SkillResult` with `success: boolean` and `message: string`.

## Don't

- Don't store generated images in the database yet — that's G-3 (Content Store).
- Don't add the Edge Function to the Studio repo — it belongs in the game repo's `supabase/functions/`.
- Don't expose `GEMINI_API_KEY` in frontend or game server code.

## Reference

- API-as-Identity vision: `Open-RPG/.ai/idea/08-api-as-identity-npcs.md`
- Implementation plan: `Open-RPG/.ai/idea/08a-api-powered-skills-implementation-plan.md`
- Plugin architecture: `Open-RPG/.ai/idea/14-modular-skill-plugin-architecture.md`
- Seed data: `Open-RPG/supabase/migrations/009_game_schema.sql` (Photographer row)
- Edge Function reference: `Agent-Artel-studio/supabase/functions/` (for Edge Function patterns)
