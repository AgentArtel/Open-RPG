import React from 'react';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  isCollapsed?: boolean;
  badge?: number;
  onClick?: () => void;
  className?: string;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  label,
  icon,
  isActive = false,
  isCollapsed = false,
  badge,
  onClick,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
        "hover:bg-white/5",
        isActive 
          ? "bg-green/10 text-green border-l-2 border-green" 
          : "text-white/60 border-l-2 border-transparent",
        isCollapsed && "justify-center px-2",
        className
      )}
    >
      <span className={cn("flex-shrink-0", isActive && "text-green")}>
        {icon}
      </span>
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left animate-fade-in">{label}</span>
          {badge && (
            <span className="px-2 py-0.5 bg-green/20 text-green text-xs rounded-full">
              {badge}
            </span>
          )}
        </>
      )}
    </button>
  );
};
