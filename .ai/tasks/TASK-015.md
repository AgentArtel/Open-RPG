## TASK-015: NPC Speech Bubble GUI

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 5 (Polish)
- **Type**: Create + Modify
- **Depends on**: TASK-007 (Skill System), TASK-009 (Bridge)
- **Blocks**: Nothing

### Context

AI NPCs currently speak via `player.showText()`, which opens a blocking modal dialog.
The player can't move while the dialog is open. This works for intentional action-key
conversations but is terrible for ambient greetings (proximity), idle musings, and
any scenario where the NPC should "talk" without freezing the player.

RPGJS supports `rpgAttachToSprite: true` on Vue GUI components, which makes the
component follow the sprite's position on the map. Combined with a timed auto-dismiss,
this gives us floating speech bubbles above NPCs — non-blocking, ambient, and natural.

### Objective

A floating speech bubble GUI component that displays NPC text above their sprite,
auto-fades after a configurable duration, and doesn't block player movement. The `say`
skill gets a `mode` parameter to choose between modal dialogue and ambient bubble.

### Specifications

**Create files:**
- `main/gui/npc-bubble.vue` — Sprite-attached bubble component (~80-120 lines)

**Modify files:**
- `src/agents/skills/skills/say.ts` — Add `mode` parameter (`'modal'` | `'bubble'`)
- `src/agents/bridge/GameChannelAdapter.ts` — Use bubble mode for proximity/idle events

**Speech Bubble Component (`main/gui/npc-bubble.vue`):**

```vue
<template>
  <div v-if="message" class="npc-bubble">
    <div class="bubble-content">
      <span class="npc-name">{{ npcName }}</span>
      <p class="bubble-text">{{ message }}</p>
    </div>
    <div class="bubble-arrow"></div>
  </div>
</template>

<script>
export default {
  name: 'npc-bubble',
  rpgAttachToSprite: true,   // KEY: follows sprite position
  props: ['spriteData'],
  data() {
    return {
      message: '',
      npcName: '',
      fadeTimer: null
    }
  }
}
</script>
```

Key behaviors:
- `rpgAttachToSprite: true` anchors the bubble above the NPC sprite
- Message auto-clears after 4 seconds (configurable via prop or data)
- CSS fade-out animation before clearing
- Max width ~200px, word wrap, dark semi-transparent background
- Positioned above the sprite (negative top offset)
- If a new message arrives while one is showing, replace it and reset the timer

**Say Skill Modification (`src/agents/skills/skills/say.ts`):**

Add a `mode` parameter to the skill definition:

```typescript
parameters: {
  message: { type: 'string', required: true },
  target: { type: 'string', required: false },
  mode: { type: 'string', required: false }  // 'modal' | 'bubble', default varies by context
}
```

Execution logic:
```typescript
const mode = params.mode ?? context.defaultSpeechMode ?? 'modal'

if (mode === 'bubble') {
  // Open the sprite-attached bubble GUI on the NPC event
  // Use player.gui('npc-bubble').open() or event component approach
  context.event.showBubble?.(message)  // Implementation detail
} else {
  // Existing modal behavior
  await targetPlayer.showText(message, { talkWith: context.event })
}
```

**Three-Tier Speech Strategy:**

| Event Type | Default Mode | Why |
|------------|-------------|-----|
| `player_action` | `modal` | Intentional interaction → full dialogue feels right |
| `player_proximity` | `bubble` | Greeting → non-blocking, player keeps moving |
| `idle_tick` | `bubble` | Ambient musing → NPC talks to itself, no interaction needed |

Pass `defaultSpeechMode` through the `GameContext` based on the `AgentEvent.type`:
- In `GameChannelAdapter`, set `context.defaultSpeechMode = 'bubble'` for proximity/idle
- In `GameChannelAdapter`, set `context.defaultSpeechMode = 'modal'` for player_action
- LLM can still override by explicitly passing `mode` in tool call

**Thinking Indicator (bonus, stretch goal):**

Show `EmotionBubble.ThreeDot` while the LLM is generating a response:
```typescript
// In GameChannelAdapter.enqueueRun(), before calling runner.run():
event.showEmotionBubble(EmotionBubble.ThreeDot)
// After runner.run() completes, the skill execution handles the response
```

### Acceptance Criteria

- [ ] `main/gui/npc-bubble.vue` renders a floating text bubble above the NPC sprite
- [ ] Bubble auto-dismisses after ~4 seconds with fade animation
- [ ] `say` skill accepts `mode: 'bubble'` parameter and renders via bubble GUI
- [ ] `say` skill defaults to `modal` for `player_action`, `bubble` for proximity/idle
- [ ] Player can move freely while a bubble is displayed
- [ ] Multiple NPCs can show bubbles simultaneously
- [ ] New message on same NPC replaces existing bubble and resets timer
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Remove the existing modal `showText()` path — it's still used for action-key conversations
- Add chat input or reply functionality (that's a separate feature)
- Store bubble history (conversation log is TASK-016)
- Add typewriter text animation to bubbles (keep it simple, instant display)
- Modify the emotion bubbles plugin — it already works, use it as-is
- Over-style the bubble — simple dark background, white text, small arrow pointer

### Reference

- Builder dashboard (Vue GUI reference): `main/gui/builder-dashboard.vue`
- Say skill: `src/agents/skills/skills/say.ts`
- Bridge adapter: `src/agents/bridge/GameChannelAdapter.ts`
- Emotion bubbles: `@rpgjs/plugin-emotion-bubbles` (already installed)
- Plugin analysis (speech bubble section): `docs/rpgjs-plugin-analysis.md`
- RPGJS GUI API: `docs/rpgjs-guide.md` (Section 8)
- `rpgAttachToSprite` pattern: RPGJS v4 docs, sprite-attached GUI

### Handoff Notes

_(To be filled by implementer)_
