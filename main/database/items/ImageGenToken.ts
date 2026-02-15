/**
 * ImageGenToken — RPGJS database item for token-gated image generation.
 *
 * NPCs with 'image-gen-token' in their inventory can use the generate_image skill.
 * Display name is "Camera" so players see what the item is.
 *
 * @see .ai/idea/14-modular-skill-plugin-architecture.md — Layer 2: Item-Gated Skill Access
 */

import { Item } from '@rpgjs/database'

@Item({
  id: 'image-gen-token',
  name: 'Camera',
  description: 'A camera that allows the bearer to capture and develop images.',
  price: 0,
  consumable: false,
})
export default class ImageGenToken {}
