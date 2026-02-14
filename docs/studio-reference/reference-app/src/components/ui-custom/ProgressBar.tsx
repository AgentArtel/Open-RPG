import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'error' | 'warning';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    default: 'bg-green',
    success: 'bg-green',
    error: 'bg-danger',
    warning: 'bg-warning',
  };

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full bg-white/10 rounded-full overflow-hidden", sizeClasses[size])}>
        <div 
          className={cn("h-full rounded-full transition-all duration-500 ease-out", variantClasses[variant])}
          style={{ 
            width: `${percentage}%`,
            boxShadow: variant === 'default' || variant === 'success' 
              ? '0 0 10px rgba(121, 241, 129, 0.4)' 
              : undefined 
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-white/50 mt-1">{Math.round(percentage)}%</span>
      )}
    </div>
  );
};
