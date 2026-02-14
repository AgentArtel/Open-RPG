import React from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Play, MoreHorizontal, Clock, Zap, Pencil, Copy, Pause, Trash2 } from 'lucide-react';

interface WorkflowCardProps {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'error';
  lastRun?: string;
  executionCount: number;
  nodes?: number;
  selected?: boolean;
  onToggleSelect?: () => void;
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
  selected = false,
  onToggleSelect,
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
        <div className="flex items-center gap-2">
          {onToggleSelect != null && (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={selected} onCheckedChange={() => onToggleSelect?.()} className="border-white/30 data-[state=checked]:bg-green data-[state=checked]:border-green" />
            </div>
          )}
          <StatusBadge status={status} pulse={status === 'active'} />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-dark-100 border-white/10 text-white">
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); onEdit?.(); }} className="focus:bg-white/10 focus:text-white cursor-pointer">
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); toast.info('Duplicate coming soon'); }} className="focus:bg-white/10 focus:text-white cursor-pointer">
                <Copy className="w-4 h-4 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); toast.info('Disable coming soon'); }} className="focus:bg-white/10 focus:text-white cursor-pointer">
                <Pause className="w-4 h-4 mr-2" /> Disable
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); toast.info('Delete coming soon'); }} className="focus:bg-white/10 focus:text-white cursor-pointer">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <h4 className="text-base font-medium text-white mb-1 italic">{name}</h4>
      {description && (
        <p className="text-sm text-white/40 line-clamp-2 mb-4 italic">{description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-white/40 mb-4">
        <div className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5" />
          <span><span className="italic">{nodes}</span> nodes</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span className="italic">{lastRun || 'Never'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <span className="text-sm text-white/50"><span className="italic">{executionCount}</span> executions</span>
        <button 
          className="w-8 h-8 rounded-lg bg-green/15 flex items-center justify-center text-green hover:bg-green/25 transition-colors"
          onClick={(e) => { e.stopPropagation(); onRun?.(); }}
        >
          <Play className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
