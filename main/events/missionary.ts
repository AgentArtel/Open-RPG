import { RpgEvent, EventData, RpgPlayer, Move, ShapePositioning, RpgShape } from '@rpgjs/server'

/**
 * Missionary NPC Event — invites people to learn about Artel and visit the temple.
 */
@EventData({
    name: 'EV-MISSIONARY',
    hitbox: {
        width: 32,
        height: 16
    }
})
export default class MissionaryEvent extends RpgEvent {
    onInit() {
        this.setGraphic('female')
        this.speed = 1
        this.frequency = 280
        this.infiniteMoveRoute([Move.tileRandom()])
        this.attachShape({
            height: 110,
            width: 110,
            positioning: ShapePositioning.Center
        })
        console.log('[Missionary] Initialized — spreading the word about Artel')
    }

    async onAction(player: RpgPlayer) {
        await player.showText(
            'Peace be with you, traveler. Have you heard of Artel?',
            { talkWith: this }
        )
        await player.showText(
            'The temple is a place of great wisdom and beauty. I invite you to visit and learn about our teachings.',
            { talkWith: this }
        )
    }

    onDetectInShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[Missionary] Player "${player.name}" entered detection radius — sharing the message`)
    }

    onDetectOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[Missionary] Player "${player.name}" left detection radius`)
    }
}

