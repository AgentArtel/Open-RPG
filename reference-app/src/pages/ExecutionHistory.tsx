import React, { useState } from 'react';
import { ExecutionRow } from '@/components/execution/ExecutionRow';
import { SearchBar } from '@/components/workflow/SearchBar';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { Chip } from '@/components/ui-custom/Chip';
import { Play, RotateCcw } from 'lucide-react';

const mockExecutions = [
  { id: '1', workflowName: 'AI Content Generator', status: 'success' as const, startedAt: '2 minutes ago', duration: 2450 },
  { id: '2', workflowName: 'Customer Support Bot', status: 'running' as const, startedAt: '5 minutes ago' },
  { id: '3', workflowName: 'Data Sync', status: 'error' as const, startedAt: '1 hour ago', duration: 5600 },
  { id: '4', workflowName: 'Email Automation', status: 'success' as const, startedAt: '2 hours ago', duration: 1200 },
  { id: '5', workflowName: 'Slack Notifications', status: 'success' as const, startedAt: '3 hours ago', duration: 800 },
  { id: '6', workflowName: 'Lead Scoring', status: 'error' as const, startedAt: '5 hours ago', duration: 3200 },
  { id: '7', workflowName: 'AI Content Generator', status: 'success' as const, startedAt: 'Yesterday', duration: 2100 },
];

export const ExecutionHistory: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredExecutions = mockExecutions.filter(execution => {
    const matchesSearch = execution.workflowName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || execution.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: mockExecutions.length,
    success: mockExecutions.filter(e => e.status === 'success').length,
    error: mockExecutions.filter(e => e.status === 'error').length,
    running: mockExecutions.filter(e => e.status === 'running').length,
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Execution History</h1>
          <p className="text-white/50 mt-1">View and manage workflow executions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-dark-100 border border-white/5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
          <RotateCcw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search executions..."
          className="max-w-md"
        />
        
        <div className="flex items-center gap-2">
          <Chip 
            variant={statusFilter === 'all' ? 'green' : 'gray'}
            onClick={() => setStatusFilter('all')}
            className="cursor-pointer"
          >
            All ({statusCounts.all})
          </Chip>
          <Chip 
            variant={statusFilter === 'success' ? 'green' : 'gray'}
            onClick={() => setStatusFilter('success')}
            className="cursor-pointer"
          >
            Success ({statusCounts.success})
          </Chip>
          <Chip 
            variant={statusFilter === 'error' ? 'red' : 'gray'}
            onClick={() => setStatusFilter('error')}
            className="cursor-pointer"
          >
            Failed ({statusCounts.error})
          </Chip>
          <Chip 
            variant={statusFilter === 'running' ? 'blue' : 'gray'}
            onClick={() => setStatusFilter('running')}
            className="cursor-pointer"
          >
            Running ({statusCounts.running})
          </Chip>
        </div>
      </div>

      {/* Executions List */}
      {filteredExecutions.length > 0 ? (
        <div className="space-y-2">
          {filteredExecutions.map((execution) => (
            <ExecutionRow
              key={execution.id}
              {...execution}
              onView={() => console.log('View', execution.id)}
              onRetry={() => console.log('Retry', execution.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No executions found"
          description="Try adjusting your search or filters"
          icon={<Play className="w-8 h-8" />}
        />
      )}
    </div>
  );
};
