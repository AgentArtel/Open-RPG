
-- Seed studio.workflows (6 rows) with fixed UUIDs for FK references
INSERT INTO studio.workflows (id, user_id, name, description, status, node_count, execution_count, last_run_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'AI Content Generator', 'Generates blog posts from keywords using OpenAI', 'active', 5, 142, now() - interval '2 minutes'),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Customer Support Bot', 'Auto-replies to common questions with AI', 'active', 8, 89, now() - interval '15 minutes'),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Email Automation', 'Sends weekly newsletters to subscribers', 'inactive', 4, 56, NULL),
  ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'Data Sync', 'Syncs data between platforms every hour', 'error', 12, 234, now() - interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'Slack Notifications', 'Sends alerts for important events', 'active', 3, 567, now() - interval '1 hour'),
  ('a0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'Lead Scoring', 'Scores leads based on behavior', 'active', 7, 123, now() - interval '30 minutes');

-- Seed studio.executions (7 rows)
INSERT INTO studio.executions (id, workflow_id, user_id, status, started_at, completed_at, duration_ms, error_message) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'success', now() - interval '2 minutes', now() - interval '1 minute', 1200, NULL),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'success', now() - interval '15 minutes', now() - interval '14 minutes', 3400, NULL),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'success', now() - interval '1 hour', now() - interval '59 minutes', 2100, NULL),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'error', now() - interval '2 hours', now() - interval '119 minutes', 5600, 'Connection timeout'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'success', now() - interval '3 hours', now() - interval '179 minutes', 800, NULL),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'success', now() - interval '5 hours', now() - interval '299 minutes', 4200, NULL),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'running', now() - interval '30 seconds', NULL, NULL, NULL);

-- Seed studio.activity_log (5 rows)
INSERT INTO studio.activity_log (user_id, type, message, workflow_name, workflow_id, created_at) VALUES
  ('00000000-0000-0000-0000-000000000000', 'success', 'Workflow executed successfully', 'AI Content Generator', 'a0000000-0000-0000-0000-000000000001', now() - interval '2 minutes'),
  ('00000000-0000-0000-0000-000000000000', 'execution', 'Workflow started', 'Customer Support Bot', 'a0000000-0000-0000-0000-000000000002', now() - interval '15 minutes'),
  ('00000000-0000-0000-0000-000000000000', 'created', 'New workflow created', 'Email Automation', 'a0000000-0000-0000-0000-000000000003', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-000000000000', 'error', 'Execution failed', 'Data Sync', 'a0000000-0000-0000-0000-000000000004', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-000000000000', 'updated', 'Workflow updated', 'Slack Notifications', 'a0000000-0000-0000-0000-000000000005', now() - interval '3 hours');

-- Seed studio.credentials (4 rows)
INSERT INTO studio.credentials (user_id, name, service, encrypted_value) VALUES
  ('00000000-0000-0000-0000-000000000000', 'OpenAI Production', 'OpenAI', 'sk-••••••••••••••••abcd'),
  ('00000000-0000-0000-0000-000000000000', 'Slack Bot Token', 'Slack', 'xoxb-••••••••••••1234'),
  ('00000000-0000-0000-0000-000000000000', 'GitHub PAT', 'GitHub', 'ghp_••••••••••••••••wxyz'),
  ('00000000-0000-0000-0000-000000000000', 'Stripe Test Key', 'Stripe', 'sk_test_••••••••••5678');

-- Seed studio.templates (6 rows)
INSERT INTO studio.templates (name, description, category, difficulty, node_count) VALUES
  ('AI Content Generator', 'Generate blog posts, social media content, and more using AI', 'Marketing', 'beginner', 5),
  ('Customer Support Bot', 'Automated customer support with AI-powered responses', 'Support', 'intermediate', 8),
  ('Lead Scoring Automation', 'Score and qualify leads based on behavior and demographics', 'Sales', 'advanced', 10),
  ('Social Media Scheduler', 'Schedule and publish posts across multiple platforms', 'Marketing', 'beginner', 4),
  ('Data Pipeline', 'ETL pipeline for syncing data between services', 'DevOps', 'advanced', 12),
  ('Email Drip Campaign', 'Automated email sequences based on user actions', 'Marketing', 'intermediate', 6);

-- Seed studio.profiles (1 row)
INSERT INTO studio.profiles (id, first_name, last_name, email) VALUES
  ('00000000-0000-0000-0000-000000000000', 'John', 'Doe', 'john@example.com');
