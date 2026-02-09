# RPGJS v4 Developer Guide

> Extracted from the RPGJS v4.3.1 source and documentation.
> Local reference: `docs/rpgjs-reference/`

## Quick Reference

```bash
rpgjs dev            # Dev server with HMR (default port 3000)
rpgjs build          # Production build
PORT=4000 rpgjs dev  # Custom port
RPG_TYPE=rpg rpgjs dev  # Single-player mode (no server)
```

---

## 1. Project Structure (v4 Autoload Convention)

RPGJS v4 auto-registers files by **directory name convention**. Files placed in
the correct directories under a module are automatically discovered — no manual
registration needed.

```
main/                          # Module directory (referenced in rpg.toml)
├── events/                    # Auto-registered NPC/Event classes
│   └── npc.ts
├── maps/                      # Auto-registered map classes
│   └── town.ts
├── database/                  # Auto-registered items, weapons, etc.
│   └── items/
│       └── Potion.ts
├── spritesheets/              # Auto-registered spritesheets
│   └── npc/
│       ├── male.png           # Filename = graphic ID ("male")
│       └── spritesheet.ts     # Animation definition
├── gui/                       # Auto-registered GUI components
│   └── hud.vue
├── sounds/                    # Auto-registered audio
│   └── theme.ogg
├── worlds/                    # World map connections
│   └── maps/
│       ├── map.tmx            # Tiled map files
│       ├── tileset.tsx        # Tileset definitions
│       └── base.png           # Tileset images
├── player.ts                  # Player lifecycle hooks
├── server.ts                  # Server-side hooks
├── client.ts                  # Client-side hooks
├── sprite.ts                  # Sprite behavior hooks
└── scene-map.ts               # Scene/camera hooks
```

### Key Autoload Rules
- Spritesheet **filename** (without extension) = graphic ID used in `setGraphic()`
- One `.ts` definition file per spritesheet folder
- Subdirectories are allowed for organization
- `rpg.toml` `modules` array points to module directories

---

## 2. Configuration (rpg.toml)

```toml
# Module loading
modules = [
    './main',
    '@rpgjs/default-gui',
    '@rpgjs/gamepad'
]

# Player spawn configuration
[start]
    map = 'map-id'          # Must match a @MapData id
    graphic = 'sprite-name' # Must match a spritesheet filename
    hitbox = [32, 32]       # [width, height] in pixels

# Compiler options
[compilerOptions.alias]
    "@" = "./src"

# Express server
[express]
    port = 3000
```

---

## 3. Decorators & Entity Patterns

### Events (NPCs)

```ts
import { RpgEvent, EventData, RpgPlayer, EventMode, Speed, Move,
         Components, ShapePositioning } from '@rpgjs/server'

@EventData({
    name: 'EV-1',                    // Must match Tiled object name
    mode: EventMode.Shared           // One instance for all players
})
export default class VillagerEvent extends RpgEvent {
    onInit() {
        this.setGraphic('male')      // Matches spritesheet filename
        this.setHitbox(16, 16)
        this.speed = Speed.Slow
        this.setComponentsTop(Components.text('{name}'))

        // Proximity detection (vision range)
        this.attachShape({
            width: 200, height: 200,
            positioning: ShapePositioning.Center
        })

        // Patrol behavior
        this.infiniteMoveRoute([Move.tileRandom()])
    }

    async onAction(player: RpgPlayer) {
        await player.showText('Hello traveler!', { talkWith: this })
    }

    onDetectInShape(other: RpgPlayer) {
        // Player entered this NPC's vision range
    }

    onDetectOutShape(other: RpgPlayer) {
        // Player left vision range
    }
}
```

**Event Modes:**
- `EventMode.Shared` — Single instance, all players see same state. Use for NPCs, monsters, doors.
- `EventMode.Scenario` — Per-player instance, each player gets their own copy. Use for story triggers only.

**Placing events in maps:** In Tiled, add a Point object on an Object Layer with `name` matching `@EventData.name`.

### Maps

