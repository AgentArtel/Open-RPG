import { RpgMap, MapData } from '@rpgjs/server'
import VillagerEvent from '../events/villager'
import StartEvent from '../events/start-event'

/**
 * Simplemap — main village map.
 * Events are placed by name from the TMX object layer (EV-1, start).
 */
@MapData({
  id: 'simplemap',
  file: require('../worlds/maps/simplemap.tmx'),
  name: 'Village',
  events: [VillagerEvent, StartEvent],
})
export default class SimpleMap extends RpgMap {}
