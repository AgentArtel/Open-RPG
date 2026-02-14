
CREATE TABLE public.studio_agent_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  workflow_id uuid REFERENCES public.studio_workflows(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_studio_agent_memory_session ON public.studio_agent_memory(session_id, created_at DESC);

ALTER TABLE public.studio_agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to studio_agent_memory"
  ON public.studio_agent_memory
  FOR ALL
  USING (true)
  WITH CHECK (true);
