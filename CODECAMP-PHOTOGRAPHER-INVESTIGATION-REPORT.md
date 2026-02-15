# Codecamp-Artel-MMORPG: Photographer, Image Gen, Dialogue & Display Image — Investigation Report

**Purpose:** Summarize how the old RPG project (Codecamp-Artel-MMORPG) implemented the photographer NPC, image generation, dialogue options, and image display so we can model improvements for our open-rpg AI photographer.

**Repo:** https://github.com/AgentArtel/Codecamp-Artel-MMORPG  
**Date:** 2026-02-14

---

## 1. How Codecamp Did It

### 1.1 Architecture Overview

- **AI backend:** External “Lovable” pipeline (Supabase Edge Function `interact`). The game does **not** run an in-game agent/LLM; it sends interaction payloads and receives JSON (dialogue + optional actions).
- **Image generation:** Done **inside Lovable**, not in the game. The game only displays what Lovable returns (e.g. `show_image` / `displayImage` action with URL or base64).
- **Two photographer-style NPCs:**
  - **Oracle of First Light (EV-5)** — `main/events/photographer.ts`: server-side only; full image display working.
  - **Photographer (EV-12)** — `main/events/photographer2.ts`: choice menu → socket to client → client `postMessage` to Lovable dashboard; image display in that path was **not** fully implemented (TODO in code).

### 1.2 Photographer (Oracle) — Server-Side Flow (Working)

1. **onAction:** Player talks to NPC → server POSTs to `LOVABLE_INTERACT_URL` with:
   - `playerId`, `mapId`, `entityId` (e.g. `EV-5`), `inputText: 'interact'`, `metadata` (positions, etc.).
2. **Response:** Lovable returns JSON:
   - `status: 'success'`
   - `displayText` — dialogue to show
   - `responseFormat.type` — e.g. `text_only`, `text_with_image`, `choice_menu`
   - `actions[]` — list of actions to apply (e.g. `show_image` / `displayImage`)
3. **Display text:** `player.showText(result.displayText, { talkWith: this })`.
4. **Apply actions:** Loop over `result.actions`; for `show_image` or `displayImage`:
   - Read `permanentUrl` (preferred) or `imageUrl` / `imageData`
   - Open GUI `image-display` with `{ imageUrl, permanentUrl, description, title }`
   - Optionally show a short `player.showText(description)` as well.

So in Codecamp, **image gen lives in Lovable**; the game only shows dialogue + runs “display image” actions.

### 1.3 Photographer2 — Choice Menu + Client Path (Partially Done)

1. **onAction:** Show greeting, then **choice menu** via `player.showChoices('Choose a photo style:', [...])`:
   - Nature, Portrait, Urban, Action, Wildlife, Architecture, Cancel.
2. **Map choice → inputText:** e.g. `nature` → `"take a photo of nature"` (see `LOVABLE_CHOICE_OPTIONS.md`).
3. **Server** does **not** call Lovable from server. Instead it emits socket event `lovable-interact-request` to the **client** with `{ playerId, mapId, entityId, inputText }`.
4. **Client** (`main/client.ts`):
   - Sends `postMessage` to parent (Lovable dashboard) with `GAME_INTERACT_REQUEST` and payload.
   - Listens for `INTERACT_RESPONSE`; if `result.actions` contains `show_image`, opens `image-display` GUI with `imageUrl`, `permanentUrl`, `description`, `title`.
5. **photographer2.ts** itself has an `applyDisplayImage` that was never used in this flow (it expected server-side actions); it’s a TODO that only shows text “Image display coming soon”.

So the **working** image display in Codecamp is either:
- Oracle (server → Lovable → server applies actions and opens `image-display`), or
- Any flow where the **client** receives `INTERACT_RESPONSE` with `show_image` and opens `image-display` (e.g. Artist EV-3 uses the same client path).

### 1.4 Dialogue Options & Multi-Turn

- **lovableDialogue.ts:** Central helper `getLovableDialogue(player, entityId, inputText?, conversationId?)`.
- **Response shape:** `LovableDialogueResponse`: `text`, optional `dialogueOptions[]` (id, label, metadata), optional `conversationId`.
- Many NPCs use this for **text-only** dialogue; the schema also allows `dialogueOptions` and `conversationId` for multi-turn / choice-driven flows (documented in LOVABLE_RESPONSE_SCHEMA.md as optional).
- **Choice menus** in Codecamp are implemented in-event with `player.showChoices()`; the **selected value** is then sent as `inputText` (e.g. photo type) to Lovable.

### 1.5 Display Image Feature

- **GUI:** `main/gui/ImageDisplay.vue`.
  - **Props:** `imageUrl`, `permanentUrl`, `description`, `title`.
  - Prefers `permanentUrl` when present (Supabase storage URL); falls back to `imageUrl` (e.g. base64).
  - Shows: overlay, title, image, description, loading/error, close button, Escape to close.
