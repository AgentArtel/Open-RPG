# G-2 Photographer — Deploy Checklist

Use this checklist to enable the Photographer NPC image generation (Gemini Imagen) in your environment.

## 1. Apply migration 010

Migration 010 adds `generate_image` to the photographer's skills array in `game.agent_configs`.

- **Option A (Supabase CLI):** From project root run `supabase db push` (if you use linked migrations), or apply the file manually.
- **Option B (SQL Editor):** In Supabase Dashboard → SQL Editor, run the contents of [supabase/migrations/010_photographer_generate_image_skill.sql](../supabase/migrations/010_photographer_generate_image_skill.sql).

## 2. Deploy the Edge Function

From the project root:

```bash
supabase functions deploy generate-image
```

## 3. Set the Gemini API key

The Edge Function reads `GEMINI_API_KEY` from Supabase secrets (not from `.env`):

```bash
supabase secrets set GEMINI_API_KEY=your-gemini-api-key-here
```

Get an API key from [Google AI Studio](https://aistudio.google.com/) or the Gemini/Imagen API setup.

---

After these steps, the Photographer NPC can generate images via Path A (preset choices in conversation) or Path B (LLM invokes the `generate_image` skill).

## Verification

1. **Path A:** Start the game, talk to the Photographer, choose "Would you like me to take a photo?" → Yes, pick a preset (e.g. Nature). Wait for the result; on next interaction you should see "Do you want to see your photo?" and the photo-result GUI.
2. **Path B (optional):** In conversation, ask the Photographer to take a photo of something; the LLM may call the `generate_image` skill and the photo-result GUI should open immediately.
