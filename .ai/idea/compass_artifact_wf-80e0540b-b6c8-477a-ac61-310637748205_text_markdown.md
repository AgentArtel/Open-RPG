# RPGJS v4 internals: a comprehensive technical deep-dive

**RPGJS v4 is a server-authoritative, TypeScript-based multiplayer RPG framework** built on Express, Socket.IO, and PixiJS v7, where both players and NPCs share a single base class (`RpgEvent` extends `RpgPlayer`) and state synchronization happens automatically through a schema-based system at **60 FPS** server tick rate. The entire framework is designed around a decorator-based module system (`@RpgModule`, `@EventData`, `@MapData`) with two API styles — explicit Module API and convention-based Autoload API. This report dissects every major subsystem with code examples, focusing on the NPC/Event system and server architecture critical for building an AI agent bridge.

---

## 1. Server architecture and lifecycle

### Startup sequence

The server launches via `expressServer()` from `@rpgjs/server/express`, which creates Express + HTTP + Socket.IO instances, loads all registered modules, initializes `RpgServerEngine`, fires `onStart` hooks, and begins the game loop:

```ts
import { expressServer } from '@rpgjs/server/express'
import modules from './modules'
import globalConfig from './config/server'

const { app, server, game } = await expressServer(modules, {
    globalConfig,
    basePath: __dirname,
    envs: import.meta.env
})
// app = Express instance, server = HTTP server, game = RpgServerEngine
```

The return value gives direct access to the Express app for mounting custom routes. The game loop runs at **60 FPS by default** (configurable via `serverFps` in `rpg.toml`). Each tick calls `onStep` on all modules, processes player inputs, runs collision detection (zone-based spatial partitioning), syncs state via schemas, and broadcasts packets to clients. No explicit shutdown hook exists — the process terminates with Node.js.

### RpgServerEngine API

The `RpgServerEngine` singleton exposes critical properties and methods:

| Property | Type | Description |
|----------|------|-------------|
| `app` | `Express` | Express app instance |
| `io` | `Socket.IO Server` | Socket.IO server |
| `sceneMap` | `SceneMap` | Manages all game maps |
| `database` | `object` | In-memory item/weapon/skill database |
| `globalConfig` | `object` (read-only) | Config from entry point |
| `damageFormulas` | `object` | Combat formulas |

Key methods include `server.start()`, `server.send()` (manual packet flush, useful for testing), and `server.addInDatabase(id, dataClass, type?)` for runtime data registration. You can retrieve the engine singleton from anywhere via dependency injection:

```ts
import { inject, RpgServerEngine } from '@rpgjs/server'
const server = inject(RpgServerEngine)
```

### Engine hooks and Express integration

Engine-level hooks are defined either through `@RpgModule` or the Autoload pattern:

```ts
// Module API
@RpgModule<RpgServer>({
    engine: {
        onStart(engine: RpgServerEngine) {
            // Mount custom API routes
            engine.app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
        },
        onStep(engine: RpgServerEngine) {
            // Called every frame (~16.67ms at 60 FPS)
        }
    }
})
export default class RpgServerModuleEngine {}

// Autoload API (main/server.ts)
export default {
    onStart(server: RpgServerEngine) { console.log('start!') },
    onStep(server: RpgServerEngine) { /* per-frame logic */ }
}
```

A third engine hook, `auth`, controls player authentication. It receives `(server, socket)` and must return a player ID string or throw:

```ts
const engine = {
    auth(server: RpgServerEngine, socket) {
        const token = socket.handshake.headers.authorization
        if (!token) throw 'No token provided'
        return jwt.verify(token, 'SECRET').id  // must return player ID
    }
}
```

### Module system (`@RpgModule`)

Modules are the primary organizational unit. A server module accepts `maps`, `worldMaps`, `player` hooks, `database` classes, `engine` hooks, and `imports` (sub-modules):

```ts
@RpgModule<RpgServer>({
    maps: [MedievalMap],
    database: { Potion, Sword },
    player: playerHooks,
    engine: { onStart(e) {}, onStep(e) {} },
    imports: [OtherModule]
})
export default class MyServerModule {}
```

