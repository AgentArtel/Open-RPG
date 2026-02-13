# Session Recorder, Workflow Labeling, and NPC Jobs

## The Idea in One Sentence

Record every player session as a structured log of inputs, movements, and interactions; let players label successful runs as named "workflows"; then assign those workflows to AI NPCs as repeatable daily jobs so NPCs literally replay the player's actions — turning human play into NPC routines.

---

## The Problem This Solves

Right now, AI NPCs only do what the LLM decides in the moment: wander, talk, emote. They have no **repeatable routines** that mirror real tasks. If we want an NPC to "gather herbs every morning" or "patrol from A to B," we'd have to hand-author scripted behavior or hope the LLM figures it out every time — and it won't be consistent.

At the same time, we have no **record of what players actually do**. When a player finds an efficient route or completes a task in an interesting way, that knowledge is lost when they log off. We can't learn from it or reuse it.

This idea bridges both gaps: **players demonstrate tasks by playing; we record those sessions; we curate them into named workflows; we assign workflows to NPCs as jobs.** The game's progression and discovery become the NPCs' capability set.

---

## The Core Architecture

Three layers, each buildable and useful on its own:

### Layer 1: Session Recorder

- **What:** From connect to disconnect, log every relevant player action with relative timestamps.
- **Hooks:** `onConnected` (start), `onInput` (keypresses: direction, action, back, custom), `onMove` (tile-sampled, not every pixel), `onJoinMap` (map changes), `onDisconnected` (end + generate summary).
- **Data:** `SessionRecording` = id, playerId, startedAt, endedAt, startMap, `actions: SessionAction[]`, optional `SessionSummary`.
- **Storage (MVP):** JSON files per session in `data/sessions/`. Post-MVP: Supabase.
- **Why tile-sampling for move:** `onMove` fires at ~60 FPS; recording every pixel change would bloat logs. Only record when the *tile* changes.

### Layer 2: Workflow Labeling

- **What:** A workflow is a curated, named session recording — "this sequence accomplishes X."
- **Data:** `Workflow` = id, name, description, sourceRecordingId, actions (possibly trimmed), tags, requiredSkills, startMap, startPosition, estimatedDuration.
- **Creation:** Builder dashboard "Sessions" tab: list recent recordings, pick one, name it, add tags, save as workflow.
- **Storage:** JSON (e.g. `data/workflows/`) or later Supabase.

### Layer 3: NPC Job System

- **What:** Assign workflows to NPCs. A job runs on a schedule (e.g. daily at 6:00, or every N minutes for testing). When it's time, the NPC replays the workflow's action sequence using the **existing skill system** (move, say, etc.) — no new "replay" skill needed; we just drive the same skills from a recording instead of from the LLM.
- **Components:** `JobScheduler` (timer, checks which NPCs have pending jobs), `WorkflowPlayer` (replays actions with timing, calling skills via `ISkillRegistry`). Jobs enter the same `LaneQueue` as conversation/idle so one thing runs at a time per NPC.
- **Config:** Extend agent YAML with a `jobs` array (workflow id + schedule). Declarative; no code change to add a new job.

---

## Why This Fits the Project

- **Command-as-knowledge (01-idea-doc):** The game's progression *is* the agent's capability set. Here, human play *is* the source of those capabilities — we record and replay it.
- **Existing pieces:** Player hooks, skill system, LaneQueue, GameChannelAdapter, builder dashboard, YAML configs. All are extension points; we add recording and replay without replacing them.
- **Scalable:** Session recorder doesn't know about workflows; workflow manager doesn't know about NPCs; job system uses the same skill interface the LLM uses. Each layer can be swapped or extended (e.g. Supabase for sessions, LLM-enhanced replay later).

---

## Implementation Plan

See **[07a-session-recorder-implementation-plan.md](07a-session-recorder-implementation-plan.md)** for phased steps and file layout. A detailed task checklist lives in `.cursor/plans/` (Session Recorder and NPC Jobs plan) for when we implement.

---

## Open Questions / Future Extensions

- LLM-enhanced replay: "Here's how a human did it; adapt if the world changed."
- Workflow composition: chain several workflows into a full daily schedule.
- Crowd-sourced workflows: multiple players contribute; system picks or merges best routes.
- Workflow marketplace: players share or trade workflows.

Now I have a thorough understanding of the full system. Let me give you a comprehensive, beginner-friendly explanation.

---

## The Big Picture: Teaching NPCs by Watching Players

Okay, let's break this down from the ground up. I'll explain it like we're sitting at a whiteboard together.

### What are we actually building?