```ts
import { RpgMap, MapData, RpgPlayer } from '@rpgjs/server'

@MapData({
    id: 'medieval',                          // Referenced in rpg.toml and changeMap()
    file: require('../worlds/maps/map.tmx'), // Path to Tiled .tmx file
    name: 'Medieval Town'
})
export default class MedievalMap extends RpgMap {
    onInit() { }
    onJoin(player: RpgPlayer) { }
    onLeave(player: RpgPlayer) { super.onLeave(player) }
}
```

### Database Items

```ts
import { Item } from '@rpgjs/database'

@Item({
    id: 'potion',
    name: 'Potion',
    description: 'Restores 100 HP',
    price: 200,
    hpValue: 100,
    consumable: true,
    hitRate: 1
})
export default class Potion { }
```

Other database decorators: `@Weapon`, `@Armor`, `@Skill`, `@State`, `@Class`, `@Actor`

### Spritesheets

```ts
import { Spritesheet, Presets } from '@rpgjs/client'
const { RMSpritesheet } = Presets

// RPG Maker format (most common)
@Spritesheet(RMSpritesheet(3, 4))    // 3 frames wide, 4 directions
export default class Characters { }

// Filename of the PNG in the same folder becomes the graphic ID
```

---

## 4. Player Lifecycle Hooks

```ts
import { RpgPlayer, RpgPlayerHooks, Components, RpgMap } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    // Define synced properties
    props: {
        gold: Number,                          // Synced with client
        secret: { $syncWithClient: false },    // Server-only
        temp: { $permanent: false }            // Not saved
    },

    onConnected(player: RpgPlayer) {
        // Called on login. Set up basics.
        player.name = 'Hero'
        player.setComponentsTop(Components.text('{name}'))
        // NOTE: After changeMap(), don't set properties here
    },

    onJoinMap(player: RpgPlayer, map: RpgMap) {
        // Called AFTER map sync completes — safe to set properties
        player.hp = 500
    },

    onInput(player: RpgPlayer, { input, moving }) {
        if (input === 'action') player.callMainMenu()
    },

    onDisconnect(player: RpgPlayer) {
        const saveData = player.save()  // Serialize player state
    }
}
export default player
```

### Critical Sync Rule
```ts
// BAD — properties won't sync after changeMap
async onConnected(player) {
    await player.changeMap('medieval')
    player.hp = 500  // LOST — map room hasn't synced yet
}

// GOOD — use onJoinMap for post-map-change properties
onJoinMap(player) {
    player.hp = 500  // Properly synced
}
```

---

## 5. Movement & Pathfinding

```ts
import { Move, Speed, Direction } from '@rpgjs/server'

// Movement routes
event.moveRoutes([
    Move.tileUp(),
    Move.tileDown(),
    Move.tileLeft(),
    Move.tileRight(),
    Move.tileRandom(),
    Move.turnRight(),
    Move.turnLeft(),
    Move.wait(500)        // milliseconds
])

// Infinite patrol
event.infiniteMoveRoute([Move.tileRandom()])

// Speed constants
event.speed = Speed.Slow    // or Speed.Normal, Speed.Fast

// Break and resume routes
event.breakRoutes(true)
event.replayRoutes()
```

---

## 6. Shape-Based Proximity Detection

```ts
import { ShapePositioning } from '@rpgjs/server'

// Attach a detection zone to an NPC
this.attachShape({
    width: 200,
    height: 200,
    positioning: ShapePositioning.Center  // Follows the entity
})

// Then handle detection in the event class:
onDetectInShape(player: RpgPlayer, shape: RpgShape) {
    // Player entered detection zone
}
onDetectOutShape(player: RpgPlayer, shape: RpgShape) {
    // Player left detection zone
}
```

**Fixed shapes** can also be created on maps:
```ts
// In a map class
onInit() {
    this.createShape({
        x: 10, y: 10,
        width: 100, height: 100,
        properties: { color: '0xDE3249' }
    })
}
```

---

## 7. Components (Server-Side UI)

