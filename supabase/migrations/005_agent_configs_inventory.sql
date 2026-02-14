-- Add inventory column so NPCs can be granted token items from the DB.
-- Items in inventory are granted at spawn (AgentNpcEvent.onInit); tokens enable API-backed skills.

alter table agent_configs
  add column if not exists inventory text[] not null default '{}';

comment on column agent_configs.inventory is
  'Item IDs the NPC spawns with (e.g. image-gen-token). Tokens in inventory enable API integrations; '
  'match required_item_id in api_integrations. Game grants these via addItem() in onInit.';
