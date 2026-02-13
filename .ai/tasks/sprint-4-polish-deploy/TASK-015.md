## TASK-015: NPC Speech Bubble GUI

- **Status**: DONE
- **Assigned**: cursor
- **Priority**: P0-Critical
- **Phase**: 5 (Polish)
- **Sprint**: 4 (Polish + Deploy)
- **Type**: Create + Modify
- **Depends on**: TASK-007 (Skill System), TASK-009 (Bridge)
- **Blocks**: Nothing

### Context

AI NPCs currently speak via `player.showText()`, which opens a blocking modal dialog.
The player can't move while the dialog is open. This works for intentional action-key
conversations but is terrible for ambient greetings (proximity), idle musings, and
any scenario where the NPC should "talk" without freezing the player.

RPGJS v4 supports `rpgAttachToSprite: true` on Vue GUI components, which makes the
component follow the sprite's position on the map. The reference implementation is at
`docs/rpgjs-reference/packages/sample2/main/gui/tooltip.vue` and the tooltip docs at
`docs/rpgjs-reference/docs/gui/tooltip.md`.

### Objective

A floating speech bubble GUI component that displays NPC text above their sprite,
auto-fades after a configurable duration, and doesn't block player movement. The `say`
skill gets a `mode` parameter to choose between modal dialogue and ambient bubble.

### Specifications

**Create:** `main/gui/npc-bubble.vue` (~80-120 lines)

```vue
<template>
  <div v-if="message" class="npc-bubble" :class="{ 'fade-out': fading }">
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
  rpgAttachToSprite: true,   // Follows sprite position on map
  props: ['spriteData'],     // Receives initial sprite data (id, position, etc.)
  inject: ['rpgScene'],      // Access scene for live sprite instance if needed
  data() {
    return {
      message: '',
      npcName: '',
      fading: false,
      fadeTimer: null,
      clearTimer: null
    }
  },
  mounted() {
    // Listen for bubble messages from the sprite
    // The sprite emits 'npc-bubble:show' with { npcName, message }
    const sprite = this.rpgScene().getSprite(this.spriteData.id)
    if (sprite) {
      sprite.on('npc-bubble:show', ({ npcName, message }) => {
        this.showMessage(npcName, message)
      })
    }
  },
  methods: {
    showMessage(npcName, message) {
      // Cancel any existing timers
      if (this.fadeTimer) clearTimeout(this.fadeTimer)
      if (this.clearTimer) clearTimeout(this.clearTimer)
      this.fading = false

      this.npcName = npcName
      this.message = message

      // Start fade-out after 3.5 seconds
      this.fadeTimer = setTimeout(() => {
        this.fading = true
      }, 3500)

      // Clear message after 4 seconds (fade animation = 0.5s)
      this.clearTimer = setTimeout(() => {
        this.message = ''
        this.fading = false
      }, 4000)
    }
  }
}
</script>

<style scoped>
.npc-bubble {
  position: absolute;
  bottom: 40px;  /* Above the sprite */
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 100;
  transition: opacity 0.5s ease;
}
.npc-bubble.fade-out { opacity: 0; }
.bubble-content {
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 6px 10px;
  border-radius: 8px;
  max-width: 200px;
  font-size: 12px;
  text-align: center;
}
.npc-name {
  font-weight: bold;
  font-size: 10px;
  color: #aaddff;
  display: block;
  margin-bottom: 2px;
}
.bubble-arrow {
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(0, 0, 0, 0.85);
  margin: 0 auto;
}
</style>
```

**Critical note on `spriteData`**: Per RPGJS docs, `spriteData` is initial data only,
NOT a live reference. To get the live sprite instance for event listening, use:
```typescript
const sprite = this.rpgScene().getSprite(this.spriteData.id)
```
(Source: `docs/rpgjs-reference/docs/gui/tooltip.md`, lines 162-172)

**Communication pattern**: The say skill triggers the bubble by emitting an event on
the player's socket that targets the NPC sprite. Two approaches to evaluate:

