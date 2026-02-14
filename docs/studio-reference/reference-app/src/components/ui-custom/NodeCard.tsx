import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface NodeCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  isConfigured?: boolean;
  onClick?: () => void;
  className?: string;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  title,
  subtitle,
  icon,
  isConfigured = false,
  onClick,
  className,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl bg-dark-100 border border-white/10 p-4',
        'hover:border-green/30 hover:shadow-glow transition-all cursor-pointer',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center flex-shrink-0 text-green">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
          <p className="text-xs text-white/50 truncate">{subtitle}</p>
        </div>
        {isConfigured && (
          <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-green" />
          </div>
        )}
      </div>
    </div>
  );
};