The Autoload API auto-discovers files by convention (`main/server/maps/`, `main/server/events/`, etc.) and creates modules in the background. Both approaches can coexist.

---

## 2. The NPC/Event system in depth

### Defining and spawning events

NPCs are TypeScript classes extending `RpgEvent`, decorated with `@EventData`. The only required property is `name` (a unique identifier):

```ts
import { RpgEvent, EventData, RpgPlayer, EventMode } from '@rpgjs/server'

@EventData({
    name: 'EV-GUARD',
    mode: EventMode.Shared,   // default; one instance for all players
    hitbox: { width: 32, height: 32 }  // optional; defaults to map tile size
})
export class GuardEvent extends RpgEvent {
    onInit() {
        this.setGraphic('guard')
        this.speed = 1
    }
    async onAction(player: RpgPlayer) {
        await player.showText('Halt! Who goes there?', { talkWith: this })
    }
}
```

Events are placed on maps statically via `@MapData`:

```ts
@MapData({
    id: 'medieval',
    file: require('./tmx/medieval.tmx'),
    events: [
        GuardEvent,                          // positioned by Tiled shape named 'EV-GUARD'
        { event: GuardEvent, x: 200, y: 300 } // explicit pixel position
    ]
})
export class MedievalMap extends RpgMap {}
```

If no explicit position is given, RPGJS looks for a Tiled object layer shape whose `name` matches the event's `@EventData.name` and whose `type` is `event`. Absent that, the event spawns at `{x: 0, y: 0}`.

### Event modes: Shared vs. Scenario

**`EventMode.Shared`** (default) creates a single instance visible to all players on the map. Position, direction, speed, and graphics are shared state. This is optimal for world NPCs, monsters, and ambient characters.

**`EventMode.Scenario`** duplicates the event per player — each player sees their own independent copy with separate state. Essential for quest-specific NPCs, but **carries a performance cost proportional to players × events**.

### Complete event hook reference

| Hook | Trigger | Signature |
|------|---------|-----------|
| `onInit` | Event created/placed on map | `() => void` (or `(player: RpgPlayer)` in Scenario mode) |
| `onAction` | Player collides + presses Action key | `(player: RpgPlayer) => void` |
| `onPlayerTouch` | Player's hitbox collides with event | `(player: RpgPlayer) => void` |
| `onChanges` | Any change detection cycle on the map | `(player: RpgPlayer) => void` |
| `onInShape` | Event enters a map shape | `(shape: RpgShape) => void` |
| `onOutShape` | Event leaves a map shape | `(shape: RpgShape) => void` |
| `onDetectInShape` | Player enters event's attached shape (v4.1.0+) | `(player: RpgPlayer, shape: RpgShape) => void` |
| `onDetectOutShape` | Player leaves event's attached shape (v4.1.0+) | `(player: RpgPlayer, shape: RpgShape) => void` |

The `onChanges` hook deserves special attention: it fires whenever **any** entity on the map triggers a change detection cycle, not just the specific event. This enables reactive patterns (e.g., a door event checking if a lever variable was set) but can become costly with many events.

### Proximity detection without player input

The `onDetectInShape`/`onDetectOutShape` hooks (v4.1.0+) enable automatic proximity detection by attaching an invisible detection area to an event:

```ts
@EventData({ name: 'EV-SENSOR' })
export class SensorEvent extends RpgEvent {
    onInit() {
        this.setGraphic('npc')
        this.attachShape({
            width: 200, height: 200,
            positioning: ShapePositioning.Center
        })
    }
    onDetectInShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`${player.name} entered detection range`)
    }
    onDetectOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`${player.name} left detection range`)
    }
}
```

### Programmatic NPC movement

Since `RpgEvent` inherits from `RpgPlayer`, all movement commands work on events. The `Move` utility provides both pixel-based and tile-based movement:

