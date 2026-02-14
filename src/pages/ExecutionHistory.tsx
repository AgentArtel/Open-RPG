import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { ExecutionRow } from '@/components/execution/ExecutionRow';
import { SearchBar } from '@/components/workflow/SearchBar';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { Chip } from '@/components/ui-custom/Chip';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ExecutionHistoryProps {
  onNavigate: (page: string) => void;
}

export const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({ onNavigate }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: dbExecutions = [], isLoading } = useQuery({
    queryKey: ['studio-executions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studio_executions')
        .select('*')
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: dbWorkflowNames = [] } = useQuery({
    queryKey: ['studio-workflow-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studio_workflows')
        .select('id, name');
      if (error) throw error;
      return data as any[];
    },
  });

  const nameMap: Record<string, string> = Object.fromEntries(
    dbWorkflowNames.map((w: any) => [w.id, w.name])
  );

  const executions = dbExecutions.map((e: any) => ({
    id: e.id,
    workflowName: nameMap[e.workflow_id] ?? 'Unknown Workflow',
    status: e.status as 'success' | 'error' | 'running' | 'pending',
    startedAt: formatRelativeTime(e.started_at),
    duration: e.duration_ms,
  }));

  const filteredExecutions = executions.filter((execution: any) => {
    const matchesSearch = execution.workflowName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || execution.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: executions.length,
    success: executions.filter((e: any) => e.status === 'success').length,
    error: executions.filter((e: any) => e.status === 'error').length,
    running: executions.filter((e: any) => e.status === 'running').length,
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Execution History</h1>
          <p className="text-white/50 mt-1">View and manage workflow executions</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-dark-100 border border-white/5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['studio-executions'] });
            toast.info('Refreshed');
          }}
        >
          <RotateCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search executions..." className="max-w-md" />
        <div className="flex items-center gap-2">
          <Chip variant={statusFilter === 'all' ? 'green' : 'gray'} onClick={() => setStatusFilter('all')} className="cursor-pointer">All ({statusCounts.all})</Chip>
          <Chip variant={statusFilter === 'success' ? 'green' : 'gray'} onClick={() => setStatusFilter('success')} className="cursor-pointer">Success ({statusCounts.success})</Chip>
          <Chip variant={statusFilter === 'error' ? 'red' : 'gray'} onClick={() => setStatusFilter('error')} className="cursor-pointer">Failed ({statusCounts.error})</Chip>
          <Chip variant={statusFilter === 'running' ? 'blue' : 'gray'} onClick={() => setStatusFilter('running')} className="cursor-pointer">Running ({statusCounts.running})</Chip>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-dark-100/50" />
          ))}
        </div>
      ) : filteredExecutions.length > 0 ? (
        <div className="space-y-2">
          {filteredExecutions.map((execution: any) => (
            <ExecutionRow key={execution.id} {...execution} onView={() => toast.info('Execution detail view coming soon')} onRetry={() => toast.info('Retrying execution...')} />
          ))}
        </div>
      ) : (
        <EmptyState title="No executions found" description="Try adjusting your search or filters" icon={<Play className="w-8 h-8" />} />
      )}
    </div>
  );
};
