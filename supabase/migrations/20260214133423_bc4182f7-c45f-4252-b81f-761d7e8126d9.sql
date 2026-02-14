
-- Studio Workflows table
CREATE TABLE public.studio_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  node_count integer NOT NULL DEFAULT 0,
  execution_count integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  nodes_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  connections_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Studio Executions table
CREATE TABLE public.studio_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.studio_workflows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  node_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Studio Activity Log table
CREATE TABLE public.studio_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  type text NOT NULL,
  message text NOT NULL,
  workflow_name text,
  workflow_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at trigger for workflows
CREATE TRIGGER update_studio_workflows_updated_at
  BEFORE UPDATE ON public.studio_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Indexes
CREATE INDEX idx_studio_workflows_user ON public.studio_workflows(user_id);
CREATE INDEX idx_studio_workflows_status ON public.studio_workflows(status);
CREATE INDEX idx_studio_executions_workflow ON public.studio_executions(workflow_id);
CREATE INDEX idx_studio_executions_user ON public.studio_executions(user_id);
CREATE INDEX idx_studio_activity_log_user ON public.studio_activity_log(user_id);

-- RLS disabled for development (matching existing approach)
ALTER TABLE public.studio_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_activity_log ENABLE ROW LEVEL SECURITY;

-- Permissive policies for development
CREATE POLICY "Allow all access to studio_workflows" ON public.studio_workflows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to studio_executions" ON public.studio_executions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to studio_activity_log" ON public.studio_activity_log FOR ALL USING (true) WITH CHECK (true);