```ts
import { Move, Speed, Direction } from '@rpgjs/server'

// One-time sequential route (returns Promise)
await this.moveRoutes([Move.tileLeft(), Move.tileDown(2), Move.turnRight()])

// Infinite looping route (e.g., patrol)
this.infiniteMoveRoute([Move.tileRandom()])
this.breakRoutes(true)   // stop
this.replayRoutes()       // resume

// A* pathfinding to a target (since v3.2.0)
this.moveTo(player, {
    infinite: true,
    onComplete: () => console.log('arrived'),
    onStuck: (duration) => console.log(`stuck for ${duration}ms`)
}).subscribe()
this.stopMoveTo()  // cancel

// Instant teleport
this.teleport({ x: 100, y: 500 })

// Speed/frequency control
this.speed = Speed.Fast    // 0.2, 0.5, 1, 3 (default), 5, 7, 10
this.frequency = Frequency.Low  // pause between route steps: 0–600ms
```

Custom move functions allow dynamic AI-like behavior:

```ts
const chaseMove = (target: RpgPlayer) => {
    return (self: RpgPlayer, map) => {
        return target.position.x > self.position.x ? Direction.Right : Direction.Left
    }
}
this.moveRoutes([chaseMove(player)])
```

Additional movement properties: `this.canMove = false` blocks all movement, `this.through = true` passes through obstacles, and `this.throughOtherPlayer = true` passes through other players only.

### Dynamic event creation and destruction

Events can be created and destroyed at runtime — they are **not** limited to map-load-time:

```ts
// Create on map (Shared mode — visible to all)
const map = player.getCurrentMap()
const created = map.createDynamicEvent({
    x: 100, y: 100, event: MyEvent
})
// Returns: { [eventId: string]: RpgEvent }

// Create per-player (Scenario mode)
const created = player.createDynamicEvent({
    x: 100, y: 100, event: MyEvent
})

// Destroy (v4.0.0+)
event.remove()          // returns boolean; false if not on map
map.removeEvent(eventId) // alternative; deletion deferred to end of async cycle
```

### Event scope and state access

**Events are per-map.** There is no global event concept. Shared events persist on their map regardless of player presence; Scenario events are per-player-per-map. The same event class can be reused across multiple maps, but each instantiation is independent.

Since `RpgEvent` inherits from `RpgPlayer`, events have access to `this.position`, `this.getDirection()`, `this.name`, `this.speed`, and even inherited properties like `hp`, `gold`, and inventory methods — though the latter are primarily meaningful on player instances. Events also carry `this.server` (the `RpgServerEngine` instance) and collision properties (`this.shapes`, `this.tiles`, `this.otherPlayersCollision`).

---

## 3. Player system and interaction model

### Player lifecycle hooks

The complete `RpgPlayerHooks` interface governs the player lifecycle:

```ts
export const player: RpgPlayerHooks = {
    props: {
        nbWood: Number,
        secret: { $default: '', $syncWithClient: false, $permanent: true }
    },
    onConnected(player: RpgPlayer) {
        player.setGraphic('hero')
        await player.changeMap('medieval', { x: 100, y: 100 })
    },
    onJoinMap(player: RpgPlayer, map: RpgMap) {
        player.hp = 500  // set properties HERE, not after changeMap
    },
    onInput(player: RpgPlayer, { input, moving }) { },
    onMove(player: RpgPlayer) { },
    onLeaveMap(player: RpgPlayer, map: RpgMap) { },
    onInShape(player: RpgPlayer, shape: RpgShape) { },
    onOutShape(player: RpgPlayer, shape: RpgShape) { },
    onLevelUp(player: RpgPlayer, nbLevel: number) { },
    onDead(player: RpgPlayer) { },
    onDisconnected(player: RpgPlayer) {
        const json = player.save()  // persist to database
    },
    canChangeMap(player: RpgPlayer, nextMap) { return true }
}
```

The `props` system defines custom synchronized properties with three flags: `$syncWithClient` (default `true`), `$permanent` (default `true`, survives save/load), and `$default`. Module augmentation adds TypeScript types:

```ts
declare module '@rpgjs/server' {
    export interface RpgPlayer { nbWood: number }
}
```

