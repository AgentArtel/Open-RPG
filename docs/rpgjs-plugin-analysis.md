# RPGJS Plugin Analysis: Use vs Build

What RPGJS v4 gives us out of the box, and what we need to build custom for AI NPCs.

**Key discovery:** `RpgEvent extends RpgPlayer` — NPCs inherit ALL player methods
(`showAnimation`, `showText`, `showNotification`, components API, etc.).

---

## Plugins to USE (install + configure)

### 1. @rpgjs/plugin-emotion-bubbles — USE AS-IS

**What it does:** 30+ animated emotion icons (!, ?, heart, zzz, ...) that pop
above any sprite.

**Why we need it:** The `emote` skill (TASK-007) maps directly to this. When
the LLM outputs an emotion, the NPC shows it visually.

**API (works on NPCs since RpgEvent extends RpgPlayer):**
```ts
import { EmotionBubble } from '@rpgjs/plugin-emotion-bubbles'

// In an NPC event:
this.showEmotionBubble(EmotionBubble.ThreeDot)  // thinking "..."
this.showEmotionBubble(EmotionBubble.Exclamation) // alert
this.showEmotionBubble(EmotionBubble.Happy)       // happy
this.showEmotionBubble(EmotionBubble.Question)    // confused
```

**Available emotions:** Confusion, Question, Exclamation, Surprise, Happy, Sad,
Angry (Hangry), Sleep (Z/zZ), Idea, Music, Star(s), Dollar, Like(s), Cloud,
Cross, Circle, ThreeDot, OneDot, TwoDot, HaHa, Jaded, Bead(s), Empty.

**Cost to build from scratch:** ~200 lines + spritesheet artwork. Not worth it.

**Integration with our emote skill:**
```ts
// In skills/emote.ts
const emotionMap: Record<string, EmotionBubble> = {
  'wave':       EmotionBubble.Happy,
  'nod':        EmotionBubble.Exclamation,
  'shake_head': EmotionBubble.Cross,
  'laugh':      EmotionBubble.HaHa,
  'think':      EmotionBubble.ThreeDot,
}
```

**Verdict:** Install it. Zero customization needed. Already in sample2's package.json.

---

### 2. @rpgjs/default-gui — USE (dialogue components)

**What it does:** Full RPG UI kit — dialogue boxes (typewriter effect), choices,
notifications, menus, shop, battle UI.

**Why we need it:** `player.showText()` and `player.showChoices()` depend on
`rpg-dialog` GUI from this plugin. Without it, these APIs do nothing.

**What we use:**
- **Dialogue box** (`dialog.vue`) — NPC conversations via `player.showText()`
- **Choice UI** (`choice.vue`) — Branching dialogue via `player.showChoices()`
- **Notifications** (`alert.vue`) — System messages via `player.showNotification()`

**What we don't use (yet):**
- Menu system (equipment, items, save) — future, not MVP
- Battle UI — no combat system in MVP
- Shop UI — no economy in MVP

**showText API (works on NPCs):**
```ts
// In an NPC event's onAction:
await player.showText('Hello, traveler!', {
  talkWith: this,       // NPC faces player
  typewriterEffect: true,
  position: 'bottom',
  autoClose: false       // player must press Enter
})
```

**Important:** `showText` is **blocking** — the player can't move while the
dialogue box is open. This is correct for NPC conversations (player pressed
action key and expects a dialogue), but NOT for ambient NPC chatter. For that,
we'll build a custom speech bubble (see "Build Custom" section).

**Cost to build from scratch:** 500+ lines. Typewriter effect, choice navigation,
keyboard handling, theming. Not worth it.

**Verdict:** Install it. Use the dialogue/choice/notification components.
Skip menus and battle UI until later phases.

---

### 3. @rpgjs/gamepad — USE (already installed)

**What it does:** Xbox/PlayStation controller support for player movement.

**Why:** Low effort, nice for players who test with controllers. Already in
sample2's dependencies. Doesn't affect NPC logic at all.

