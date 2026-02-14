import { supabase } from '@/integrations/supabase/client';

export async function geminiChat(params: {
  messages: { role: string; content: string }[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}) {
  const { data, error } = await supabase.functions.invoke('gemini-chat', {
    body: params,
  });
  if (error) throw error;
  return data as { success: boolean; text?: string; usage?: Record<string, number>; error?: string; message?: string };
}

export async function geminiEmbed(params: {
  text: string | string[];
  model?: string;
}) {
  const { data, error } = await supabase.functions.invoke('gemini-embed', {
    body: params,
  });
  if (error) throw error;
  return data as { success: boolean; embeddings?: number[][]; error?: string; message?: string };
}

export async function geminiVision(params: {
  prompt: string;
  imageUrl: string;
  model?: string;
}) {
  const { data, error } = await supabase.functions.invoke('gemini-vision', {
    body: params,
  });
  if (error) throw error;
  return data as { success: boolean; text?: string; error?: string; message?: string };
}
