import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'error' | 'running' | 'success' | 'warning' | 'pending';
  children?: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  className,
  pulse = false,
}) => {
  const config = {
    active: {
      bg: 'bg-green/15',
      border: 'border-green/30',
      text: 'text-green',
      dot: 'bg-green',
    },
    inactive: {
      bg: 'bg-white/5',
      border: 'border-white/10',
      text: 'text-white/50',
      dot: 'bg-white/30',
    },
    error: {
      bg: 'bg-danger/15',
      border: 'border-danger/30',
      text: 'text-danger',
      dot: 'bg-danger',
    },
    running: {
      bg: 'bg-blue-400/15',
      border: 'border-blue-400/30',
      text: 'text-blue-400',
      dot: 'bg-blue-400',
    },
    success: {
      bg: 'bg-green/15',
      border: 'border-green/30',
      text: 'text-green',
      dot: 'bg-green',
    },
    warning: {
      bg: 'bg-warning/15',
      border: 'border-warning/30',
      text: 'text-warning',
      dot: 'bg-warning',
    },
    pending: {
      bg: 'bg-white/5',
      border: 'border-white/10',
      text: 'text-white/40',
      dot: 'bg-white/30',
    },
  };

  const c = config[status];

  return (
    <span 
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border",
        c.bg,
        c.border,
        c.text,
        className
      )}
    >
      <span className={cn("w-2 h-2 rounded-full", c.dot, pulse && "animate-pulse")} />
      {children || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
