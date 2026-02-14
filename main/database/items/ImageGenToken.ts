/**
 * ImageGenToken — RPGJS database item for token-gated image generation.
 *
 * NPCs with 'image-gen-token' in their inventory can use the generate_image skill.
 * Narratively: "A shimmering lens that allows the bearer to capture visions."
 *
 * @see .ai/idea/14-modular-skill-plugin-architecture.md — Layer 2: Item-Gated Skill Access
 */

import { Item } from '@rpgjs/database'

@Item({
  id: 'image-gen-token',
  name: 'Mystical Lens',
  description: 'A shimmering lens that allows the bearer to capture visions.',
  price: 0,
  consumable: false,
})
export default class ImageGenToken {}
