import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  className,
}) => {
  const trendIcon = {
    up: <TrendingUp className="w-3 h-3" />,
    down: <TrendingDown className="w-3 h-3" />,
    neutral: <Minus className="w-3 h-3" />,
  };

  const trendColor = {
    up: 'text-green',
    down: 'text-danger',
    neutral: 'text-white/40',
  };

  return (
    <div 
      className={cn(
        "bg-dark-100/80 border border-white/5 rounded-xl p-5",
        "hover:border-green/20 hover:shadow-glow transition-all duration-fast",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl font-semibold text-white italic">{value}</h3>
          {subtitle && (
            <p className="text-sm text-white/40 mt-1 italic">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs", trendColor[trend])}>
              {trendIcon[trend]}
              <span className="italic">{trendValue}</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center text-green">
          {icon}
        </div>
      </div>
    </div>
  );
};
