import { RpgEvent, EventData, RpgPlayer, Move, ShapePositioning, RpgShape } from '@rpgjs/server'

/**
 * Film Photographer NPC Event — captures moments on analog film.
 */
@EventData({
    name: 'EV-PHOTOGRAPHER',
    hitbox: {
        width: 32,
        height: 16
    }
})
export default class PhotographerEvent extends RpgEvent {
    onInit() {
        this.setGraphic('female')
        this.speed = 1
        this.frequency = 220
        this.infiniteMoveRoute([Move.tileRandom()])
        this.attachShape({
            height: 100,
            width: 100,
            positioning: ShapePositioning.Center
        })
        console.log('[Photographer] Initialized — looking for the perfect shot')
    }

    async onAction(player: RpgPlayer) {
        await player.showText(
            'Film photography is an art form. Every frame counts.',
            { talkWith: this }
        )
        await player.showText(
            'I love the grain, the colors, the way light hits the emulsion. Digital just can\'t capture that magic.',
            { talkWith: this }
        )
    }

    onDetectInShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[Photographer] Player "${player.name}" entered detection radius`)
    }

    onDetectOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[Photographer] Player "${player.name}" left detection radius`)
    }
}

