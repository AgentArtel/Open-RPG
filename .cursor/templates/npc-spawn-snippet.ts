/**
 * NPC Spawn Code Snippet
 * 
 * INSTRUCTIONS:
 * 1. Add the import at the top of main/player.ts with other NPC imports
 * 2. Add the spawn call inside the onJoinMap hook, inside the try block
 * 3. Replace {{PLACEHOLDER}} values with your NPC details
 * 
 * Example: For a Baker NPC at position (250, 350)
 */

// STEP 1: Add import at top of main/player.ts
import {{CLASS_NAME}} from './events/{{npc-name}}'

// STEP 2: Add spawn call inside onJoinMap, inside the try block:
// (Replace {{X}} and {{Y}} with pixel coordinates on the map)
map.createDynamicEvent({ x: {{X}}, y: {{Y}}, event: {{CLASS_NAME}} })
console.log('[{{NPC_ROLE}}] Spawned on map:', map.id)

