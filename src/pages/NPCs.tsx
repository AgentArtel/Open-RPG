import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { gameDb } from '@/lib/gameSchema';
import { NPCCard } from '@/components/npcs/NPCCard';
import { NPCFormModal } from '@/components/npcs/NPCFormModal';
import { SearchBar } from '@/components/workflow/SearchBar';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users } from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  graphic: string;
  personality: string;
  model: { idle: string; conversation: string };
  skills: string[];
  spawn: { map: string; x: number; y: number };
  behavior: { idleInterval: number; patrolRadius: number; greetOnProximity: boolean };
  inventory: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface NpcBuilderProps {
  onNavigate: (page: string) => void;
}

export const NpcBuilder: React.FC<NpcBuilderProps> = ({ onNavigate }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNpc, setEditingNpc] = useState<AgentConfig | null>(null);

  // Fetch all NPCs from game.agent_configs
  const { data: npcs = [], isLoading } = useQuery({
    queryKey: ['game-agent-configs'],
    queryFn: async () => {
      const { data, error } = await gameDb()
        .from('agent_configs')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as AgentConfig[];
    },
  });

  // Create NPC
  const createMutation = useMutation({
    mutationFn: async (npc: AgentConfig) => {
      const { id, ...rest } = npc;
      const { error } = await gameDb()
        .from('agent_configs')
        .insert({ id, ...rest });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-agent-configs'] });
      toast.success('NPC created');
      setIsModalOpen(false);
    },
    onError: (err: Error) => toast.error(`Failed to create NPC: ${err.message}`),
  });

  // Update NPC
  const updateMutation = useMutation({
    mutationFn: async (npc: AgentConfig) => {
      const { id, created_at, updated_at, ...rest } = npc;
      const { error } = await gameDb()
        .from('agent_configs')
        .update(rest)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-agent-configs'] });
      toast.success('NPC updated');
      setIsModalOpen(false);
      setEditingNpc(null);
    },
    onError: (err: Error) => toast.error(`Failed to update NPC: ${err.message}`),
  });

  // Delete NPC
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await gameDb()
        .from('agent_configs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-agent-configs'] });
      toast.success('NPC deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete NPC: ${err.message}`),
  });

  // Toggle enabled
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await gameDb()
        .from('agent_configs')
        .update({ enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-agent-configs'] });
    },
    onError: (err: Error) => toast.error(`Failed to toggle NPC: ${err.message}`),
  });

  const openCreate = useCallback(() => {
    setEditingNpc(null);
    setIsModalOpen(true);
  }, []);

  const openEdit = useCallback((npc: AgentConfig) => {
    setEditingNpc(npc);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (!window.confirm('Delete this NPC? This cannot be undone.')) return;
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleSave = useCallback(
    (data: any) => {
      if (editingNpc) {
        updateMutation.mutate({ ...data, created_at: editingNpc.created_at, updated_at: editingNpc.updated_at });
      } else {
        createMutation.mutate(data);
      }
    },
    [editingNpc, createMutation, updateMutation],
  );

  const filtered = npcs.filter(
    (npc) => npc.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">NPCs</h1>
          <p className="text-white/50 mt-1">Manage AI characters in the game world</p>
        </div>
        <Button className="bg-green text-dark hover:bg-green-light" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Create NPC
        </Button>
      </div>

      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search NPCs..."
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((npc) => (
            <NPCCard
              key={npc.id}
              id={npc.id}
              name={npc.name}
              graphic={npc.graphic}
              enabled={npc.enabled}
              spawn={npc.spawn as any}
              skills={npc.skills}
              onEdit={() => openEdit(npc)}
              onDelete={() => handleDelete(npc.id)}
              onToggle={() => toggleMutation.mutate({ id: npc.id, enabled: !npc.enabled })}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No NPCs found"
          description="Create your first AI NPC to populate the game world"
          icon={<Users className="w-8 h-8" />}
          actionLabel="Create NPC"
          onAction={openCreate}
        />
      )}

      <NPCFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingNpc(null); }}
        onSave={handleSave}
        initialData={editingNpc}
      />
    </div>
  );
};
