-- Migration 013: Content Store
-- NPC-generated content storage, semantic tagging, and social feed.
-- Supports: G-3 (Content Store + Tagging), G-4 (Associative Recall), S-5 (Feed UI)
--
-- Prerequisites: 009_game_schema.sql (game schema + set_updated_at trigger function)
--                011_studio_cross_schema_access.sql (default SELECT grants)

-- ============================================================
-- 1. npc_content — every artifact an NPC creates
-- ============================================================
CREATE TABLE IF NOT EXISTS game.npc_content (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       text        NOT NULL,
  content_type   text        NOT NULL,
  url            text,
  text_content   text,
  source_context jsonb       DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE game.npc_content IS 'NPC-generated content: images, text, conversations, prophecies';
COMMENT ON COLUMN game.npc_content.agent_id IS 'NPC who created this content (no FK — content outlives config changes)';
COMMENT ON COLUMN game.npc_content.content_type IS 'Free-form type: image, text, conversation, prophecy';
COMMENT ON COLUMN game.npc_content.url IS 'Media URL (Gemini-generated images, etc.)';
COMMENT ON COLUMN game.npc_content.text_content IS 'Caption, story, description, or full text content';
COMMENT ON COLUMN game.npc_content.source_context IS 'Full PerceptionSnapshot JSONB when content was created';

-- ============================================================
-- 2. content_tags — semantic tags on content (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS game.content_tags (
  content_id  uuid  NOT NULL REFERENCES game.npc_content ON DELETE CASCADE,
  tag         text  NOT NULL,
  confidence  float NOT NULL DEFAULT 1.0,
  source      text  NOT NULL DEFAULT 'perception',
  PRIMARY KEY (content_id, tag)
);

COMMENT ON TABLE game.content_tags IS 'Semantic tags on NPC content for associative recall';
COMMENT ON COLUMN game.content_tags.tag IS 'Free-form lowercase tag: map names, entity names, time, keywords';
COMMENT ON COLUMN game.content_tags.confidence IS '0.0-1.0 tag strength (all 1.0 for MVP)';
COMMENT ON COLUMN game.content_tags.source IS 'Tag origin: perception, llm, manual, fragment';

-- ============================================================
-- 3. npc_posts — social feed layer (Instagram clone)
-- ============================================================
CREATE TABLE IF NOT EXISTS game.npc_posts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id        uuid        REFERENCES game.npc_content ON DELETE CASCADE,
  agent_id          text        NOT NULL,
  npc_name          text        NOT NULL,
  caption           text,
  approved          boolean     NOT NULL DEFAULT false,
  posted_externally boolean     NOT NULL DEFAULT false,
  likes             integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE game.npc_posts IS 'NPC social feed posts — links to npc_content, supports Studio approval';
COMMENT ON COLUMN game.npc_posts.npc_name IS 'Denormalized display name (historical record, not FK)';
COMMENT ON COLUMN game.npc_posts.approved IS 'Studio approval toggle for external posting';
COMMENT ON COLUMN game.npc_posts.posted_externally IS 'Future: set true when posted to Instagram via Meta Graph API';
COMMENT ON COLUMN game.npc_posts.likes IS 'Simple counter (junction table for double-like prevention is post-MVP)';

-- Reuse the updated_at trigger function from migration 009
CREATE TRIGGER trg_npc_posts_updated_at
  BEFORE UPDATE ON game.npc_posts
  FOR EACH ROW EXECUTE FUNCTION game.set_updated_at();

-- ============================================================
-- 4. Indexes
-- ============================================================
CREATE INDEX idx_npc_content_agent   ON game.npc_content(agent_id);
CREATE INDEX idx_npc_content_created ON game.npc_content(created_at DESC);
CREATE INDEX idx_content_tags_tag    ON game.content_tags(tag);
CREATE INDEX idx_npc_posts_agent     ON game.npc_posts(agent_id);
CREATE INDEX idx_npc_posts_created   ON game.npc_posts(created_at DESC);

-- ============================================================
-- 5. Grants
-- ============================================================
-- SELECT is auto-granted via ALTER DEFAULT PRIVILEGES in migration 011.
-- Game server writes all 3 tables via service_role (bypasses grants).
-- Studio needs UPDATE + DELETE on npc_posts for approval/management.
GRANT UPDATE, DELETE ON game.npc_posts TO authenticated;

-- ============================================================
-- 6. RPC: recall_content — tag-overlap associative recall
-- ============================================================
CREATE OR REPLACE FUNCTION game.recall_content(
  p_agent_id text,
  p_tags     text[],
  p_limit    integer DEFAULT 5
)
RETURNS TABLE (
  id             uuid,
  agent_id       text,
  content_type   text,
  url            text,
  text_content   text,
  source_context jsonb,
  created_at     timestamptz,
  relevance      bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT c.id, c.agent_id, c.content_type, c.url, c.text_content,
         c.source_context, c.created_at,
         count(ct.tag) AS relevance
  FROM game.npc_content c
  JOIN game.content_tags ct ON c.id = ct.content_id
  WHERE c.agent_id = p_agent_id
    AND ct.tag = ANY(p_tags)
  GROUP BY c.id
  ORDER BY relevance DESC, c.created_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION game.recall_content IS 'Associative recall: find NPC content by tag overlap, ranked by relevance then recency';