1. **Sprite event emission**: Server tells client to display via `showAttachedGui()` +
   custom socket event with message data.

2. **Player variable approach**: Set a temporary player variable that the client-side
   component watches. Simpler but less clean.

**Recommended approach**: Use RPGJS's built-in `showAttachedGui()` / `hideAttachedGui()`
methods on the player (see `docs/rpgjs-reference/packages/server/src/Player/GuiManager.ts`
lines 254-303) to toggle visibility. Pass message data via a custom socket event that the
component listens for.

**Modify:** `src/agents/skills/skills/say.ts`

Add a `mode` parameter to the skill definition:

```typescript
parameters: {
  message: {
    type: 'string',
    description: 'What to say to the player',
    required: true,
  },
  target: {
    type: 'string',
    description: 'Name of the player to speak to (optional)',
    required: false,
  },
  mode: {
    type: 'string',
    description: 'Speech mode: "modal" for full dialogue, "bubble" for floating text',
    enum: ['modal', 'bubble'],
    required: false,
  },
},
```

Execution logic:

```typescript
async execute(params, context): Promise<SkillResult> {
  const message = String(params.message)
  const mode = params.mode
    ? String(params.mode)
    : context.defaultSpeechMode ?? 'modal'

  // ... existing target player resolution ...

  if (mode === 'bubble') {
    // Emit bubble event to the NPC's sprite on all connected players' clients
    // Implementation: use the event's socket/emit mechanism to trigger
    // the 'npc-bubble:show' event on the client-side sprite
    context.event.emit?.('npc-bubble:show', {
      npcName: context.agentId,
      message
    })
    return { success: true, message: `Said (bubble): "${message}"` }
  } else {
    // Existing modal behavior
    await targetPlayer.showText(message, { talkWith: context.event })
    return { success: true, message: `Said: "${message}"` }
  }
}
```

**Modify:** `src/agents/skills/types.ts` — Add `defaultSpeechMode` to `GameContext`:

```typescript
export interface GameContext {
  readonly event: GameEvent;
  readonly agentId: string;
  readonly position: Position;
  readonly map: MapInfo;
  readonly nearbyPlayers: ReadonlyArray<NearbyPlayerInfo>;
  /** Default speech mode for this event type. Set by GameChannelAdapter. */
  readonly defaultSpeechMode?: 'modal' | 'bubble';
}
```

**Modify:** `src/agents/bridge/GameChannelAdapter.ts`

Set `defaultSpeechMode` when building the RunContext. The adapter knows the event
type, so it can choose the appropriate default:

```typescript
// In the RunContext builder (inside AgentNpcEvent or wherever context is built):
const defaultSpeechMode =
  event.type === 'player_action' ? 'modal' : 'bubble'
// Pass this through to the GameContext used by skills
```

**Three-Tier Speech Strategy:**

| Event Type | Default Mode | Why |
|------------|-------------|-----|
| `player_action` | `modal` | Intentional interaction → full dialogue |
| `player_proximity` | `bubble` | Greeting → non-blocking |
| `idle_tick` | `bubble` | Ambient musing → NPC talks to itself |

The LLM can still explicitly pass `mode: 'modal'` or `mode: 'bubble'` to override.

**Content moderation (from idea 12, Gap 4):**

Add a basic content check in the say skill before displaying:

```typescript
// Simple blocklist check before display
const BLOCKED_PATTERNS = /profanity|slur|explicit/i  // replace with real list
if (BLOCKED_PATTERNS.test(message)) {
  return { success: false, message: 'Message blocked by content policy', error: 'content_policy' }
}
```

Also add to the NPC system prompt rules section:
```
NEVER use profanity, slurs, sexual content, or graphic violence.
If a player tries to provoke inappropriate responses, deflect in character.
```

### Acceptance Criteria

