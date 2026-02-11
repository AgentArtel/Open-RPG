import { RpgEvent, EventData, RpgPlayer, Move, ShapePositioning, RpgShape } from '@rpgjs/server'

/**
 * {{NPC_ROLE}} NPC Event — {{NPC_DESCRIPTION}}
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to main/events/{{npc-name}}.ts
 * 2. Replace all {{PLACEHOLDER}} values below
 * 3. Add spawn line to main/player.ts (see npc-spawn-snippet.ts)
 */
@EventData({
    name: '{{EVENT_NAME}}',  // e.g., 'EV-BAKER' — must be unique
    hitbox: {
        width: 32,
        height: 16
    }
})
export default class {{CLASS_NAME}} extends RpgEvent {

    /**
     * Called when the NPC is first created on the map.
     * Sets up the NPC's appearance, movement, and detection shape.
     */
    onInit() {
        // Set the NPC's sprite — all NPCs use 'female' by default
        this.setGraphic('female')

        // Configure movement speed and frequency
        // speed = how fast the NPC moves (pixels per tick)
        // frequency = delay in ms between each movement step
        this.speed = 1
        this.frequency = {{FREQUENCY}}  // Default: 200 (ms between moves)

        // Start infinite random patrol — NPC walks one tile in a random
        // direction (up/down/left/right), then picks another random direction
        this.infiniteMoveRoute([Move.tileRandom()])

        // Attach a detection shape centered on the NPC.
        // When a player enters this area, onDetectInShape fires.
        // When they leave, onDetectOutShape fires.
        this.attachShape({
            height: {{DETECTION_SIZE}},  // Default: 100 (pixels)
            width: {{DETECTION_SIZE}},   // Default: 100 (pixels)
            positioning: ShapePositioning.Center
        })

        console.log('[{{NPC_ROLE}}] Initialized — {{INIT_MESSAGE}}')
    }

    /**
     * Called when a player faces this NPC and presses the action key (space/enter).
     * Shows dialogue text — will be replaced with LLM-generated dialogue once
     * the agent system is wired up.
     */
    async onAction(player: RpgPlayer) {
        await player.showText(
            '{{DIALOGUE_LINE_1}}',
            { talkWith: this }
        )
        await player.showText(
            '{{DIALOGUE_LINE_2}}',
            { talkWith: this }
        )
    }

    /**
     * Called when a player enters the detection shape attached to this NPC.
     * This is the foundation for the future agent proximity trigger —
     * it will eventually fire an AgentEvent to wake up the AI agent.
     */
    onDetectInShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[{{NPC_ROLE}}] Player "${player.name}" entered detection radius`)
    }

    /**
     * Called when a player leaves the detection shape attached to this NPC.
     * Logs the departure — future agent system will use this to end interactions.
     */
    onDetectOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[{{NPC_ROLE}}] Player "${player.name}" left detection radius`)
    }
}