```ts
import { Components } from '@rpgjs/server'

// Text above entity (uses template placeholders — efficient sync)
player.setComponentsTop(Components.text('{name}'))
player.setComponentsTop(Components.text('{position.x},{position.y}'))

// HP Bar
player.setComponentsTop(
    Components.hpBar({}, '{$percent}%'),
    { width: 42 }
)

// IMPORTANT: Use template strings like {name}, NOT interpolated values
// Templates only send the value on change; interpolated sends entire structure
```

---

## 8. GUI (Client-Side Vue/React Components)

```ts
// Server-side: open a GUI for a player
player.gui('my-gui').open({ someData: 42 })
player.gui('my-gui').close()
player.callMainMenu()

// Client-side: Vue component in gui/ folder
// Inject: rpgCurrentPlayer, rpgEngine, rpgScene
// Subscribe to player updates with rpgCurrentPlayer.subscribe()
```

---

## 9. Dialogue & Choices

```ts
// Simple text
await player.showText('Hello!', { talkWith: this })

// Choices
const { text, index } = await player.showChoices('What do you want?', [
    { text: 'Buy', value: 'buy' },
    { text: 'Sell', value: 'sell' },
    { text: 'Leave', value: 'leave' }
])
```

---

## 10. Save System

```ts
// Serialize player state (all synced properties + inventory)
const json = player.save()

// Restore from saved data
player.load(savedJson)

// Use player.customId for persistence (player.id changes per session)
```

---

## 11. Tiled Map Editor Integration

### Tileset (.tsx) Setup
- Tile size: 32x32px (standard)
- Image max: 4096x4096px (WebGL limit)
- Add boolean `collision` property to blocking tiles
- Add number `z` property for tiles that render above characters

### Map (.tmx) Setup
- Create tile layers for ground, objects, overhead
- Create an Object Layer for:
  - **Player spawn**: Point object named `start`
  - **NPC placement**: Point object with name matching `@EventData.name`
  - **Shapes**: Rectangle/polygon objects

### Memory Usage
- Normal: `(width × height × layers × 4)` bytes
- Low-memory mode: `(width × height × 4)` bytes (only top layer accessible)

---

## 12. Performance Rules

| Do | Don't |
|----|-------|
| Use `onDetectInShape` for proximity | Use `onChanges` (O(n²) per map tick) |
| Use `setInterval` for periodic logic | Use `onStep` (fires at 60 FPS) |
| Use `Components.text('{name}')` templates | Use `Components.text(player.name)` interpolation |
| Share tilesets across maps (cached) | Duplicate tileset images per map |
| Enable `lowMemory` on large maps | Load huge maps without optimization |
| Keep perception snapshots < 300 tokens | Send full game state to LLM |

---

## 13. Module System

```ts
// rpg.toml — register modules
modules = ['./main', '@rpgjs/default-gui']

// Module hooks files (autoloaded):
// main/server.ts — server-side hooks (onStart, auth)
// main/client.ts — client-side hooks (onConnectError, onStart)
// main/player.ts — player lifecycle hooks
// main/sprite.ts — client sprite hooks
// main/scene-map.ts — scene/camera hooks
```

---

## 14. Common Plugins

| Plugin | Purpose |
|--------|---------|
| `@rpgjs/default-gui` | Default menus, dialogue boxes, shop UI |
| `@rpgjs/gamepad` | Gamepad/controller support |
| `@rpgjs/plugin-emotion-bubbles` | Emotion bubble animations above characters |
| `@rpgjs/mobile-gui` | Mobile touch controls |
| `@rpgjs/title-screen` | Title screen with save/load |
| `@rpgjs/chat` | In-game chat system |

---

## 15. Sample2 Reference

The `docs/rpgjs-reference/packages/sample2/` directory contains the most
complete RPGJS v4 sample with:
- 2 connected maps with world.world configuration
- NPC event with spritesheet and behavior
- Database item (Potion)
- Player hooks with input handling
- GUI component
- Sound system
- Plugin architecture example

This is the recommended reference for implementation patterns.
