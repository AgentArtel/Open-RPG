
-- Seed sample workflows
INSERT INTO public.studio_workflows (id, name, description, status, node_count, execution_count, last_run_at) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'AI Content Generator', 'Generates blog posts from keywords using Gemini', 'active', 5, 142, now() - interval '2 minutes'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Image Pipeline', 'Generates and analyzes images with Gemini Vision', 'active', 4, 89, now() - interval '15 minutes'),
  ('a1b2c3d4-0000-0000-0000-000000000003', 'Customer Support Bot', 'Auto-replies to common questions with AI', 'inactive', 8, 56, NULL),
  ('a1b2c3d4-0000-0000-0000-000000000004', 'Data Embedder', 'Embeds documents for semantic search', 'error', 3, 234, now() - interval '2 hours');

-- Seed sample executions
INSERT INTO public.studio_executions (workflow_id, status, started_at, completed_at, duration_ms) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'success', now() - interval '2 minutes', now() - interval '1 minute', 2450),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'success', now() - interval '15 minutes', now() - interval '14 minutes', 5600),
  ('a1b2c3d4-0000-0000-0000-000000000004', 'error', now() - interval '2 hours', now() - interval '2 hours' + interval '3 seconds', 3200),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'success', now() - interval '1 day', now() - interval '1 day' + interval '2 seconds', 2100),
  ('a1b2c3d4-0000-0000-0000-000000000003', 'success', now() - interval '3 hours', now() - interval '3 hours' + interval '1 second', 800);

-- Seed activity log
INSERT INTO public.studio_activity_log (type, message, workflow_name, workflow_id) VALUES
  ('success', 'Workflow executed successfully', 'AI Content Generator', 'a1b2c3d4-0000-0000-0000-000000000001'),
  ('execution', 'Workflow started', 'Image Pipeline', 'a1b2c3d4-0000-0000-0000-000000000002'),
  ('created', 'New workflow created', 'Customer Support Bot', 'a1b2c3d4-0000-0000-0000-000000000003'),
  ('error', 'Execution failed', 'Data Embedder', 'a1b2c3d4-0000-0000-0000-000000000004'),
  ('updated', 'Workflow updated', 'AI Content Generator', 'a1b2c3d4-0000-0000-0000-000000000001');
