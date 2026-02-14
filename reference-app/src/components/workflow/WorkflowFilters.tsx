import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface WorkflowFiltersProps {
  statusFilter: 'all' | 'active' | 'inactive' | 'error';
  onStatusChange: (status: 'all' | 'active' | 'inactive' | 'error') => void;
  sortBy: 'name' | 'lastRun' | 'created';
  onSortChange?: (sort: 'name' | 'lastRun' | 'created') => void;
  className?: string;
}

export const WorkflowFilters: React.FC<WorkflowFiltersProps> = ({
  statusFilter,
  onStatusChange,
  sortBy,
  // @ts-expect-error - will be implemented later
  onSortChange,
  className,
}) => {
  const filters = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'error', label: 'Error' },
  ] as const;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex items-center gap-1 p-1 bg-dark-100 rounded-lg border border-white/5">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onStatusChange(filter.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              statusFilter === filter.value
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white hover:bg-white/5"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-white/40">Sort by:</span>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-dark-100 border border-white/5 rounded-lg text-sm text-white/70 hover:text-white transition-colors">
          {sortBy === 'name' && 'Name'}
          {sortBy === 'lastRun' && 'Last Run'}
          {sortBy === 'created' && 'Created'}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
