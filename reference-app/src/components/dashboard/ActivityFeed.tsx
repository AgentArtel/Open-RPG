import React from 'react';
import { cn } from '@/lib/utils';
import { Play, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'execution' | 'success' | 'error' | 'created' | 'updated';
  message: string;
  workflowName: string;
  timestamp: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  className,
}) => {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'execution':
        return <Play className="w-3.5 h-3.5" />;
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5" />;
      case 'error':
        return <XCircle className="w-3.5 h-3.5" />;
      case 'created':
        return <Zap className="w-3.5 h-3.5" />;
      case 'updated':
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getIconBg = (type: ActivityItem['type']) => {
    switch (type) {
      case 'execution':
        return 'bg-blue-400/15 text-blue-400';
      case 'success':
        return 'bg-green/15 text-green';
      case 'error':
        return 'bg-danger/15 text-danger';
      case 'created':
        return 'bg-warning/15 text-warning';
      case 'updated':
        return 'bg-white/10 text-white/60';
    }
  };

  return (
    <div className={cn("bg-dark-100/80 border border-white/5 rounded-xl overflow-hidden", className)}>
      <div className="px-5 py-4 border-b border-white/5">
        <h3 className="text-sm font-medium text-white">Recent Activity</h3>
      </div>
      <div className="p-2">
        {activities.map((activity, index) => (
          <div 
            key={activity.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", getIconBg(activity.type))}>
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80">{activity.message}</p>
              <p className="text-xs text-white/40 mt-0.5">{activity.workflowName}</p>
            </div>
            <span className="text-xs text-white/30 whitespace-nowrap">{activity.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
