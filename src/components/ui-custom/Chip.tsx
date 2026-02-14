import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ChipProps {
  children: React.ReactNode;
  variant?: 'default' | 'green' | 'blue' | 'red' | 'yellow' | 'gray';
  size?: 'sm' | 'md';
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  variant = 'default',
  size = 'md',
  removable = false,
  onRemove,
  onClick,
  className,
}) => {
  const variantClasses = {
    default: 'bg-white/10 text-white/80 border-white/10',
    green: 'bg-green/15 text-green border-green/30',
    blue: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
    red: 'bg-danger/15 text-danger border-danger/30',
    yellow: 'bg-warning/15 text-warning border-warning/30',
    gray: 'bg-white/5 text-white/50 border-white/5',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border transition-all",
        onClick && "cursor-pointer hover:opacity-80",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {children}
      {removable && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="hover:bg-white/10 rounded-full p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