Imagine you're playing this RPGJS game. You walk around, talk to NPCs, gather items, explore maps. Now imagine that the **entire time you're playing, the game is quietly writing down everything you do** -- like a stenographer in a courtroom. Every step you take, every key you press, every NPC you talk to.

When you're done, you have a "recording" of your session. Now here's the cool part: you can **label** that recording ("this is how you do the morning herb run") and **assign it to an NPC**. That NPC will then literally replay your actions, walking the same path, doing the same things you did. It becomes their "job."

This is basically three systems stacked on top of each other:

```
Layer 3: NPC Job System     -- "Go do this recording as your daily job"
Layer 2: Workflow Labeling   -- "This recording is called 'morning herb run'"  
Layer 1: Session Recording   -- "Record everything the player does"
```

Each layer only depends on the one below it, so you can build them one at a time.

---

### Layer 1: Session Recording -- "The Stenographer"

#### How RPGJS hooks work (the foundation)

This is the most important thing to understand first. RPGJS has a **hook system** -- it's like the game engine saying "Hey, something just happened! Does anyone care?"

Look at how the current `player.ts` is structured:

```75:95:main/player.ts
const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'YourName'
        player.setComponentsTop(Components.text('{name}'))

        // TASK-005: LLM feasibility test — fire-and-forget async call.
        // This runs in the background so it doesn't block player connection.
        // The result (or error) is logged to the server console.
        void testLLMCall()
            .then((result) => {
                console.log('[LLM-Test] ✅ Success!')
                console.log(`[LLM-Test]   Response: "${result.response}"`)
                console.log(`[LLM-Test]   Model:    ${result.model}`)
                console.log(`[LLM-Test]   Latency:  ${result.latencyMs}ms`)
            })
            .catch((err: unknown) => {
                // Graceful error handling — never crash the game server
                const message = err instanceof Error ? err.message : String(err)
                console.error('[LLM-Test] ❌ Failed:', message)
            })
    },
```

See that `onConnected`? That fires every time a player connects. There's also `onInput` (fires when they press a key), `onJoinMap` (fires when they enter a map), and `onMove` (fires when their position changes). These hooks are our "ears" -- they let us listen to everything the player does.

#### The key design decision: what to record and how

Here's where you need to think like an engineer. The `onMove` hook fires **every time the player's pixel position changes**, which at 60 frames per second could mean 60 events per second. If we recorded all of those, a 10-minute session would generate ~36,000 movement records. That's wasteful.

Instead, we **sample by tile**. RPGJS maps use tiles (usually 32x32 pixels). A character walking across the screen might cover 20 tiles but generate hundreds of pixel-level move events. We only care about tile transitions:

```typescript
// This is the concept -- NOT real code yet, just to illustrate
// Convert pixel position to tile position
const tileX = Math.floor(player.position.x / 32)
const tileY = Math.floor(player.position.y / 32)

// Only record if the tile changed since last time
if (tileX !== lastTileX || tileY !== lastTileY) {
  recorder.recordAction({
    type: 'move',
    timestamp: Date.now() - sessionStartTime,  // relative, not absolute
    data: { position: { x: tileX, y: tileY } }
  })
  lastTileX = tileX
  lastTileY = tileY
}
```

**Why relative timestamps?** Because when an NPC replays this later, we want to preserve the *pacing* (how fast the player moved between actions) but we don't care that it was 3:42 PM on a Tuesday. Relative timestamps let us speed up or slow down replays easily.

#### The data shape (interfaces)

When you design a system, you start by defining **what the data looks like**. This is what the types would look like:

```typescript
// What happened in a single moment
interface SessionAction {
  timestamp: number          // ms since session start (NOT wall-clock time)
  type: 'input' | 'move' | 'map_change' | 'npc_interaction'
  data: {
    input?: string           // 'up', 'down', 'left', 'right', 'action', 'back'
    position?: { x: number; y: number }  // tile coordinates
    mapId?: string           // for map transitions
    npcId?: string           // who they talked to
    detail?: string          // human-readable note
  }
}

// The full session recording
interface SessionRecording {
  id: string                 // unique ID (e.g. UUID)
  playerId: string
  playerName: string
  startedAt: number          // absolute timestamp for when the session happened
  endedAt?: number
  startMap: string
  actions: SessionAction[]   // the ordered log of everything that happened
  summary?: SessionSummary   // auto-generated when session ends
}
```

**Why these specific fields?** Each field has a purpose:
- `type` tells us the *category* of action (so we can filter: "show me only movement" or "show me only NPC interactions")
- `data` is flexible -- different action types carry different data, and we use optional fields so each action only includes what's relevant
- `summary` is generated *after* the session ends, giving a high-level overview

