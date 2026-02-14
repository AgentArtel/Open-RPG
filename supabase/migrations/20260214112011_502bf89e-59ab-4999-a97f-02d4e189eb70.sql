
-- Create isolated studio schema
CREATE SCHEMA IF NOT EXISTS studio;

-- Grant usage to PostgREST roles
GRANT USAGE ON SCHEMA studio TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA studio TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA studio GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- Expose studio schema via PostgREST
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, studio';
NOTIFY pgrst, 'reload config';

-- 1. studio.workflows
CREATE TABLE studio.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  node_count integer NOT NULL DEFAULT 0,
  execution_count integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  nodes_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  connections_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. studio.executions
CREATE TABLE studio.executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES studio.workflows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  node_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. studio.activity_log
CREATE TABLE studio.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  workflow_name text,
  workflow_id uuid REFERENCES studio.workflows(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. studio.credentials
CREATE TABLE studio.credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  service text NOT NULL,
  encrypted_value text NOT NULL DEFAULT '',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. studio.templates (global, no user_id)
CREATE TABLE studio.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  difficulty text NOT NULL DEFAULT 'beginner',
  node_count integer NOT NULL DEFAULT 0,
  nodes_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  connections_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. studio.profiles
CREATE TABLE studio.profiles (
  id uuid PRIMARY KEY,
  first_name text DEFAULT '',
  last_name text DEFAULT '',
  email text DEFAULT '',
  avatar_url text,
  notification_prefs jsonb NOT NULL DEFAULT '{"email":true,"push":false,"executions":true,"errors":true}'::jsonb,
  ui_prefs jsonb NOT NULL DEFAULT '{"darkMode":true,"compactView":false,"autoSave":true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ========== RLS ==========

ALTER TABLE studio.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio.executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio.profiles ENABLE ROW LEVEL SECURITY;

-- Workflows RLS
CREATE POLICY "Users manage own workflows" ON studio.workflows FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Executions RLS
CREATE POLICY "Users manage own executions" ON studio.executions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Activity log RLS
CREATE POLICY "Users manage own activity" ON studio.activity_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Credentials RLS
CREATE POLICY "Users manage own credentials" ON studio.credentials FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Profiles RLS
CREATE POLICY "Users manage own profile" ON studio.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Templates RLS (public read for authenticated)
CREATE POLICY "Authenticated users can read templates" ON studio.templates FOR SELECT TO authenticated USING (true);

-- ========== TRIGGERS ==========

-- updated_at triggers (reuse public.update_timestamp)
CREATE TRIGGER update_studio_workflows_updated_at
  BEFORE UPDATE ON studio.workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_studio_credentials_updated_at
  BEFORE UPDATE ON studio.credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_studio_profiles_updated_at
  BEFORE UPDATE ON studio.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Profile auto-creation on auth signup
CREATE OR REPLACE FUNCTION studio.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = studio
AS $$
BEGIN
  INSERT INTO studio.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION studio.handle_new_user();
