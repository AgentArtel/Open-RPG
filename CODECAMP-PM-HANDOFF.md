# Codecamp Investigation — PM Review Request

Hi — here’s a short summary of the Codecamp-Artel-MMORPG investigation and two deliverables for your review.

---

## What Was Done

We cloned and reviewed the old RPG project ([Codecamp-Artel-MMORPG](https://github.com/AgentArtel/Codecamp-Artel-MMORPG)) to see how it implemented the photographer, image generation, dialogue options, display image, and other notable patterns — and whether we should adopt any of it in our current game + Studio + database setup.

**No code was changed** in our repo; this is analysis and recommendation only.

---

## Findings in Brief

- **Codecamp’s model:** The game is a thin client. All dialogue and image generation live in an external “Lovable” backend (Supabase Edge). NPCs are shells that POST to that API and display the response; some also use a client-side postMessage bridge for artist/photographer flows.
- **Our model:** We run agents in-process (AgentRunner, skills, memory) and call a Supabase Edge Function only for image generation. We already have a single generic NPC event, DB-driven config, and token-gated skills.
- **Conclusion:** Our architecture is the right base. We should **keep it** and **selectively adopt** specific Codecamp patterns (identity bridge, spawn retry/error reporting, dynamic dialogue options, image display UX, iframe protocol, telemetry) rather than migrate to their approach.

---

## Documents for Your Review

1. **[CODECAMP-PHOTOGRAPHER-INVESTIGATION-REPORT.md](./CODECAMP-PHOTOGRAPHER-INVESTIGATION-REPORT.md)**  
   - How Codecamp implemented the photographer (Oracle + Photographer2), image gen, dialogue choices, and the display-image feature.  
   - Comparison with our current flow.  
   - Recommendations for improving our photographer NPC (optional photo-type choices, unified image display, agent skill → show image, permanent URLs).

2. **[CODECAMP-REVIEW-LIST.md](./CODECAMP-REVIEW-LIST.md)**  
   - Full list of 15 notable patterns from Codecamp (AI control bridge, DB-driven spawn, TMX sync, generic NPC with dynamic options, identity bridge, photographer choices, branching narrative, multi-turn dialogue, interactive objects, postMessage protocol, action dispatch, telemetry, etc.).  
   - For each: what it does, why it matters, how we could model it.  
   - **Recommendation section at the end:** what to keep, what to adopt, what to consider later, and what not to migrate — with clear reasoning.

---

## Ask for You

When you have time, please review the two linked docs and the recommendation in **CODECAMP-REVIEW-LIST.md**. If you’re aligned, we can treat that as the agreed “selective adoption” plan and turn the high-priority items into tasks as needed. If you’d rather prioritize or drop any of the suggested adoptions, we can adjust the plan accordingly.

Thanks.