### How the action system works

When a player presses the **Action key** (Space/Enter), the client sends the input to the server. The server checks if the player's hitbox is colliding with any events. If colliding, it calls `onAction(player)` on the colliding event. The `onPlayerTouch` hook fires automatically on collision without requiring a key press.

### Sending UI to specific players

All GUI commands are called on the `player` object, not the event:

```ts
// Dialog
await player.showText('Hello World', {
    position: 'bottom',     // 'top' | 'middle' | 'bottom'
    talkWith: this,         // makes NPC face player
    typewriterEffect: true,
    autoClose: false
})

// Choices (returns selected option)
const choice = await player.showChoices('What color?', [
    { text: 'Black', value: 'black' },
    { text: 'Blue', value: 'blue' }
])

// Notification
player.showNotification('Quest complete!', { time: 2000, icon: 'quest-icon' })

// Custom GUI
const gui = player.gui('inn')
gui.on('accept', () => player.allRecovery())
await gui.open({ price: 50 }, { waitingAction: true, blockPlayerInput: true })

// Direct socket communication
player.emit('custom-event', { data: 'value' })
player.on('client-response', (data) => { /* handle */ })

// Sound (only this player hears; pass true for all on map)
player.playSound('bgm-town')

// Components above sprites
player.setComponentsTop([
    [Components.text('{name}')],
    [Components.hpBar()]
])
```

### RpgPlayer data accessible server-side

The `RpgPlayer` class exposes position (`player.position: {x, y, z}`), direction, `name`, `hp`, `gold`, `level`, inventory methods (`addItem`, `removeItem`, `getItem`, `hasItem`, `useItem`, `buyItem`, `sellItem`, `equip`, `unequip`), skill methods (`learnSkill`, `forgetSkill`), variables (`setVariable`/`getVariable`), collision data (`otherPlayersCollision`, `shapes`, `tiles`), map access (`getCurrentMap()`), save/load (`save()`/`load(json)`), and the server reference (`player.server`).

---

## 4. Map system and coordinate model

### Map loading and management

Maps are Tiled TMX files registered via `@MapData` or auto-loaded from the `maps/` directory. Maps can be created dynamically at runtime:

```ts
engine.sceneMap.createDynamicMap({
    id: 'myid',
    file: require('./tmx/town.tmx')
})
```

Map lifecycle hooks include `onLoad()`, `onJoin(player)`, and `onLeave(player)` (must call `super.onLeave(player)` if overriding). Maps can be updated (`map.update(data)`) or removed (`map.remove()`, throws if players are present).

### Coordinate system

**RPGJS uses pixel-based coordinates as the primary system.** All positions — player spawn, event placement, teleport targets, hitboxes, shapes — are specified in pixels. Tile-based query utilities are available for convenience:

```ts
map.getTileIndex(x, y)           // pixel → tile index
map.getTileOriginPosition(x, y)  // pixel → top-left pixel of that tile
map.getTileByPosition(x, y)      // pixel → TileInfo object
map.setTile(x, y, 'layer', { gid: 2 })  // x,y here are tile-grid coords
```

Map dimensions are `map.widthPx` and `map.heightPx` (pixels). Tile size is defined in the Tiled TMX/TSX files — commonly **32×32 pixels**. The z-axis controls depth/overlay sorting.

### Enumerating entities

```ts
// On a specific map instance
map.players  // { [id: string]: RpgPlayer } — all players on this map
map.events   // { [id: string]: RpgEvent }  — all events on this map
map.nbPlayers // number

// Global access via RpgWorld
RpgWorld.getPlayers()                    // all players across all maps
RpgWorld.getPlayer(id)                   // specific player by ID
RpgWorld.getPlayersOfMap(mapId)          // all players on a map
RpgWorld.getObjectsOfMap(mapId)          // players + events on a map
RpgWorld.getShapesOfMap(mapId)           // all shapes on a map

// Iterate all maps
const maps = engine.sceneMap.getMaps()   // RpgClassMap<RpgMap>[]
```

