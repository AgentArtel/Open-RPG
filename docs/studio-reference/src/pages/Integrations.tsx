import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { gameDb } from '@/lib/gameSchema';
import { SearchBar } from '@/components/workflow/SearchBar';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { Modal } from '@/components/ui-custom/Modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Plus, Puzzle, Edit2, Trash2, X } from 'lucide-react';

interface ApiIntegration {
  id: string;
  name: string;
  skill_name: string;
  category: string;
  description: string | null;
  required_item_id: string;
  requires_env: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface IntegrationsProps {
  onNavigate: (page: string) => void;
}

const CATEGORY_OPTIONS = ['api', 'social', 'knowledge'];

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

export const Integrations: React.FC<IntegrationsProps> = ({ onNavigate }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiIntegration | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSkillName, setFormSkillName] = useState('');
  const [formRequiredItemId, setFormRequiredItemId] = useState('');
  const [formRequiresEnv, setFormRequiresEnv] = useState<string[]>([]);
  const [formCategory, setFormCategory] = useState('api');
  const [formEnabled, setFormEnabled] = useState(true);
  const [envInput, setEnvInput] = useState('');

  // Fetch integrations from game.api_integrations
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['game-api-integrations-full'],
    queryFn: async () => {
      const { data, error } = await gameDb()
        .from('api_integrations')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as ApiIntegration[];
    },
  });

  const resetForm = useCallback(() => {
    setFormName('');
    setFormId('');
    setFormDescription('');
    setFormSkillName('');
    setFormRequiredItemId('');
    setFormRequiresEnv([]);
    setFormCategory('api');
    setFormEnabled(true);
    setEnvInput('');
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((item: ApiIntegration) => {
    setEditing(item);
    setFormName(item.name);
    setFormId(item.id);
    setFormDescription(item.description || '');
    setFormSkillName(item.skill_name);
    setFormRequiredItemId(item.required_item_id);
    setFormRequiresEnv(item.requires_env || []);
    setFormCategory(item.category);
    setFormEnabled(item.enabled);
    setEnvInput('');
    setIsModalOpen(true);
  }, []);

  // Create
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await gameDb()
        .from('api_integrations')
        .insert({
          id: formId,
          name: formName.trim(),
          description: formDescription.trim() || null,
          skill_name: formSkillName.trim(),
          required_item_id: formRequiredItemId.trim(),
          requires_env: formRequiresEnv,
          category: formCategory,
          enabled: formEnabled,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-api-integrations-full'] });
      queryClient.invalidateQueries({ queryKey: ['game-api-integrations'] });
      toast.success('Integration created');
      setIsModalOpen(false);
    },
    onError: (err: Error) => toast.error(`Failed to create integration: ${err.message}`),
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await gameDb()
        .from('api_integrations')
        .update({
          name: formName.trim(),
          description: formDescription.trim() || null,
          skill_name: formSkillName.trim(),
          required_item_id: formRequiredItemId.trim(),
          requires_env: formRequiresEnv,
          category: formCategory,
          enabled: formEnabled,
        })
        .eq('id', editing!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-api-integrations-full'] });
      queryClient.invalidateQueries({ queryKey: ['game-api-integrations'] });
      toast.success('Integration updated');
      setIsModalOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => toast.error(`Failed to update integration: ${err.message}`),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await gameDb()
        .from('api_integrations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-api-integrations-full'] });
      queryClient.invalidateQueries({ queryKey: ['game-api-integrations'] });
      toast.success('Integration deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete integration: ${err.message}`),
  });

  // Toggle enabled
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await gameDb()
        .from('api_integrations')
        .update({ enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-api-integrations-full'] });
      queryClient.invalidateQueries({ queryKey: ['game-api-integrations'] });
    },
    onError: (err: Error) => toast.error(`Failed to toggle integration: ${err.message}`),
  });

  const handleSave = () => {
    if (!formName.trim() || !formSkillName.trim() || !formRequiredItemId.trim()) {
      toast.error('Name, skill name, and required item ID are required');
      return;
    }
    if (editing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const addEnvVar = () => {
    const v = envInput.trim().toUpperCase();
    if (v && !formRequiresEnv.includes(v)) {
      setFormRequiresEnv((prev) => [...prev, v]);
    }
    setEnvInput('');
  };

  const removeEnvVar = (v: string) => setFormRequiresEnv((prev) => prev.filter((e) => e !== v));

  const filtered = integrations.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.skill_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Auto-slug
  React.useEffect(() => {
    if (!editing && formName) setFormId(slugify(formName));
  }, [formName, editing]);

  const inputCls =
    'w-full px-4 py-2.5 bg-dark-200 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/50';
  const labelCls = 'text-xs text-white/50 uppercase tracking-wider mb-1.5 block';

  const categoryColors: Record<string, string> = {
    api: 'bg-blue-500/20 text-blue-400',
    social: 'bg-purple-500/20 text-purple-400',
    knowledge: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Integrations</h1>
          <p className="text-white/50 mt-1">Manage API-backed skills for the game</p>
        </div>
        <Button className="bg-green text-dark hover:bg-green-light" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Add Integration
        </Button>
      </div>

      <div className="mb-6">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search integrations..." className="max-w-md" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={cn(
                'group relative p-5 rounded-2xl bg-dark-100 border transition-all duration-fast',
                item.enabled
                  ? 'border-green/30 hover:border-green/50 hover:shadow-glow'
                  : 'border-white/5 hover:border-white/10 opacity-60',
              )}
            >
              <div
                className={cn('absolute top-4 right-4 w-2.5 h-2.5 rounded-full cursor-pointer', item.enabled ? 'bg-green' : 'bg-white/20')}
                onClick={() => toggleMutation.mutate({ id: item.id, enabled: !item.enabled })}
                title={item.enabled ? 'Enabled' : 'Disabled'}
              >
                {item.enabled && <div className="absolute inset-0 rounded-full bg-green animate-ping opacity-30" />}
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-dark-200 flex items-center justify-center">
                  <Puzzle className="w-6 h-6 text-green/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate italic">{item.name}</h3>
                  <p className="text-xs text-white/40 font-mono">{item.skill_name}</p>
                  {item.description && <p className="text-xs text-white/30 mt-1 line-clamp-2">{item.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px]', categoryColors[item.category] || categoryColors.api)}>
                      {item.category}
                    </span>
                    {item.requires_env.map((env) => (
                      <span key={env} className="px-2 py-0.5 rounded-full bg-white/5 text-white/30 text-[10px]">{env}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(item)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => { if (window.confirm('Delete this integration?')) deleteMutation.mutate(item.id); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-danger hover:bg-danger/10 transition-colors ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No integrations found"
          description="Add your first API integration to enable skills for NPCs"
          icon={<Puzzle className="w-8 h-8" />}
          actionLabel="Add Integration"
          onAction={openCreate}
        />
      )}

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditing(null); }}
        title={editing ? 'Edit Integration' : 'Add Integration'}
        description={editing ? 'Update this API integration' : 'Define a new API-backed skill'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Image Generation" />
            </div>
            <div>
              <label className={labelCls}>ID</label>
              <input className={inputCls} value={formId} onChange={(e) => !editing && setFormId(e.target.value)} readOnly={!!editing} placeholder="auto-generated" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={`${inputCls} min-h-[60px]`} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="What this integration does..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Skill Name</label>
              <input className={inputCls} value={formSkillName} onChange={(e) => setFormSkillName(e.target.value)} placeholder="generate_image" />
            </div>
            <div>
              <label className={labelCls}>Required Item ID</label>
              <input className={inputCls} value={formRequiredItemId} onChange={(e) => setFormRequiredItemId(e.target.value)} placeholder="image-gen-token" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Required Env Vars</label>
            <div className="flex gap-2 mb-2">
              <input
                className={inputCls}
                value={envInput}
                onChange={(e) => setEnvInput(e.target.value)}
                placeholder="GEMINI_API_KEY"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEnvVar(); } }}
              />
              <Button variant="ghost" className="text-green shrink-0" onClick={addEnvVar}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formRequiresEnv.map((v) => (
                <span key={v} className="flex items-center gap-1 px-2 py-1 rounded bg-dark-200 text-xs text-white/60">
                  {v}
                  <button onClick={() => removeEnvVar(v)} className="hover:text-danger"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formEnabled} onChange={(e) => setFormEnabled(e.target.checked)} className="accent-green" />
                <span className="text-sm text-white/70">Enabled</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => { setIsModalOpen(false); setEditing(null); }}>Cancel</Button>
            <Button className="bg-green text-dark hover:bg-green-light" onClick={handleSave}>{editing ? 'Save' : 'Add Integration'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
