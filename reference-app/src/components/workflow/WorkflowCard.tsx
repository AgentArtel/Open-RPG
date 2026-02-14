import React from 'react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { Play, MoreHorizontal, Clock, Zap } from 'lucide-react';

interface WorkflowCardProps {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'error';
  lastRun?: string;
  executionCount: number;
  nodes?: number;
  onRun?: () => void;
  onEdit?: () => void;
  className?: string;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  name,
  description,
  status,
  lastRun,
  executionCount,
  nodes = 0,
  onRun,
  onEdit,
  className,
}) => {
  return (
    <div 
      className={cn(
        "bg-dark-100/80 border border-white/5 rounded-xl p-5 group",
        "hover:border-green/20 hover:shadow-glow transition-all duration-fast cursor-pointer",
        className
      )}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between mb-4">
        <StatusBadge status={status} pulse={status === 'active'} />
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <h4 className="text-base font-medium text-white mb-1">{name}</h4>
      {description && (
        <p className="text-sm text-white/40 line-clamp-2 mb-4">{description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-white/40 mb-4">
        <div className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5" />
          <span>{nodes} nodes</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{lastRun || 'Never'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <span className="text-sm text-white/50">{executionCount} executions</span>
        <button 
          className="w-8 h-8 rounded-lg bg-green/15 flex items-center justify-center text-green hover:bg-green/25 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRun?.();
          }}
        >
          <Play className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