### Map transitions and NPC behavior

Players change maps via `player.changeMap(mapId, positions?)`. The `canChangeMap` hook gates transitions. In World mode (Tiled `.world` files), edge-touching maps enable seamless automatic transitions. **Events are bound to their map and do not transfer between maps.** Shared events persist on the map regardless of player movement. When a player leaves, `onLeave` fires on the map; when arriving, `onJoin` fires. The **maximum maps per world is 500**.

### Tiled integration

RPGJS is deeply integrated with Tiled Map Editor. Tiles support custom properties (`collision: true`, `z: number`). Object layers place events (type `event`, name matching `@EventData.name`) and shapes (spawn points, trigger zones). The `require()` import for TMX/TSX files is mandatory. WebGL 1 constrains tileset images to ≤ **4096×4096 pixels**. Multiple tilesets per map are supported.

---

## 5. Multiplayer synchronization and scaling

### Schema-based state sync

RPGJS uses a **server-authoritative, schema-based state push model** over Socket.IO. Each map acts as a "room" in the networking layer. Properties defined in schemas are automatically diffed and pushed to clients when they change:

```ts
// Custom player property — auto-synced to client
export const player: RpgPlayerHooks = {
    props: {
        bronze: Number,  // setting player.bronze = 10 auto-syncs
        secret: { $syncWithClient: false }  // server-only
    }
}
```

**Critical sync caveat:** After `player.changeMap()`, the player leaves one room and joins another. Properties set in the same method after `changeMap()` may not synchronize correctly. Always set properties in the `onJoinMap` hook instead, or use `RpgWorld.getPlayer(player.id)` to get the re-synchronized instance.

### NPC movement replication

**In Shared mode, server-side NPC movements automatically replicate to all connected clients.** Position, direction, speed, and graphic changes are part of the synchronized schema. No additional code is needed — calling `this.moveRoutes(...)` or `this.moveTo(...)` on a Shared event sends updates to every client on that map.

### Performance characteristics of NPC scaling

No official benchmarks exist, but the cost factors per NPC per tick include schema serialization and diff detection, Socket.IO broadcast to all map clients, zone-based collision checks, and memory (each `RpgEvent` extends `RpgPlayer` with full data structures). Estimated impact:

- **1–10 NPCs**: Negligible overhead. Comfortable for any single map.
- **10–50 NPCs**: Modest. Sync payload grows linearly. Zone-based collision keeps detection sublinear in map size.
- **100+ NPCs**: Significant. Every NPC state change triggers schema diffing at 60 FPS. Scenario mode makes this dramatically worse (**100 NPCs × 50 players = 5,000 event instances**).

Mitigation strategies: use Shared mode exclusively for non-player-specific NPCs, reduce `serverFps` to 30 or 20, enable `lowMemory` on maps, distribute NPCs across multiple maps, and keep NPC state changes minimal per tick.

### Horizontal scaling with Agones

**⚠️ The Agones scaling module is explicitly marked as beta with unfinished development.** The architecture uses Kubernetes + Agones for game server orchestration, Redis for state persistence, and a matchmaker service for routing.

On every map change, player state is serialized to Redis. The matchmaker assigns the target map to a game server instance. The client disconnects and reconnects to the new instance, which loads state from Redis. **Only properties defined in `props` survive migration.** Events do NOT migrate — they are instantiated fresh per-server.