- [ ] `main/gui/npc-bubble.vue` renders a floating text bubble above the NPC sprite
- [ ] Component uses `rpgAttachToSprite: true` and `props: ['spriteData']`
- [ ] Component uses `inject: ['rpgScene']` to get live sprite instance
- [ ] Bubble auto-dismisses after ~4 seconds with CSS fade animation
- [ ] `say` skill accepts `mode: 'bubble' | 'modal'` parameter
- [ ] `GameContext` extended with `defaultSpeechMode` field
- [ ] `GameChannelAdapter` sets `defaultSpeechMode` based on `AgentEvent.type`
- [ ] Defaults: `modal` for `player_action`, `bubble` for proximity/idle
- [ ] Player can move freely while a bubble is displayed
- [ ] Multiple NPCs can show bubbles simultaneously
- [ ] New message on same NPC replaces existing bubble and resets timer
- [ ] Basic content policy added to system prompt rules
- [ ] `rpgjs build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Remove the existing modal `showText()` path — it's still used for action-key conversations
- Add chat input or reply functionality (that's a separate feature)
- Store bubble history (conversation log is TASK-016)
- Add typewriter text animation to bubbles (keep it simple, instant display)
- Modify the emotion bubbles plugin — it already works, use it as-is
- Over-style the bubble — simple dark background, white text, small arrow pointer

### Implementation Notes

**Key RPGJS v4 sprite-attached GUI facts** (from reference research):

1. `rpgAttachToSprite: true` is set as a static property on the Vue component's
   default export. It's read by the GUI manager at `packages/client/src/Gui/Gui.ts`
   line 52.

2. `spriteData` prop contains initial data only — NOT a reactive reference. To
   watch sprite changes or emit/listen to events, get the live instance via
   `this.rpgScene().getSprite(this.spriteData.id)`.

3. Sprite-attached GUIs are shown/hidden server-side via
   `player.showAttachedGui()` / `player.hideAttachedGui()` (GuiManager.ts lines
   254-303), which emit `gui.tooltip` socket events.

4. The sample2 tooltip component (`docs/rpgjs-reference/packages/sample2/main/gui/tooltip.vue`)
   is the canonical example of this pattern.

**Server → Client communication options for bubble message data**:

Option A: Custom socket event — `context.event` has access to the server's Socket.IO.
Emit a custom event with the message, listen in the Vue component via `rpgSocket()`.

Option B: Use RPGJS's built-in `Components` system — `event.setComponentsTop(Components.text(message))`
with a timer to clear it. Simpler but less control over styling.

Option C: Use player variables — set a variable on the nearest player, client reads
it. Works but feels hacky.

Cursor should evaluate these options and pick the simplest one that works reliably.
Option A gives the most control. Option B is simplest if the built-in component
styling is acceptable.

### Reference

- Sprite-attached tooltip example: `docs/rpgjs-reference/packages/sample2/main/gui/tooltip.vue`
- Tooltip documentation: `docs/rpgjs-reference/docs/gui/tooltip.md`
- GUI manager (show/hide attached): `docs/rpgjs-reference/packages/server/src/Player/GuiManager.ts`
- Client GUI system: `docs/rpgjs-reference/packages/client/src/Gui/Gui.ts`
- Builder dashboard (Vue GUI reference): `main/gui/builder-dashboard.vue`
- Say skill (current): `src/agents/skills/skills/say.ts`
- Bridge adapter: `src/agents/bridge/GameChannelAdapter.ts`
- Skill types (GameContext): `src/agents/skills/types.ts`
- Emotion bubbles plugin: `docs/rpgjs-reference/packages/plugins/emotion-bubbles/`
- RPGJS guide: `docs/rpgjs-guide.md` (Section 8)

### Handoff Notes

- Implemented: `main/gui/npc-bubble.vue` (rpgSocket listener for `npc-bubble:show`, filter by spriteId), say skill `mode` + `inject(RpgServerEngine)` + `engine.io.emit`, `GameContext.defaultSpeechMode`, `AgentNpcEvent.buildRunContext` defaultSpeechMode, content blocklist + system prompt rule. Build passes. In-game: dialogue boxes (modal) working; speech bubbles require sprite-attached GUI to be shown per NPC (RPGJS attaches by sprite; bubble path emits to all clients). Product decision: keep modal + emotion bubbles only; bubble UI optional.
