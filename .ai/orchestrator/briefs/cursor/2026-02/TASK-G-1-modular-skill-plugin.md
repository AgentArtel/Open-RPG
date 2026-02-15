# TASK-G-1: Modular Skill Plugin System

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Open-RPG (game)
**Agent:** Cursor
**Game-repo task:** TASK-018a
**Priority:** Wave 1 (start now, no blockers)
**Depends on:** Nothing
**Blocks:** G-2 (Photographer NPC)

---

## Goal

Replace the hardcoded `skillMap` in `AgentManager.ts` with a plugin-based skill registry so new skills can be added by creating a file and adding one barrel export line — no core edits required.

## Context

The current `registerSkillsFromConfig()` has a hardcoded map of 5 skills. Adding a new skill requires editing 3 core files. This blocks the Photographer NPC (G-2) and every future API-backed NPC. The approved architecture is in `Open-RPG/.ai/idea/14-modular-skill-plugin-architecture.md`.

## Deliverables

1. **`SkillPlugin` interface** — `name`, `create` factory, optional `requiredItem`, `requiresEnv[]`, `category`.
2. **`SkillDependencies` type** — dependencies injected into skill factories (e.g., Supabase client, NPC event reference).
3. **Static barrel file** (`src/agents/skills/plugins.ts`) — re-exports all skill plugins. Adding a skill = adding one line here.
4. **Refactored `AgentManager`** — reads the barrel instead of hardcoded map. Iterates plugins, checks config + inventory + env, registers matching skills.
5. **`skillPlugin` exports on all 5 existing skills** — move, say, look, emote, wait each export a `skillPlugin` object alongside their existing exports.
6. **Item-gated skill access** — skills with `requiredItem` check `AgentConfig.inventory` at registration time. If the item is missing, the skill is not registered (or registered with an in-character failure wrapper).
7. **In-character failure messages** — when a gated skill fails (missing item, missing env var), it returns a narrative failure string the LLM can use naturally.

## Acceptance Criteria

- [ ] `AgentManager.ts` no longer contains a hardcoded `skillMap` object.
- [ ] All 5 existing skills (`move`, `say`, `look`, `emote`, `wait`) work exactly as before (no regression).
- [ ] A new skill can be added by: (a) creating a skill file with a `skillPlugin` export, (b) adding one re-export line to `plugins.ts`. No other files need editing.
- [ ] `SkillPlugin.requiredItem` is respected: a skill with `requiredItem: 'image-gen-token'` is only available to NPCs whose `inventory` includes `'image-gen-token'`.
- [ ] Missing env vars produce a warning log but don't prevent registration (the skill returns an in-character failure at runtime).
- [ ] The game server starts and all existing NPCs behave identically to before.

## Do

- Use a static barrel file (explicit re-exports), not `fs.readdirSync` or dynamic imports.
- Keep TypeScript type safety — `SkillPlugin` should be fully typed.
- Keep the `IAgentSkill` interface unchanged (backward compatible).
- Follow the three-layer architecture from idea 14: Discovery, Scoping, Capability Negotiation.

## Don't

- Don't add the `generate_image` skill yet — that's G-2.
- Don't change the `AgentConfig` YAML schema (it already has `inventory`).
- Don't introduce runtime dependencies on MCP or any external protocol — this is in-process only.
- Don't break the existing NPC behavior for the 4 seed NPCs.

## Reference

- Architecture spec: `Open-RPG/.ai/idea/14-modular-skill-plugin-architecture.md`
- Current hardcoded skillMap: `src/agents/core/AgentManager.ts` (look for `registerSkillsFromConfig`)
- Existing skill files: `src/agents/skills/`