- **Action contract:** Backend sends `show_image` or `displayImage` with:
  - `permanentUrl` (optional) — preferred
  - `imageUrl` / `imageData` (optional) — fallback
  - `description`, `title` (optional)

### 1.6 Documented Contracts (Codecamp)

- **LOVABLE_RESPONSE_SCHEMA.md:** Success = `status` + `displayText`; optional `responseFormat`, `actions`, etc.
- **LOVABLE_CHOICE_OPTIONS.md:** Maps Artist/Photographer choices to `inputText` (e.g. `"take a photo of nature"`) and describes how Lovable should return `show_image` with `imageUrl`/`permanentUrl` and optional description/title.

---

## 2. How Open-RPG Does It Today

- **AI:** In-game agent system (OpenClaw-inspired): AgentManager, AgentRunner, perception, skills, bridge. Photographer is an **AI NPC** (e.g. `photographer` agentId) with a **generate_image** skill.
- **Image gen:** Supabase Edge Function `generate-image` (Gemini). Triggered either:
  - By **player flow:** Photographer onAction → Yes/No choice → open `photo-request` form → player submits prompt + style → **player.gui submit handler** in `player.ts` calls edge function → on success opens `photo-result` with image URL and prompt.
  - By **agent skill:** When the LLM calls `generate_image`, the skill calls the same edge function and returns an in-character result; showing the image to the player in that path is a separate concern (e.g. via skill result + optional GUI).
- **Dialogue:** Single Yes/No at start (“Would you like me to take a photo?”); then either open photo form or go to normal chat (bridge.handlePlayerAction). No predefined “photo type” choices.
- **Display:** We have `photo-request.vue` (prompt + style inputs) and `photo-result.vue` (image + caption). We do **not** have a generic `image-display` component that accepts title + description + permanentUrl like Codecamp’s.

---

## 3. Gaps and Opportunities (How to Model Codecamp in Open-RPG)

| Area | Codecamp | Open-RPG | Recommendation |
|------|----------|----------|----------------|
| **Photo type choices** | Predefined menu (Nature, Portrait, Urban, etc.) mapped to prompts. | Free-text prompt only (plus optional style). | Add an **optional** first step: show choices (e.g. “What kind of photo?”) and map choice to a suggested prompt or style so the AI/photographer can use it (e.g. in system prompt or as prefilled hint). Keeps our free-text flexibility while guiding players. |
| **Display image GUI** | Single `ImageDisplay.vue`: title, description, permanentUrl/imageUrl, loading/error. | `photo-result.vue`: image + prompt caption only. | Consider a **unified image display** component (or extend photo-result) that supports **title** and **description** from the agent/edge (e.g. “Portrait in the garden”) so the photographer can “name” the photo in character. |
| **Dialogue + image in one flow** | Backend returns both `displayText` and `actions`; game shows text then runs actions (e.g. show image + optional line). | We show text via agent dialogue; image is shown either by form submit (photo-result) or could be triggered by skill result. | When the **agent** completes a `generate_image` skill, we could explicitly show a short in-character line (e.g. “Here’s your portrait.”) **then** open the image GUI with title/description, mirroring Codecamp’s “displayText + displayImage” pattern. |
| **Error messages** | Handled by Lovable; game shows generic or returned message. | We already have in-character error messages (e.g. “The photograph did not turn out…”) in both player flow and skill. | Keep and reuse; optionally align wording with a single source (e.g. same strings in player.ts and generate_image skill). |
| **Permanent URL** | Backend can return `permanentUrl` (Supabase); GUI prefers it over base64. | Edge function can return URL or data URL; we store in player `PHOTOS` and show in photo-result. | If we add Supabase storage for generated images, return and prefer `permanentUrl` in our GUI (like Codecamp) for performance and sharing. |

---

## 4. Suggested Directions for the PM (No Implementation)

1. **Optional photo-type choices:** Add a choice step (e.g. “What would you like?” → Nature / Portrait / Custom / etc.). “Custom” opens current free-text form; others can prefill or pass a hint to the agent/edge so the photographer “knows” the category. Aligns with Codecamp’s UX without removing free-form prompts.
2. **Unified image display:** One component (or clear contract) that accepts title + description + image URL (and optional permanentUrl). Use it for both “player requested photo” and “agent generated photo” so the photographer can always present the image with a short in-character title/description.
3. **Agent skill → show image flow:** When the AI uses `generate_image`, after a successful result, trigger the same image display GUI (with optional in-character caption/title) so the player sees the photo in a consistent way whether they used the form or chatted (“take a photo of the sunset”).
4. **Storage and URLs:** If we persist generated images in Supabase, have the edge function return a `permanentUrl` and use it in the display component (like Codecamp) for better performance and future features (e.g. gallery).

This report is for PM handoff only; no code changes were made.
