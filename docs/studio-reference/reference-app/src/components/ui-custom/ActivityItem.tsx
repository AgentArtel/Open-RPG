import React from 'react';
import { cn } from '@/lib/utils';

interface ActivityItemProps {
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  iconClassName?: string;
  className?: string;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  title,
  description,
  timestamp,
  icon,
  iconClassName,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg',
        'hover:bg-white/5 transition-colors',
        className
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          iconClassName
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-white/50 truncate">{description}</p>
      </div>
      <span className="text-xs text-white/40 whitespace-nowrap">{timestamp}</span>
    </div>
  );
};
