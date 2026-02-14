import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui-custom/Modal';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextarea } from '@/components/forms/FormTextarea';
import { FormToggle } from '@/components/forms/FormToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

interface NPCFormState {
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
}

interface ApiIntegration {
  skill_name: string;
  name: string;
  required_item_id: string;
}

interface NPCFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NPCFormState) => void;
  editingNpc: Tables<'agent_configs'> | null;
  apiIntegrations: ApiIntegration[];
}

const GAME_SKILLS = ['move', 'say', 'look', 'emote', 'wait'];
const MODEL_OPTIONS = [
  { value: 'kimi-k2-0711-preview', label: 'Kimi K2' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];
const GRAPHIC_OPTIONS = [
  { value: 'male', label: 'Male 🧙‍♂️' },
  { value: 'female', label: 'Female 🧙‍♀️' },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function defaultState(): NPCFormState {
  return {
    id: '', name: '', graphic: 'male', personality: '',
    model: { idle: 'kimi-k2-0711-preview', conversation: 'kimi-k2-0711-preview' },
    skills: ['move', 'say', 'look', 'emote', 'wait'],
    spawn: { map: 'simplemap', x: 5, y: 5 },
    behavior: { idleInterval: 15000, patrolRadius: 3, greetOnProximity: true },
    inventory: [], enabled: true,
  };
}

function npcToState(npc: Tables<'agent_configs'>): NPCFormState {
  const model = npc.model as { idle?: string; conversation?: string } | null;
  const spawn = npc.spawn as { map?: string; x?: number; y?: number } | null;
  const behavior = npc.behavior as { idleInterval?: number; patrolRadius?: number; greetOnProximity?: boolean } | null;
  return {
    id: npc.id, name: npc.name, graphic: npc.graphic, personality: npc.personality,
    model: { idle: model?.idle || 'kimi-k2-0711-preview', conversation: model?.conversation || 'kimi-k2-0711-preview' },
    skills: npc.skills || [],
    spawn: { map: spawn?.map || 'simplemap', x: spawn?.x ?? 5, y: spawn?.y ?? 5 },
    behavior: { idleInterval: behavior?.idleInterval ?? 15000, patrolRadius: behavior?.patrolRadius ?? 3, greetOnProximity: behavior?.greetOnProximity ?? true },
    inventory: npc.inventory || [], enabled: npc.enabled,
  };
}

export const NPCFormModal: React.FC<NPCFormModalProps> = ({ isOpen, onClose, onSave, editingNpc, apiIntegrations }) => {
  const isEdit = !!editingNpc;
  const [form, setForm] = useState<NPCFormState>(defaultState);

  useEffect(() => {
    if (isOpen) setForm(editingNpc ? npcToState(editingNpc) : defaultState());
  }, [isOpen, editingNpc]);

  const set = <K extends keyof NPCFormState>(k: K, v: NPCFormState[K]) => setForm(f => ({ ...f, [k]: v }));

  // Auto-slugify id from name on create
  useEffect(() => {
    if (!isEdit) set('id', slugify(form.name));
  }, [form.name, isEdit]);

  // Build inventory from API skill selections
  const apiSkillItemMap = useMemo(() => {
    const m: Record<string, string> = {};
    apiIntegrations.forEach(i => { m[i.skill_name] = i.required_item_id; });
    return m;
  }, [apiIntegrations]);

  const toggleSkill = (skill: string) => {
    setForm(f => {
      const has = f.skills.includes(skill);
      const newSkills = has ? f.skills.filter(s => s !== skill) : [...f.skills, skill];
      // Auto-manage inventory for api skills
      const itemId = apiSkillItemMap[skill];
      let newInv = [...f.inventory];
      if (itemId) {
        if (has) newInv = newInv.filter(i => i !== itemId);
        else if (!newInv.includes(itemId)) newInv.push(itemId);
      }
      return { ...f, skills: newSkills, inventory: newInv };
    });
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.id.trim()) return;
    onSave(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit NPC' : 'Create NPC'} description={isEdit ? 'Update NPC configuration' : 'Configure a new AI NPC'} size="lg">
      <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
        {/* Identity */}
        <Section title="Identity">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Name" value={form.name} onChange={v => set('name', v)} placeholder="Town Guard" />
            <FormInput label="ID" value={form.id} onChange={v => !isEdit && set('id', v)} placeholder="town-guard" disabled={isEdit} helperText={isEdit ? 'Cannot change ID' : 'Auto-generated from name'} />
          </div>
          <FormSelect label="Graphic" value={form.graphic} options={GRAPHIC_OPTIONS} onChange={v => set('graphic', v)} />
        </Section>

        {/* AI */}
        <Section title="AI Configuration">
          <FormTextarea label="Personality" value={form.personality} onChange={v => set('personality', v)} placeholder="You are a friendly town guard..." rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Idle Model" value={form.model.idle} options={MODEL_OPTIONS} onChange={v => set('model', { ...form.model, idle: v })} />
            <FormSelect label="Conversation Model" value={form.model.conversation} options={MODEL_OPTIONS} onChange={v => set('model', { ...form.model, conversation: v })} />
          </div>
        </Section>

        {/* Skills */}
        <Section title="Skills">
          <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Game Skills</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {GAME_SKILLS.map(s => (
              <SkillChip key={s} label={s} active={form.skills.includes(s)} onClick={() => toggleSkill(s)} />
            ))}
          </div>
          {apiIntegrations.length > 0 && (
            <>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">API Skills</label>
              <div className="flex flex-wrap gap-2">
                {apiIntegrations.map(i => (
                  <SkillChip key={i.skill_name} label={i.name} active={form.skills.includes(i.skill_name)} onClick={() => toggleSkill(i.skill_name)} />
                ))}
              </div>
            </>
          )}
        </Section>

        {/* Spawn */}
        <Section title="Spawn Location">
          <div className="grid grid-cols-3 gap-4">
            <FormInput label="Map" value={form.spawn.map} onChange={v => set('spawn', { ...form.spawn, map: v })} placeholder="simplemap" />
            <FormInput label="X" value={String(form.spawn.x)} onChange={v => set('spawn', { ...form.spawn, x: Number(v) || 0 })} type="number" />
            <FormInput label="Y" value={String(form.spawn.y)} onChange={v => set('spawn', { ...form.spawn, y: Number(v) || 0 })} type="number" />
          </div>
        </Section>

        {/* Behavior */}
        <Section title="Behavior">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Idle Interval (ms)" value={String(form.behavior.idleInterval)} onChange={v => set('behavior', { ...form.behavior, idleInterval: Number(v) || 15000 })} type="number" />
            <FormInput label="Patrol Radius" value={String(form.behavior.patrolRadius)} onChange={v => set('behavior', { ...form.behavior, patrolRadius: Number(v) || 3 })} type="number" />
          </div>
          <FormToggle label="Greet on Proximity" checked={form.behavior.greetOnProximity} onChange={v => set('behavior', { ...form.behavior, greetOnProximity: v })} />
        </Section>

        {/* Other */}
        <Section title="Other">
          <FormInput label="Inventory" value={form.inventory.join(', ')} onChange={v => set('inventory', v.split(',').map(s => s.trim()).filter(Boolean))} helperText="Comma-separated item IDs. Auto-managed by API skill selection." />
          <FormToggle label="Enabled" checked={form.enabled} onChange={v => set('enabled', v)} />
        </Section>
      </div>

      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-white/5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button className="bg-green text-dark hover:bg-green-light" onClick={handleSave} disabled={!form.name.trim() || !form.id.trim()}>
          {isEdit ? 'Save Changes' : 'Create NPC'}
        </Button>
      </div>
    </Modal>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white/70 mb-3">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SkillChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
        active ? 'bg-green/20 text-green border-green/40' : 'bg-dark-200 text-white/50 border-white/5 hover:border-white/10'
      )}
    >
      {label}
    </button>
  );
}
