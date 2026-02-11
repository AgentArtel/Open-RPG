import { RpgEvent, EventData, RpgPlayer, Move, ShapePositioning, RpgShape } from '@rpgjs/server'

/**
 * Artist NPC Event — a creative soul who loves to paint and draw.
 */
@EventData({
    name: 'EV-ARTIST',
    hitbox: {
        width: 32,
        height: 16
    }
})
export default class ArtistEvent extends RpgEvent {
    onInit() {
        this.setGraphic('female')
        this.speed = 1
        this.frequency = 250
        this.infiniteMoveRoute([Move.tileRandom()])
        this.attachShape({
            height: 100,
            width: 100,
            positioning: ShapePositioning.Center
        })
        console.log('[Artist] Initialized — seeking inspiration')
    }

    async onAction(player: RpgPlayer) {
        await player.showText(
            'Art is everywhere, if you know how to look.',
            { talkWith: this }
        )
        await player.showText(
            'I\'m working on a new piece. The colors of this world are simply breathtaking!',
            { talkWith: this }
        )
    }

    onDetectInShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[Artist] Player "${player.name}" entered detection radius`)
    }

    onDetectOutShape(player: RpgPlayer, shape: RpgShape) {
        console.log(`[Artist] Player "${player.name}" left detection radius`)
    }
}

