import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'

/**
 * Map object "start" (spawn point). If the player presses Action here,
 * they get a short message so the spot isn't unresponsive.
 */
@EventData({
  name: 'start',
  hitbox: { width: 32, height: 16 },
})
export default class StartEvent extends RpgEvent {
  onInit() {
    this.setGraphic('female')
    this.through = true
  }

  async onAction(player: RpgPlayer) {
    await player.showText(
      "This is the village square where you arrived. Walk around and talk to the villagers!",
      { talkWith: this }
    )
  }
}