**Verdict:** Keep it. Zero maintenance burden.

---

## Plugins to SKIP

### 4. @rpgjs/chat — SKIP (build custom instead)

**What it does:** Map-scoped real-time player-to-player text chat.

**Why skip:**
- Designed for player-to-player messaging, not NPC dialogue
- Messages broadcast to ALL players on the map (no private/targeted)
- No way to inject NPC messages into the stream
- No conversation state management
- We need something fundamentally different: NPC-to-player dialogue
  with LLM integration, conversation state machine, and per-NPC targeting

**What we'd build instead:** A custom `npc-chat` GUI that:
- Shows NPC speech above the NPC sprite (sprite-attached bubble)
- Supports typing indicator ("..." via EmotionBubble.ThreeDot)
- Routes through our agent system, not socket broadcast
- Handles per-NPC conversation state

**Effort to adapt @rpgjs/chat:** Higher than building custom. We'd have to
rip out the broadcast model, add NPC routing, change the UI to bubbles, and
add LLM integration. Easier to start fresh using the tooltip pattern.

---

### 5. @rpgjs/save — SKIP for MVP

**What it does:** Save/load to browser LocalStorage with slot selection GUI.

**Why skip for now:** Our agent memory system (`src/agents/memory/`) handles
NPC state persistence via JSON files. Player state persistence is a Phase 5
concern. The plugin saves player data (position, inventory, level) — not agent
memory. We'd need both systems eventually, but not for MVP.

**Revisit:** Phase 5 when we add persistence across sessions.

---

### 6. @rpgjs/title-screen — SKIP

**What it does:** Title screen + MMORPG login (MongoDB auth).

**Why skip:** We deploy on Railway and embed in a Lovable iframe. The frontend
handles the entry experience. No MongoDB auth needed for MVP.

---

### 7. @rpgjs/mobile-gui — SKIP for MVP

**What it does:** Virtual joystick for mobile touch controls.

**Why skip:** Desktop-first for AI agent demos. Add later if needed.

---

### 8. @rpgjs/fx — SKIP for MVP

**What it does:** Particle effects (explosions, magic, weather).

**Why skip:** No combat or magic in MVP. Pure eye-candy for later.

---

### 9. @rpgjs/interpreter — SKIP

**What it does:** Node-based visual scripting for event flows (like RPG Maker).

**Why skip:** Our NPC behavior is LLM-driven, not scripted. The agent system
replaces the need for visual scripting. If we ever need fixed dialogue trees
(non-AI NPCs), this could be reconsidered.

---

### 10. @rpgjs/web3 — SKIP

**What it does:** MetaMask wallet authentication.

**Why skip:** Not a blockchain game.

---

### 11. @rpgjs/agones — SKIP

**What it does:** Kubernetes game server scaling.

**Why skip:** Deploying on Railway, not Kubernetes. Scale concern for much later.

---

## Built-in Features to USE (no plugin needed)

### 12. Components API — USE for NPC labels

**What it does:** Add text, bars, shapes, images above/below sprites.
Server-authoritative, auto-synced to all clients.

**For AI NPCs:**
```ts
// Display NPC name above head
this.setComponentsTop(Components.text('{name}'))

// Show last-said message below name (updates when property changes)
this.setComponentsTop([
  Components.text('{name}'),
  Components.text('{lastMessage}')  // agent sets this.lastMessage
], { width: 150 })
```

**Key gotcha:** Use template strings `'{name}'` NOT interpolated values
`this.name`. Only changed values sync, not entire layout.

**Verdict:** Use for NPC name tags. Possibly for short speech snippets.
For full conversation bubbles, use sprite-attached GUI instead.

---

### 13. attachShape() + onDetectInShape — USE for proximity

**What it does:** Creates an invisible detection zone around an NPC. Fires
events when players enter/leave.

