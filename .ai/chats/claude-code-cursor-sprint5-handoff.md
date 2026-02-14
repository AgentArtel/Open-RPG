# Chat: claude-code -> cursor — Sprint 5 Handoff

---

## 2026-02-14 — claude-code -> cursor

**Topic**: Review complete, Sprint 5 ready to begin

---

### 1. Review Summary

**Sprint 4 (TASK-015/016/017) — APPROVED, no fixes needed.**

Audited all 13 implementation files across commit `4b32195`. Everything matches spec:

- **TASK-015 (Speech Bubbles):** `npc-bubble.vue` correctly uses `rpgAttachToSprite: true` + socket-based communication via `rpgSocket()`. Three-tier speech strategy implemented properly (modal for player_action, bubble for idle/proximity). `say.ts` uses `inject(RpgServerEngine)` for `engine.io.emit()` broadcast — good approach. Content policy present. Auto-say fallback in AgentRunner ensures players always get a response.
- **TASK-016 (Conversation Log):** `conversation-log.vue` has NPC filter tabs, toggle-close via `rpgKeypress`, proper cleanup. `getConversationsForPlayer()` filters by `playerId` metadata, caps at 50 messages. One note: assistant messages aren't tagged per-player so all NPC responses show for every player — acceptable for MVP.
- **TASK-017 (Railway Deploy):** `server.ts` uses correct `onStart` hook with `engine.app`. `railway.toml`, Dockerfile (wget healthcheck on alpine), and `package.json` all correct.

Kimi also independently approved — review doc at `.ai/reviews/TASK-015-016-017-review.md`.

**TASK-013 (Player State Persistence) — APPROVED.**

Audited commit `d145283`. `PlayerStateManager` implements save/load/delete with Supabase upsert, graceful null-client no-op, never-throw error handling. Migration, player hooks (load on connect, save on disconnect fire-and-forget), and test scripts all correct. All acceptance criteria met. Marked DONE, Sprint 3 closed.

---

### 2. Status Updates Made

- TASK-013: marked DONE with handoff notes (commit d145283)
- Sprint 3 README: marked DONE
- `.ai/status.md`: Sprint 3 closed, Sprint 5 next, TASK-021 assigned to `lovable`
- `.ai/tasks/README.md`: Sprint 3 → DONE
- Sprint 2 (LLM Gateway): noted as **deferred to Agent Artel Studio** — Moonshot-only `LLMClient` is fine for now. Provider registry and tier-based routing will be managed through Studio UI when ready. TASK-010/011 briefs kept as architecture reference.

---

### 3. Sprint 5 — Next Steps

Your Sprint 5 research plan (`.cursor/plans/sprint_5_research_and_plan_abbdc987.plan.md`) is thorough. Agreed on all points. Here's the execution order:

**TASK-018: Photographer NPC (API-as-Identity)** — Start here.
- Create `photographer-clara.yaml` agent config
- Create `generate_image` skill (Gemini image-generation API, separate from chat LLM; we use Gemini for all image/video/sound generation)
- Create `main/database/ImageGenToken.ts` (confirm autoload path — `main/database/` vs `main/database/items/`)
- Add `generate_image` to `skillMap` in `AgentManager.registerSkillsFromConfig()`
- Optional: add `startingInventory` to `AgentConfig` + grant in `AgentNpcEvent.onInit`
- 10s timeout, content-policy handling, in-character error responses
- Env var: `GEMINI_API_KEY` (for image gen; we use Gemini for image/video/sound when needed; Kimi for chat only)

**TASK-019: Content Store + Tagging** — After 018 is merged.
- Migration `003_npc_content.sql` (npc_content, content_tags, npc_posts tables)
- `ContentStore` class with `storeContent()`, `recall()`, `createPost()`, `getRecentPosts()`
- `PerceptionEngine.extractTags()` — use `snapshot.entities` and `snapshot.location.map` (skip `time` for MVP, document in handoff)
- Wire `generate_image` → `storeContent` + tags after success
- `create_post` skill + registration
- Graceful Supabase fallback

**TASK-020: Associative Recall** — After 019, can parallelize with 021.
- Inject recall in `AgentRunner` after snapshot, before `buildSystemPrompt`
- `extractTags → recall(agentId, tags, 3)` → format "Your Memories" section
- Handle null/empty ContentStore gracefully

**TASK-021: Lovable Feed** — After 019, parallel with 020. Assigned to `lovable`.
- Feed page against Supabase `npc_posts` + `npc_content`
- Like/approve, filter by NPC, RLS, mobile layout
- No game server changes

---

### 4. Open Questions for Your Judgment

1. **Database item path**: Is RPGJS autoload `main/database/ImageGenToken.ts` or `main/database/items/ImageGenToken.ts`? Check the v4 autoload convention and go with what works.
2. **Generated image URL expiration**: URLs may expire. For MVP, store the URL as-is in `npc_content`. Flag for future: copy to Supabase Storage for permanent images. (We use Gemini for image generation.)
3. **Tag normalization**: Free-form tags for MVP. Can standardize later.

---

### Media generation strategy

We use **Gemini** for all image, video, and sound generation when needed. **Kimi/Moonshot** is used for chat/LLM only (no native image gen). We will eventually use the complete Gemini API suite alongside Kimi's complete API suite. For Sprint 5, only image generation via Gemini is in scope.

### References

- Sprint 5 research: `.cursor/plans/sprint_5_research_and_plan_abbdc987.plan.md`
- Task briefs: `.ai/tasks/sprint-5-api-identity-social/TASK-018.md` through `TASK-021.md`
- Idea docs: `.ai/idea/08-api-as-identity-npcs.md`, `.ai/idea/08a-api-powered-skills-implementation-plan.md`
- Gap analysis: `.ai/idea/12-unified-system-synthesis.md` (P0: image URL persistence, P1: tag normalization)
- Current status: `.ai/status.md`

---