#### Where it hooks in

The recorder would tap into the existing hooks in `player.ts`. Here's how each hook maps to a recording action:

| RPGJS Hook | What We Record | Action Type |
|---|---|---|
| `onConnected` | Session starts, create new recording | (session start) |
| `onInput` | Key pressed: direction, action, back, custom | `input` |
| `onMove` | Position changed (tile-sampled) | `move` |
| `onJoinMap` | Player entered a new map | `map_change` |
| `onDisconnected` | Session ends, generate summary, save to disk | (session end) |

The `onInput` hook in `player.ts` already receives the input data we need:

```96:99:main/player.ts
    onInput(player: RpgPlayer, { input }) {
        if (input == Control.Back) {
            player.callMainMenu()
        }
```

That `{ input }` parameter tells us exactly which key was pressed. For movement, `input` will be a `Direction` enum (up/down/left/right). For the action key, it's `Control.Action`. This is everything we need.

#### The SessionRecorder class

This is the core class. It follows the same patterns already used in your codebase. Look at how `InMemoryAgentMemory` works:

```13:26:src/agents/memory/InMemoryAgentMemory.ts
export class InMemoryAgentMemory implements IAgentMemory {
  private messages: MemoryEntry[] = []
  private readonly maxMessages: number

  constructor(options?: { maxMessages?: number }) {
    this.maxMessages = options?.maxMessages ?? DEFAULT_MAX_MESSAGES
  }

  addMessage(entry: MemoryEntry): void {
    this.messages.push(entry)
    while (this.messages.length > this.maxMessages) {
      this.messages.shift()
    }
  }
```

See the pattern? It's an array that accumulates entries, with a cap to prevent unbounded growth. The `SessionRecorder` would follow the same pattern:

```typescript
// Conceptual structure of the SessionRecorder
class SessionRecorder {
  // Map of playerId -> their active recording
  private activeSessions = new Map<string, SessionRecording>()

  start(playerId: string, playerName: string, mapId: string): void {
    // Create a new recording for this player
  }

  recordAction(playerId: string, action: SessionAction): void {
    // Append the action to the player's active recording
  }

  end(playerId: string): SessionRecording | undefined {
    // Stop recording, generate summary, save to disk, return the recording
  }
}
```

**Why a `Map<string, SessionRecording>`?** Because multiple players can be connected at the same time. Each player gets their own recording, and we look it up by their ID.

#### Storage: JSON files (keeping it simple)

For MVP, we'd save completed sessions as JSON files -- one file per session. The project already does something similar with agent memory persistence. A `data/sessions/` directory would contain files like:

```
data/sessions/
  session-abc123-2026-02-12T10-30-00.json
  session-def456-2026-02-12T11-15-00.json
```

Each file is just the `SessionRecording` object serialized to JSON. Simple, human-readable, easy to debug. Later this could move to Supabase (the project already has Supabase wired up for agent memory).

---

### Layer 2: Workflow Labeling -- "Naming the Dance"

A session recording is raw data. A **workflow** is a curated, named version of a recording that says "this sequence of actions accomplishes a specific goal."

Think of it like the difference between a raw video recording of someone cooking, and a published recipe with steps. The workflow is the recipe.

```typescript
interface Workflow {
  id: string
  name: string                    // "Morning herb gathering route"
  description?: string            // "Walk to north garden, collect 5 herbs"
  sourceRecordingId: string       // which session this came from
  actions: SessionAction[]        // the action sequence (possibly trimmed)
  tags: string[]                  // ['gathering', 'herbs', 'north-garden']
  requiredSkills: string[]        // ['move'] -- what NPC skills are needed
  startMap: string                // which map to start on
  startPosition: { x: number; y: number }  // where to start
  estimatedDuration: number       // how long the replay takes
}
```

**Why separate from `SessionRecording`?** Because:
1. You might want to **trim** a recording (remove the first 2 minutes of aimless wandering, keep only the useful part)
2. You might create **multiple workflows from one session** (first half = gathering route, second half = selling route)
3. Workflows have metadata that recordings don't (name, tags, required skills)
4. Workflows are the "public API" that the NPC Job System consumes

#### How it integrates with the existing Builder Dashboard

Your project already has a builder dashboard (the GUI that opens when you press B). Look at how it currently works:

