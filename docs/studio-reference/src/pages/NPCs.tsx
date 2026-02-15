import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { NPCCard } from '@/components/npcs/NPCCard';
import { NPCFormModal } from '@/components/npcs/NPCFormModal';
import { SearchBar } from '@/components/workflow/SearchBar';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface NPCsProps {
  onNavigate: (page: string) => void;
}

export const NPCs: React.FC<NPCsProps> = ({ onNavigate }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNpc, setEditingNpc] = useState<Tables<'agent_configs'> | null>(null);

  // Fetch NPCs — game schema (same data the RPGJS game server uses)
  const { data: npcs = [], isLoading } = useQuery({
    queryKey: ['game', 'agent_configs'],
    queryFn: async () => {
      const { data, error } = await supabase.schema('game').from('agent_configs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch API integrations for skill checkboxes — game schema
  const { data: apiIntegrations = [] } = useQuery({
    queryKey: ['game', 'api_integrations'],
    queryFn: async () => {
      const { data, error } = await supabase.schema('game').from('api_integrations').select('skill_name,name,required_item_id').eq('enabled', true);
      if (error) throw error;
      return data;
    },
  });

  // Mutations
  const upsertMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        id: form.id,
        name: form.name,
        graphic: form.graphic,
        personality: form.personality,
        model: form.model,
        skills: form.skills,
        spawn: form.spawn,
        behavior: form.behavior,
        inventory: form.inventory,
        enabled: form.enabled,
      };
      const isEdit = !!editingNpc;
      if (isEdit) {
        const { error } = await supabase.schema('game').from('agent_configs').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.schema('game').from('agent_configs').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game', 'agent_configs'] });
      toast.success(editingNpc ? 'NPC updated' : 'NPC created');
      setIsModalOpen(false);
      setEditingNpc(null);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save NPC'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.schema('game').from('agent_configs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game', 'agent_configs'] });
      toast.success('NPC deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete NPC'),
  });

  const toggleMutation = useMutation({
    mutationFn: async (npc: Tables<'agent_configs'>) => {
      const { error } = await supabase.schema('game').from('agent_configs').update({ enabled: !npc.enabled }).eq('id', npc.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game', 'agent_configs'] }),
    onError: (err: any) => toast.error(err.message || 'Failed to toggle NPC'),
  });

  const openCreate = useCallback(() => { setEditingNpc(null); setIsModalOpen(true); }, []);
  const openEdit = useCallback((npc: Tables<'agent_configs'>) => { setEditingNpc(npc); setIsModalOpen(true); }, []);
  const handleDelete = useCallback((id: string) => {
    if (!window.confirm('Delete this NPC? This cannot be undone.')) return;
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const filtered = npcs.filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()) || n.id.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">NPCs</h1>
          <p className="text-white/50 mt-1">Manage AI-powered game NPCs</p>
        </div>
        <Button className="bg-green text-dark hover:bg-green-light" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Create NPC
        </Button>
      </div>

      <div className="mb-6">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search NPCs..." className="max-w-md" />
      </div>

      {isLoading ? (
        <p className="text-white/40 text-sm">Loading...</p>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(npc => (
            <NPCCard key={npc.id} npc={npc} onEdit={() => openEdit(npc)} onDelete={() => handleDelete(npc.id)} onToggle={() => toggleMutation.mutate(npc)} />
          ))}
        </div>
      ) : (
        <EmptyState title="No NPCs found" description="Create your first AI NPC to populate your game world" icon={<Users className="w-8 h-8" />} actionLabel="Create NPC" onAction={openCreate} />
      )}

      <NPCFormModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingNpc(null); }} onSave={(form) => upsertMutation.mutate(form)} editingNpc={editingNpc} apiIntegrations={apiIntegrations} />
    </div>
  );
};
