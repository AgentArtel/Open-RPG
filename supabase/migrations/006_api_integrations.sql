-- Catalog of API integrations / skills that exist in the game.
-- Studio and config UIs can list these so you choose from "skills/API integrations that work in the game."
-- Tokens are literal items in the NPC (or player) inventory that enable use of an integration.

create table if not exists api_integrations (
  id               text        primary key,                    -- e.g. 'image-generation'
  name             text        not null,                        -- display name, e.g. 'Image Generation'
  description      text        default '',                      -- for Studio UI
  skill_name       text        not null,                        -- the skill this powers, e.g. 'generate_image'
  required_item_id text        not null,                        -- item ID that grants access, e.g. 'image-gen-token'
  requires_env     text[]      not null default '{}',          -- env vars needed, e.g. ['GEMINI_API_KEY']
  category         text        not null default 'api',         -- 'api' | 'social' | 'knowledge'
  enabled          boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Reuse update_timestamp() from 002
drop trigger if exists api_integrations_updated on api_integrations;
create trigger api_integrations_updated
  before update on api_integrations
  for each row execute function update_timestamp();

comment on table api_integrations is
  'Catalog of API-backed skills in the game. When adding skills to an agent, choose from game skills '
  'plus these integrations. The required_item_id is the token item (in main/database/items/); the NPC '
  'must have that item in inventory to use the skill. Studio can list this table for dropdowns.';

-- Seed: image generation (Gemini) — used by Photographer NPC in TASK-018
insert into api_integrations (id, name, description, skill_name, required_item_id, requires_env, category)
values (
  'image-generation',
  'Image Generation',
  'Generate images from a text prompt via Gemini. Requires the Mystical Lens (image-gen-token) in inventory.',
  'generate_image',
  'image-gen-token',
  '{GEMINI_API_KEY}',
  'api'
)
on conflict (id) do nothing;
