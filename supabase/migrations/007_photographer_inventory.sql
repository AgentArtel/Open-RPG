-- Give the Photographer NPC the Mystical Lens so she can use the generate_image skill (TASK-018).
-- The token is defined in main/database/items/ImageGenToken.ts (id: 'image-gen-token').
-- Once TASK-018 adds generate_image to her skills array, she'll be able to use it.

update agent_configs
  set inventory = array['image-gen-token']
  where id = 'photographer';