```101:178:main/player.ts
        // Builder Dashboard — open when player presses 'B'
        // The 'builder-dashboard' input is registered in rpg.toml
        if (input === 'builder-dashboard') {
            try {
                const map = player.getCurrentMap<RpgMap>()
                if (!map) return

                const gui = player.gui('builder-dashboard')

                // Listen for "place" interactions from the client GUI
                gui.on('place', async (data: {
                    // ... spawning NPCs
                })

                gui.open(
                    {
                        mapId: map.id,
                        aiNpcConfigs,
                        scriptedEvents: getScriptedEventOptions(),
                    },
                    { blockPlayerInput: true },
                )
```

The pattern is: open a GUI, pass it data, listen for events from the GUI. We'd add a new "Sessions" tab to this dashboard that shows recent recordings and lets you convert them to workflows. Same pattern, new tab.

---

### Layer 3: NPC Job System -- "Going to Work"

This is the payoff. Now we have named workflows. We assign them to NPCs.

#### How NPC actions currently work

This is crucial to understand. Right now, NPCs do things through the **skill system**. Look at the existing skills:

| Skill | What it does |
|---|---|
| `move` | Move one tile in a direction |
| `say` | Speak to a nearby player |
| `look` | Observe surroundings |
| `emote` | Show an emotion bubble |
| `wait` | Pause for a duration |

Currently, the **LLM decides** which skills to use. The flow is:

```
idle_tick → AgentRunner → LLM thinks → "I'll move north" → move skill executes
```

For job replay, we **skip the LLM entirely**. Instead of asking the AI "what should I do?", we just feed it the recorded action sequence directly:

```
job_trigger → WorkflowPlayer → reads next action from recording → move skill executes
```

This is a huge insight: **the same skill system that the LLM uses can be driven by a recorded sequence instead**. The NPC doesn't know or care whether the `move` command came from an LLM or from a replay. The skill interface is the same either way.

Look at how skills work:

```159:188:src/agents/skills/types.ts
export interface IAgentSkill {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, SkillParameterSchema>;
  execute(
    params: Record<string, unknown>,
    context: GameContext,
  ): Promise<SkillResult>;
}
```