Key limitations: one map maps to one server instance (a popular map can't be split across instances), dynamic maps anchor to a specific server and can't be migrated, and each instance needs its own SSL certificate.

```toml
# rpg.toml for scaling
matchMakerService = 'https://matchmaker.example.com'
```

---

## 6. Project structure, build system, and known limitations

### Typical v4 project structure

```
src/
  game/
    main/
      client/
        characters/    # Spritesheet definitions + PNG assets
        gui/           # Vue.js or React GUI components
        sounds/        # Audio assets
        sprite.ts      # Client sprite hooks
      server/
        maps/
          tmx/         # .tmx map files, .tsx tilesets
          medieval.ts  # Server-side map classes
        events/        # NPC/event classes (@EventData)
        database/      # Items, weapons, skills (@Item, @Weapon, etc.)
        player.ts      # Player hooks (RpgPlayerHooks)
      index.ts
  server.ts            # Entry point: expressServer()
  client.ts            # Client entry point
rpg.toml               # Game configuration
tsconfig.json
package.json
```

### Build system

RPGJS v4 uses **ViteJS** (migrated from Webpack in v3) with TypeScript 5.0.4 and experimental decorators. Commands: `rpgjs dev` (development with HMR) and `rpgjs build` (production). Output goes to `dist/server/` (Node.js server) and `dist/client/` (static files). The `rpg.toml` config controls game type (`rpg` or `mmorpg`), server port, FPS, Express middleware, Socket.IO options, and module loading. Node.js ≥ 18 is required.

### Key TypeScript types

```ts
// Core server types
import {
    RpgPlayer, RpgPlayerHooks, RpgEvent, EventData, EventMode,
    RpgMap, MapData, RpgWorld, RpgModule, RpgServer, RpgServerEngine,
    RpgShape, ShapePositioning, RpgClassMap,
    Move, Direction, Speed, Frequency, Control, Components,
    SceneMap, inject
} from '@rpgjs/server'

// Core client types
import {
    RpgClient, RpgSprite, RpgSpriteHooks, RpgClientEngine,
    Spritesheet, Sound, entryPoint
} from '@rpgjs/client'
```

### Known limitations for AI agent bridge development

The following limitations directly affect building a dynamic AI control layer:

- **`onChanges` fires map-wide**, not per-event. With many AI-controlled NPCs, this creates an O(n²) notification pattern where every NPC's change triggers every other NPC's `onChanges`.
- **Events inherit full `RpgPlayer` weight**. Each NPC carries the complete player data structure (inventory, skills, stats, etc.), increasing memory per NPC beyond what's strictly necessary for an AI agent.
- **No built-in pathfinding AI** is documented. The `moveTo()` method uses A* pathfinding but is the only automated navigation — all other movement must be manually programmed or driven externally.
- **Scenario mode scales O(players × events)**. If AI agents need per-player state, the cost multiplies rapidly.
- **Dynamic maps break horizontal scaling**. AI-spawned maps anchor to one server instance.
- **Event deletion is deferred** to the end of asynchronous operations, meaning `remove()` is not instantaneous.
- **No native event persistence**. Events don't survive server restarts or migration between instances. State must be managed externally.
- **The `onStep` hook** (60 FPS) provides the natural injection point for AI agent logic but requires careful performance management — each AI decision cycle adds to the per-frame budget of ~16.67ms.

The most viable bridge architecture would hook into `onStart` to register an Express API endpoint (via `engine.app`) for AI commands, use `onStep` for periodic AI state evaluation, create NPCs dynamically via `map.createDynamicEvent()`, drive them with `moveTo()` and `moveRoutes()` using custom move functions, detect players via `attachShape()` + `onDetectInShape`, and communicate with players through `player.showText()` and `player.emit()`.

## Conclusion

RPGJS v4's most architecturally significant decision is that **`RpgEvent` extends `RpgPlayer`**, giving NPCs the full command vocabulary of players — movement, collision, shapes, graphics — while making them first-class citizens in the sync schema. This inheritance model is both the framework's greatest strength for AI integration (NPCs can do anything players can) and its primary scaling concern (each NPC carries player-weight overhead). The **Shared mode + `attachShape()` detection pattern** is the optimal foundation for AI-controlled NPCs: a single server-side instance auto-replicates to all clients, proximity detection fires without player input, and `moveTo()` provides built-in pathfinding. The `onStart` hook's access to `engine.app` (Express) and `engine.io` (Socket.IO) provides clean integration points for an external AI bridge API, while `inject(RpgServerEngine)` enables server access from any context. The key engineering challenge is managing per-frame budget at 60 FPS with many AI agents — reducible via `serverFps` tuning, Shared mode exclusivity, and batching AI decisions across multiple ticks.