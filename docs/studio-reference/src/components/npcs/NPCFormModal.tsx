import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui-custom/Modal';
import { Button } from '@/components/ui/button';
import { gameDb } from '@/lib/gameSchema';

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
}

interface NPCFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<AgentConfig, 'id'> & { id: string }) => void;
  initialData?: AgentConfig | null;
}

const MODEL_OPTIONS = [
  'kimi-k2-0711-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

const GAME_SKILLS = ['move', 'say', 'look', 'emote', 'wait'];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export const NPCFormModal: React.FC<NPCFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const isEditing = !!initialData;

  // Form state
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [graphic, setGraphic] = useState('female');
  const [personality, setPersonality] = useState('');
  const [idleModel, setIdleModel] = useState(MODEL_OPTIONS[0]);
  const [conversationModel, setConversationModel] = useState(MODEL_OPTIONS[0]);
  const [skills, setSkills] = useState<string[]>([...GAME_SKILLS]);
  const [spawnMap, setSpawnMap] = useState('simplemap');
  const [spawnX, setSpawnX] = useState(200);
  const [spawnY, setSpawnY] = useState(200);
  const [idleInterval, setIdleInterval] = useState(15000);
  const [patrolRadius, setPatrolRadius] = useState(3);
  const [greetOnProximity, setGreetOnProximity] = useState(true);
  const [inventory, setInventory] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);

  // Fetch API integrations for dynamic skill checkboxes
  const { data: apiIntegrations = [] } = useQuery({
    queryKey: ['game-api-integrations'],
    queryFn: async () => {
      const { data, error } = await gameDb()
        .from('api_integrations')
        .select('skill_name, name, required_item_id')
        .eq('enabled', true);
      if (error) throw error;
      return (data || []) as { skill_name: string; name: string; required_item_id: string }[];
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setName(initialData.name);
      setId(initialData.id);
      setGraphic(initialData.graphic);
      setPersonality(initialData.personality);
      const m = initialData.model as any;
      setIdleModel(m?.idle || MODEL_OPTIONS[0]);
      setConversationModel(m?.conversation || MODEL_OPTIONS[0]);
      setSkills(initialData.skills || [...GAME_SKILLS]);
      const s = initialData.spawn as any;
      setSpawnMap(s?.map || 'simplemap');
      setSpawnX(s?.x ?? 200);
      setSpawnY(s?.y ?? 200);
      const b = initialData.behavior as any;
      setIdleInterval(b?.idleInterval ?? 15000);
      setPatrolRadius(b?.patrolRadius ?? 3);
      setGreetOnProximity(b?.greetOnProximity ?? true);
      setInventory(initialData.inventory || []);
      setEnabled(initialData.enabled);
    } else {
      setName('');
      setId('');
      setGraphic('female');
      setPersonality('');
      setIdleModel(MODEL_OPTIONS[0]);
      setConversationModel(MODEL_OPTIONS[0]);
      setSkills([...GAME_SKILLS]);
      setSpawnMap('simplemap');
      setSpawnX(200);
      setSpawnY(200);
      setIdleInterval(15000);
      setPatrolRadius(3);
      setGreetOnProximity(true);
      setInventory([]);
      setEnabled(true);
    }
  }, [isOpen, initialData]);

  // Auto-slug id from name
  useEffect(() => {
    if (!isEditing && name) {
      setId(slugify(name));
    }
  }, [name, isEditing]);

  // Toggle a skill and manage inventory tokens
  const toggleSkill = (skillName: string) => {
    const apiSkill = apiIntegrations.find((i) => i.skill_name === skillName);
    if (skills.includes(skillName)) {
      setSkills((prev) => prev.filter((s) => s !== skillName));
      if (apiSkill) {
        setInventory((prev) => prev.filter((t) => t !== apiSkill.required_item_id));
      }
    } else {
      setSkills((prev) => [...prev, skillName]);
      if (apiSkill && !inventory.includes(apiSkill.required_item_id)) {
        setInventory((prev) => [...prev, apiSkill.required_item_id]);
      }
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || !id.trim()) return;
    onSave({
      id,
      name: name.trim(),
      graphic,
      personality,
      model: { idle: idleModel, conversation: conversationModel },
      skills,
      spawn: { map: spawnMap, x: spawnX, y: spawnY },
      behavior: { idleInterval, patrolRadius, greetOnProximity },
      inventory,
      enabled,
    });
  };

  const inputCls =
    'w-full px-4 py-2.5 bg-dark-200 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/50';
  const labelCls = 'text-xs text-white/50 uppercase tracking-wider mb-1.5 block';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit NPC' : 'Create NPC'}
      description={isEditing ? 'Update this NPC\'s configuration' : 'Define a new AI NPC for the game'}
      size="xl"
    >
      <div className="max-h-[70vh] overflow-y-auto space-y-5 pr-1">
        {/* Identity */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-green mb-2">Identity</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Elder Theron" />
            </div>
            <div>
              <label className={labelCls}>ID</label>
              <input className={inputCls} value={id} onChange={(e) => !isEditing && setId(e.target.value)} readOnly={isEditing} placeholder="auto-generated" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Graphic</label>
            <select className={inputCls} value={graphic} onChange={(e) => setGraphic(e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Personality (System Prompt)</label>
            <textarea className={`${inputCls} min-h-[100px]`} value={personality} onChange={(e) => setPersonality(e.target.value)} placeholder="You are a wise village elder..." rows={4} />
          </div>
        </fieldset>

        {/* Model */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-green mb-2">Model</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Idle Model</label>
              <select className={inputCls} value={idleModel} onChange={(e) => setIdleModel(e.target.value)}>
                {MODEL_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Conversation Model</label>
              <select className={inputCls} value={conversationModel} onChange={(e) => setConversationModel(e.target.value)}>
                {MODEL_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        {/* Skills */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-green mb-2">Skills</legend>
          <div className="flex flex-wrap gap-2">
            {GAME_SKILLS.map((skill) => (
              <label key={skill} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-200 border border-white/10 cursor-pointer hover:border-green/30 transition-colors">
                <input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} className="accent-green" />
                <span className="text-xs text-white/70">{skill}</span>
              </label>
            ))}
          </div>
          {apiIntegrations.length > 0 && (
            <>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-2">API Skills</p>
              <div className="flex flex-wrap gap-2">
                {apiIntegrations.map((integ) => (
                  <label key={integ.skill_name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-200 border border-white/10 cursor-pointer hover:border-green/30 transition-colors">
                    <input type="checkbox" checked={skills.includes(integ.skill_name)} onChange={() => toggleSkill(integ.skill_name)} className="accent-green" />
                    <span className="text-xs text-white/70">{integ.name}</span>
                    <span className="text-[10px] text-white/30">({integ.skill_name})</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </fieldset>

        {/* Spawn */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-green mb-2">Spawn Location</legend>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Map</label>
              <input className={inputCls} value={spawnMap} onChange={(e) => setSpawnMap(e.target.value)} placeholder="simplemap" />
            </div>
            <div>
              <label className={labelCls}>X</label>
              <input className={inputCls} type="number" value={spawnX} onChange={(e) => setSpawnX(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Y</label>
              <input className={inputCls} type="number" value={spawnY} onChange={(e) => setSpawnY(Number(e.target.value))} />
            </div>
          </div>
        </fieldset>

        {/* Behavior */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-green mb-2">Behavior</legend>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Idle Interval (ms)</label>
              <input className={inputCls} type="number" value={idleInterval} onChange={(e) => setIdleInterval(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Patrol Radius</label>
              <input className={inputCls} type="number" value={patrolRadius} onChange={(e) => setPatrolRadius(Number(e.target.value))} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={greetOnProximity} onChange={(e) => setGreetOnProximity(e.target.checked)} className="accent-green" />
                <span className="text-xs text-white/70">Greet on Proximity</span>
              </label>
            </div>
          </div>
        </fieldset>

        {/* Inventory */}
        {inventory.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-green mb-2">Inventory (auto-managed)</legend>
            <div className="flex flex-wrap gap-2">
              {inventory.map((token) => (
                <span key={token} className="px-3 py-1 rounded-full bg-green/10 text-green text-xs">
                  {token}
                </span>
              ))}
            </div>
          </fieldset>
        )}

        {/* Enabled */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-green" />
            <span className="text-sm text-white/70">Enabled</span>
          </label>
          <span className="text-xs text-white/30">(disabled NPCs don't load in the game)</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-5 border-t border-white/5 mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button className="bg-green text-dark hover:bg-green-light" onClick={handleSubmit} disabled={!name.trim() || !id.trim()}>
          {isEditing ? 'Save Changes' : 'Create NPC'}
        </Button>
      </div>
    </Modal>
  );
};
