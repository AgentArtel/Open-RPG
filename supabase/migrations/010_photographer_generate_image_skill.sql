-- 010_photographer_generate_image_skill.sql
-- Add 'generate_image' to the photographer NPC's skills array.
-- The photographer already has 'image-gen-token' in inventory (seed from 009).
-- This migration enables the actual skill so the NPC can use it.

UPDATE game.agent_configs
SET skills = array_append(skills, 'generate_image')
WHERE id = 'photographer'
  AND NOT ('generate_image' = ANY(skills));