A skill takes `params` (like `{ direction: 'up' }`) and a `context` (the NPC's current state), and returns a result. The `WorkflowPlayer` would just call these same skills with the params from the recording.

#### The WorkflowPlayer -- replay engine

```typescript
// Conceptual structure
class WorkflowPlayer {
  async replay(
    workflow: Workflow,
    skillRegistry: ISkillRegistry,
    gameContext: GameContext
  ): Promise<void> {
    for (const action of workflow.actions) {
      // Wait the appropriate time between actions (preserving pacing)
      await sleep(action.timestamp - previousTimestamp)
      
      // Translate the recorded action into a skill call
      if (action.type === 'move' && action.data.input) {
        await skillRegistry.executeSkill('move', {
          direction: inputToDirection(action.data.input)
        }, gameContext)
      }
      // ... handle other action types
    }
  }
}
```

**Why use `setTimeout` timers and not `onStep`?** This is a project rule:

> Do NOT use `onStep` (60 FPS) for agent logic -- use timer-based idle ticks (~15s).

`onStep` runs 60 times per second for ALL entities. If you put workflow replay logic there, it runs 60 times a second even when the NPC is doing nothing. That's wasteful. `setTimeout` only fires when needed.

#### The JobScheduler -- when to work

The `JobScheduler` is a timer that checks "does any NPC have a job to do right now?" It integrates with the existing `GameChannelAdapter`:

```67:101:src/agents/bridge/GameChannelAdapter.ts
export class GameChannelAdapter implements IGameChannelAdapter {
  private readonly agentId: string
  private readonly laneQueue: ILaneQueue
  private readonly runner: IAgentRunner
  private readonly idleIntervalMs: number
  // ...

  start(event: GameEvent): void {
    if (this.disposed) return
    // First idle tick after a short delay so the server can settle
    this.firstIdleTimer = setTimeout(() => {
      this.onIdleTick(event)
    }, FIRST_IDLE_DELAY_MS)
    // Repeating idle tick
    this.idleTimer = setInterval(() => {
      this.onIdleTick(event)
    }, this.idleIntervalMs)
  }
```

When a job is active, the adapter would **suppress idle ticks** and let the `WorkflowPlayer` drive the NPC instead. This is clean because the `LaneQueue` already ensures one-thing-at-a-time:

```37:59:src/agents/core/LaneQueue.ts
  enqueue(agentId: string, task: () => Promise<void>): Promise<void> {
    const lane = this.getOrCreateLane(agentId)
    lane.queue.push(task)
    // ... serial execution -- one task at a time per NPC
  }
```

So you'd enqueue the workflow replay as a task on the lane queue, and it would naturally prevent conflicts with conversations or idle behavior.

#### Assigning jobs via YAML config

The existing YAML config:

```1:24:src/config/agents/elder-theron.yaml
id: elder-theron
name: Elder Theron
graphic: female
personality: |
  You are Elder Theron, the wise village elder of a small settlement.
  You speak thoughtfully and care deeply about the villagers. You greet
  newcomers warmly and offer guidance. Keep responses under 150 characters.
model:
  idle: kimi-k2-0711-preview
  conversation: kimi-k2-0711-preview
skills:
  - move
  - say
  - look
  - emote
  - wait
spawn:
  map: simplemap
  x: 300
  y: 250
behavior:
  idleInterval: 20000
  patrolRadius: 3
  greetOnProximity: true
```

We'd extend this with a `jobs` section:

```yaml
jobs:
  - workflow: morning-patrol      # references a saved workflow by name
    schedule:
      type: daily
      startHour: 6               # game hour (for future day-night cycle)
  - workflow: evening-gathering
    schedule:
      type: interval
      intervalMs: 300000         # every 5 minutes (for testing)
```

This is **declarative** (data, not code), which is a pattern the project already uses. Want to give an NPC a new job? Edit the YAML. No code changes needed.

---

### Why this architecture is scalable

Here's the key to scalability -- **separation of concerns**. Each piece does one thing well:

```
SessionRecorder  -- knows how to capture player actions (doesn't know about workflows)
WorkflowManager  -- knows how to store/retrieve workflows (doesn't know about NPCs)
WorkflowPlayer   -- knows how to replay actions (doesn't know about scheduling)
JobScheduler     -- knows when to trigger jobs (doesn't know how replay works)
SkillRegistry    -- knows how to execute game commands (doesn't know who's calling)
LaneQueue        -- knows how to serialize tasks (doesn't know what the tasks are)
```

Each component is an interface (like `IAgentMemory`, `ISkillRegistry`, `ILaneQueue`) that can have its implementation swapped out. Want to store sessions in Supabase instead of JSON files? Write a new storage adapter. Want to add "pathfinding" to workflow replay so NPCs navigate around obstacles? Change only the `WorkflowPlayer`. Nothing else needs to change.

This is the same pattern already used throughout the codebase. Look at how memory works -- `IAgentMemory` has two implementations (`InMemoryAgentMemory` and `SupabaseAgentMemory`) and the rest of the system doesn't know or care which one is active.

---

### What you could build on top of this later

This is where it gets really exciting:

1. **LLM-enhanced workflows** -- Instead of dumb replay, feed the workflow to the LLM as context: "Here's a task you need to do. Here's how a human did it. Adapt as needed." Now the NPC can handle obstacles the human didn't encounter.

2. **Workflow composition** -- Chain workflows together: "Do the morning patrol workflow, then the herb gathering workflow, then the selling workflow." Now you have a full daily schedule.

3. **Learning from failure** -- If a workflow replay fails (NPC hits a wall that wasn't there during recording), the system logs *why* it failed. Over time, you can identify which workflows need updating.

4. **Crowd-sourced workflows** -- Multiple players contribute recordings for the same task. The system picks the most efficient one, or combines elements from several.

5. **NPC economy** -- NPCs that complete their jobs earn resources. NPCs that fail lose resources. An emergent economy emerges from workflow completion rates.

6. **Workflow marketplace** -- Players can share and trade workflows. "I found an amazing shortcut for the herb run, want to buy my workflow?"

All of these are extensions that plug into the same interfaces. That's why the architecture matters.

---

### Summary: The implementation order

If I were teaching you to build this, I'd say:

1. **Start with `SessionAction` and `SessionRecording` types** -- Define the data shapes first. This forces you to think clearly about what you're capturing.

2. **Build `SessionRecorder`** -- One class that manages active recordings. Follow the `InMemoryAgentMemory` pattern.

3. **Hook it into `player.ts`** -- Just a few lines in each existing hook. `onConnected` starts recording, `onInput` records inputs, `onDisconnected` stops recording.

4. **Add JSON storage** -- Save completed sessions to `data/sessions/`. Read them back for the workflow UI.

5. **Build `WorkflowManager`** -- The labeling layer. Very similar to step 4 but for curated workflows.

6. **Build `WorkflowPlayer`** -- The replay engine. This is the most interesting code -- translating recorded actions into skill calls.

7. **Build `JobScheduler`** -- Timer-based triggers. Wire it into the existing `GameChannelAdapter`.

8. **Add `jobs` to the YAML config** -- Declarative job assignment.

Each step is independently testable and useful. You don't need all 8 steps to get value -- even just step 1-4 gives you player analytics and debugging insight.