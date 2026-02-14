import { cn } from '@/lib/utils';
import { Edit2, Trash2, Power, MapPin } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface NPCCardProps {
  npc: Tables<'agent_configs'>;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  className?: string;
}

const graphicEmoji: Record<string, string> = {
  male: '🧙‍♂️',
  female: '🧙‍♀️',
};

export const NPCCard: React.FC<NPCCardProps> = ({ npc, onEdit, onDelete, onToggle, className }) => {
  const spawn = npc.spawn as { map?: string; x?: number; y?: number };

  return (
    <div
      className={cn(
        'group relative p-5 rounded-2xl bg-dark-100 border transition-all duration-fast',
        npc.enabled
          ? 'border-green/30 hover:border-green/50 hover:shadow-glow'
          : 'border-white/5 hover:border-white/10',
        className
      )}
    >
      {/* Status dot */}
      <div className={cn('absolute top-4 right-4 w-2.5 h-2.5 rounded-full', npc.enabled ? 'bg-green' : 'bg-white/20')}>
        {npc.enabled && <div className="absolute inset-0 rounded-full bg-green animate-ping opacity-30" />}
      </div>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-dark-200 flex items-center justify-center text-2xl">
          {graphicEmoji[npc.graphic] || '🧑'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{npc.name}</h3>
          <p className="text-xs text-white/50 font-mono">{npc.id}</p>

          <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
            {spawn?.map && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {spawn.map}
              </span>
            )}
            <span>{npc.skills.length} skills</span>
          </div>
        </div>
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
        <button onClick={onToggle} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors', npc.enabled ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-green hover:bg-green/10')}>
          <Power className="w-3.5 h-3.5" /> {npc.enabled ? 'Disable' : 'Enable'}
        </button>
        <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-danger hover:bg-danger/10 transition-colors ml-auto">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
