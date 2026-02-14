import React from 'react';
import { cn } from '@/lib/utils';
import { Play, MoreHorizontal } from 'lucide-react';

interface WorkflowPreviewProps {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'error';
  lastRun?: string;
  executionCount: number;
  onRun?: () => void;
  onEdit?: () => void;
  className?: string;
}

export const WorkflowPreview: React.FC<WorkflowPreviewProps> = ({
  name,
  description,
  status,
  lastRun,
  executionCount,
  onRun,
  onEdit,
  className,
}) => {
  const statusConfig = {
    active: {
      dot: 'bg-green',
      pulse: true,
      label: 'Active',
    },
    inactive: {
      dot: 'bg-white/30',
      pulse: false,
      label: 'Inactive',
    },
    error: {
      dot: 'bg-danger',
      pulse: false,
      label: 'Error',
    },
  };

  const config = statusConfig[status];

  return (
    <div 
      className={cn(
        "bg-dark-100/80 border border-white/5 rounded-xl p-4",
        "hover:border-green/20 hover:shadow-glow transition-all duration-fast cursor-pointer",
        className
      )}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", config.dot, config.pulse && "animate-pulse")} />
          <span className="text-xs text-white/50">{config.label}</span>
        </div>
        <button 
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <h4 className="text-sm font-medium text-white mb-1">{name}</h4>
      {description && (
        <p className="text-xs text-white/40 line-clamp-2 mb-3">{description}</p>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3 text-xs text-white/40">
          {lastRun && <span>Last run: {lastRun}</span>}
          <span>{executionCount} runs</span>
        </div>
        <button 
          className="w-7 h-7 rounded-lg bg-green/15 flex items-center justify-center text-green hover:bg-green/25 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRun?.();
          }}
        >
          <Play className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
