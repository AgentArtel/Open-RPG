import React from 'react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { Play, Clock, ChevronRight } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface ExecutionRowProps {
  id: string;
  workflowName: string;
  status: 'success' | 'error' | 'running' | 'pending';
  startedAt: string;
  duration?: number;
  onView?: () => void;
  onRetry?: () => void;
  className?: string;
}

export const ExecutionRow: React.FC<ExecutionRowProps> = ({
  workflowName,
  status,
  startedAt,
  duration,
  onView,
  onRetry,
  className,
}) => {
  return (
    <div 
      className={cn(
        "flex items-center justify-between p-4 bg-dark-100/50 border border-white/5 rounded-xl",
        "hover:bg-dark-100 hover:border-white/10 transition-all cursor-pointer",
        className
      )}
      onClick={onView}
    >
      <div className="flex items-center gap-4">
        <StatusBadge status={status} pulse={status === 'running'} />
        <div>
          <h4 className="text-sm font-medium text-white italic">{workflowName}</h4>
          <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
            <span className="flex items-center gap-1 italic">
              <Clock className="w-3 h-3" />
              {startedAt}
            </span>
            {duration && (
              <span className="italic">{formatDuration(duration)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {status === 'error' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-green hover:bg-green/10 transition-colors"
          >
            <Play className="w-4 h-4" />
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-white/30" />
      </div>
    </div>
  );
};
