import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl bg-dark-100 border border-white/10 p-5',
        'hover:border-green/20 transition-all',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/60 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white italic">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              {change.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green" />
              ) : (
                <TrendingDown className="w-4 h-4 text-danger" />
              )}
              <span
                className={cn(
                  'text-xs',
                  change.isPositive ? 'text-green' : 'text-danger'
                )}
              >
                {change.isPositive ? '+' : '-'}
                {change.value}%
              </span>
              <span className="text-xs text-white/40">vs last week</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center text-green">
          {icon}
        </div>
      </div>
    </div>
  );
};
