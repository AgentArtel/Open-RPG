import React from 'react';
import { cn } from '@/lib/utils';
import { Edit2, Trash2, MapPin } from 'lucide-react';

interface NPCCardProps {
  id: string;
  name: string;
  graphic: string;
  enabled: boolean;
  spawn: { map?: string; x?: number; y?: number };
  skills: string[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

const graphicEmoji: Record<string, string> = {
  male: '\u{1F9D4}',
  female: '\u{1F9D9}',
};

export const NPCCard: React.FC<NPCCardProps> = ({
  name,
  graphic,
  enabled,
  spawn,
  skills,
  onEdit,
  onDelete,
  onToggle,
}) => {
  return (
    <div
      className={cn(
        'group relative p-5 rounded-2xl bg-dark-100 border transition-all duration-fast',
        enabled
          ? 'border-green/30 hover:border-green/50 hover:shadow-glow'
          : 'border-white/5 hover:border-white/10 opacity-60',
      )}
    >
      {/* enabled indicator */}
      <div
        className={cn(
          'absolute top-4 right-4 w-2.5 h-2.5 rounded-full cursor-pointer',
          enabled ? 'bg-green' : 'bg-white/20',
        )}
        onClick={onToggle}
        title={enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
      >
        {enabled && (
          <div className="absolute inset-0 rounded-full bg-green animate-ping opacity-30" />
        )}
      </div>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-dark-200 flex items-center justify-center text-2xl">
          {graphicEmoji[graphic] || graphicEmoji.female}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate italic">{name}</h3>
          <p className="text-xs text-white/50 capitalize italic">{graphic}</p>

          <div className="flex items-center gap-2 mt-2">
            <MapPin className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs text-white/40">{spawn?.map || 'no map'}</span>
          </div>

          <p className="text-[10px] text-white/30 mt-1 italic">
            {skills.length} skill{skills.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* actions on hover */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-danger hover:bg-danger/10 transition-colors ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
