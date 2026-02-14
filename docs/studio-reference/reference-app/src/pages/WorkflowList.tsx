import React, { useState } from 'react';
import { WorkflowCard } from '@/components/workflow/WorkflowCard';
import { SearchBar } from '@/components/workflow/SearchBar';
import { WorkflowFilters } from '@/components/workflow/WorkflowFilters';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, List, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const mockWorkflows = [
  { id: '1', name: 'AI Content Generator', description: 'Generates blog posts from keywords using OpenAI', status: 'active' as const, lastRun: '2m ago', executionCount: 142, nodes: 5 },
  { id: '2', name: 'Customer Support Bot', description: 'Auto-replies to common questions with AI', status: 'active' as const, lastRun: '15m ago', executionCount: 89, nodes: 8 },
  { id: '3', name: 'Email Automation', description: 'Sends weekly newsletters to subscribers', status: 'inactive' as const, executionCount: 56, nodes: 4 },
  { id: '4', name: 'Data Sync', description: 'Syncs data between platforms every hour', status: 'error' as const, lastRun: '2h ago', executionCount: 234, nodes: 12 },
  { id: '5', name: 'Slack Notifications', description: 'Sends alerts for important events', status: 'active' as const, lastRun: '1h ago', executionCount: 567, nodes: 3 },
  { id: '6', name: 'Lead Scoring', description: 'Scores leads based on behavior', status: 'active' as const, lastRun: '30m ago', executionCount: 123, nodes: 7 },
];

export const WorkflowList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'error'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastRun' | 'created'>('lastRun');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);

  const filteredWorkflows = mockWorkflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // @ts-expect-error - will be used later
  const toggleSelection = (id: string) => {
    setSelectedWorkflows(prev => 
      prev.includes(id) 
        ? prev.filter(w => w !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Workflows</h1>
          <p className="text-white/50 mt-1">Manage and monitor your automation workflows</p>
        </div>
        <Button className="bg-green text-dark hover:bg-green-light">
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 flex-1">
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            className="max-w-md"
          />
          <WorkflowFilters
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>
        
        <div className="flex items-center gap-2">
          {selectedWorkflows.length > 0 && (
            <Button variant="ghost" className="text-danger hover:text-danger hover:bg-danger/10">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedWorkflows.length})
            </Button>
          )}
          <div className="flex items-center gap-1 p-1 bg-dark-100 rounded-lg border border-white/5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-all",
                viewMode === 'grid' 
                  ? "bg-white/10 text-white" 
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center transition-all",
                viewMode === 'list' 
                  ? "bg-white/10 text-white" 
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Workflows Grid */}
      {filteredWorkflows.length > 0 ? (
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
            : "grid-cols-1"
        )}>
          {filteredWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              {...workflow}
              onRun={() => console.log('Run', workflow.id)}
              onEdit={() => console.log('Edit', workflow.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No workflows found"
          description={searchQuery 
            ? "Try adjusting your search or filters" 
            : "Get started by creating your first workflow"
          }
          actionLabel="Create Workflow"
          onAction={() => console.log('Create workflow')}
        />
      )}
    </div>
  );
};
