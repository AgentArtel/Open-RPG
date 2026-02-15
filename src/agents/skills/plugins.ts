/**
 * Skill Plugin Barrel
 *
 * Static re-export of all skill plugins. AgentManager imports this module
 * and iterates Object.values() to register skills by name.
 *
 * Adding a new skill = create the file + add one export line here.
 * No other core edits needed.
 */

export { skillPlugin as movePlugin } from './skills/move'
export { skillPlugin as sayPlugin } from './skills/say'
export { skillPlugin as lookPlugin } from './skills/look'
export { skillPlugin as emotePlugin } from './skills/emote'
export { skillPlugin as waitPlugin } from './skills/wait'
export { skillPlugin as generateImagePlugin } from './skills/generate-image'
