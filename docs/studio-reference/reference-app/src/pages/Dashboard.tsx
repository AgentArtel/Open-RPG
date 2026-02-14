import React from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { WorkflowPreview } from '@/components/dashboard/WorkflowPreview';
import { ExecutionChart } from '@/components/dashboard/ExecutionChart';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Play, 
  CheckCircle, 
  Clock, 
  Plus, 
  Sparkles,
  ArrowRight 
} from 'lucide-react';

const mockActivities = [
  { id: '1', type: 'success' as const, message: 'Workflow executed successfully', workflowName: 'AI Content Generator', timestamp: '2m ago' },
  { id: '2', type: 'execution' as const, message: 'Workflow started', workflowName: 'Customer Support Bot', timestamp: '15m ago' },
  { id: '3', type: 'created' as const, message: 'New workflow created', workflowName: 'Email Automation', timestamp: '1h ago' },
  { id: '4', type: 'error' as const, message: 'Execution failed', workflowName: 'Data Sync', timestamp: '2h ago' },
  { id: '5', type: 'updated' as const, message: 'Workflow updated', workflowName: 'Slack Notifications', timestamp: '3h ago' },
];

const mockWorkflows = [
  { id: '1', name: 'AI Content Generator', description: 'Generates blog posts from keywords', status: 'active' as const, lastRun: '2m ago', executionCount: 142 },
  { id: '2', name: 'Customer Support Bot', description: 'Auto-replies to common questions', status: 'active' as const, lastRun: '15m ago', executionCount: 89 },
  { id: '3', name: 'Email Automation', description: 'Sends weekly newsletters', status: 'inactive' as const, executionCount: 56 },
  { id: '4', name: 'Data Sync', description: 'Syncs data between platforms', status: 'error' as const, lastRun: '2h ago', executionCount: 234 },
];

const chartData = [12, 19, 15, 25, 22, 30, 28, 35, 42, 38, 45, 52];
const chartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-white/50 mt-1">Welcome back! Here's what's happening with your workflows.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/5">
            <Sparkles className="w-4 h-4 mr-2" />
            Browse Templates
          </Button>
          <Button className="bg-green text-dark hover:bg-green-light">
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Active Workflows"
          value="12"
          subtitle="3 added this month"
          trend="up"
          trendValue="+25%"
          icon={<Zap className="w-5 h-5" />}
        />
        <StatCard
          title="Executions Today"
          value="48"
          subtitle="Across all workflows"
          trend="up"
          trendValue="+12%"
          icon={<Play className="w-5 h-5" />}
        />
        <StatCard
          title="Success Rate"
          value="94.2%"
          subtitle="Last 30 days"
          trend="up"
          trendValue="+2.1%"
          icon={<CheckCircle className="w-5 h-5" />}
        />
        <StatCard
          title="Avg Duration"
          value="2.4s"
          subtitle="Per execution"
          trend="down"
          trendValue="-0.3s"
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Workflows */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Recent Workflows</h2>
            <Button variant="ghost" size="sm" className="text-green hover:text-green-light">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockWorkflows.map((workflow) => (
              <WorkflowPreview
                key={workflow.id}
                {...workflow}
                onRun={() => console.log('Run', workflow.id)}
                onEdit={() => console.log('Edit', workflow.id)}
              />
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ExecutionChart data={chartData} labels={chartLabels} />
          <ActivityFeed activities={mockActivities} />
        </div>
      </div>
    </div>
  );
};
