import { supabase } from '@/integrations/supabase/client';

export interface MemoryMessage {
  role: string;
  content: string;
}

/**
 * Load the last N messages for a given session from studio_agent_memory.
 */
export async function loadMemory(
  sessionId: string,
  windowSize: number = 10
): Promise<MemoryMessage[]> {
  const { data, error } = await supabase
    .from('studio_agent_memory')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(windowSize);

  if (error) {
    console.error('[MemoryService] Failed to load memory:', error);
    return [];
  }

  // Reverse so oldest first
  return (data || []).reverse().map((row) => ({
    role: row.role,
    content: row.content,
  }));
}

/**
 * Save messages to studio_agent_memory for a given session.
 */
export async function saveMemory(
  sessionId: string,
  messages: MemoryMessage[],
  workflowId?: string
): Promise<void> {
  const rows = messages.map((msg) => ({
    session_id: sessionId,
    role: msg.role,
    content: msg.content,
    workflow_id: workflowId || null,
  }));

  const { error } = await supabase
    .from('studio_agent_memory')
    .insert(rows);

  if (error) {
    console.error('[MemoryService] Failed to save memory:', error);
  }
}

/**
 * Clear all memory for a given session.
 */
export async function clearMemory(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('studio_agent_memory')
    .delete()
    .eq('session_id', sessionId);

  if (error) {
    console.error('[MemoryService] Failed to clear memory:', error);
  }
}
