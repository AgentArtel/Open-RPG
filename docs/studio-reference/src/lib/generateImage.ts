import { supabase } from '@/integrations/supabase/client';

export async function generateImage(params: {
  prompt: string;
  style?: string;
  agentId?: string;
}) {
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: params,
  });
  if (error) throw error;
  return data as { success: boolean; imageDataUrl?: string; error?: string; message?: string };
}