**Already in our architecture.** Test NPC uses this correctly:
```ts
this.attachShape({ height: 100, width: 100, positioning: ShapePositioning.Center })
```

Maps to `player_proximity` / `player_leave` AgentEvent types.

---

### 14. Movement API — USE for NPC movement

```ts
// In NPC events:
this.infiniteMoveRoute([Move.tileRandom()])  // idle wandering
await this.moveRoutes([Move.right(), Move.right()])  // specific path
this.speed = 1  // tiles per second
this.frequency = 200  // movement tick ms
```

Maps to our `move` skill.

---

### 15. showAnimation — USE (via emotion bubbles)

Already used internally by `showEmotionBubble()`. Can also be used directly
for custom animations if we add spritesheets later.

---

## What We Build CUSTOM

### A. NPC Speech Bubble (sprite-attached GUI)

**Why:** `showText()` is modal/blocking. We need ambient, non-blocking speech
bubbles that float above NPCs while the player can still move.

**How:** RPGJS supports `rpgAttachToSprite: true` on GUI components:
```vue
<!-- main/gui/npc-bubble.vue -->
<template>
  <div class="npc-bubble" v-if="message || thinking">
    <div v-if="thinking" class="thinking">...</div>
    <div v-else class="speech">{{ message }}</div>
  </div>
</template>

<script>
export default {
  name: 'npc-bubble',
  rpgAttachToSprite: true,
  props: ['spriteData'],
  data() { return { message: '', thinking: false } }
}
</script>
```

**When to show which:**
- `player_action` (player pressed action key) → use `showText()` (modal dialogue, standard RPG feel)
- `player_proximity` (NPC greets nearby player) → use sprite-attached bubble (non-blocking)
- `idle_tick` (NPC muses aloud) → use sprite-attached bubble (non-blocking)

**Estimated effort:** ~100 lines Vue + ~50 lines bridge integration.
**Assigned to:** Cursor (Phase 4, RPGJS Module Integration)

---

### B. Thinking Indicator

**Why:** LLM calls take 1-3 seconds. The NPC should show it's "thinking."

**How:** Two options that work together:
1. `this.showEmotionBubble(EmotionBubble.ThreeDot)` — quick animated "..."
2. Custom bubble shows typing dots while `isThinking = true`

**Estimated effort:** ~20 lines in the bridge layer.

---

### C. Conversation History GUI

**Why:** Players should be able to review past NPC conversations.

**How:** A non-sprite-attached GUI panel (like the chat plugin but for NPC logs).
Opens on demand (hotkey or menu).

**Priority:** Low — Phase 5. For MVP, dialogue boxes are sufficient.

---

## Summary: Plugin Configuration for rpg.toml

```toml
# rpg.toml
modules = [
    './main',
    '@rpgjs/default-gui',
    '@rpgjs/plugin-emotion-bubbles',
    '@rpgjs/gamepad'
]
```

**Total plugins: 3** (default-gui, emotion-bubbles, gamepad)

| Feature | Source | Phase |
|---------|--------|-------|
| NPC name labels | Components API (built-in) | Phase 3 |
| NPC emotions (!, ?, heart, ...) | @rpgjs/plugin-emotion-bubbles | Phase 3 |
| Modal dialogue (player talks to NPC) | @rpgjs/default-gui showText() | Phase 3 |
| Choices in dialogue | @rpgjs/default-gui showChoices() | Phase 3 |
| Notifications | @rpgjs/default-gui showNotification() | Phase 3 |
| Proximity detection | attachShape() (built-in) | Phase 3 |
| NPC movement | Movement API (built-in) | Phase 3 |
| Non-blocking speech bubble | Custom sprite-attached GUI | Phase 4 |
| Thinking indicator | EmotionBubble.ThreeDot + custom | Phase 4 |
| Conversation history | Custom GUI panel | Phase 5 |
| Save/load player state | @rpgjs/save | Phase 5 |
| Mobile controls | @rpgjs/mobile-gui | Phase 6 |
