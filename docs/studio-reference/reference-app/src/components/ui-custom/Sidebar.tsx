import React from 'react';
import { cn } from '@/lib/utils';
import { SidebarItem } from './SidebarItem';
import { 
  LayoutDashboard, 
  Workflow, 
  PlayCircle, 
  Key, 
  Settings, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Edit3,
  LayoutGrid
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeItem?: string;
  onItemClick?: (id: string) => void;
  className?: string;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workflows', label: 'Workflows', icon: Workflow },
  { id: 'editor', label: 'Workflow Editor', icon: Edit3 },
  { id: 'executions', label: 'Executions', icon: PlayCircle },
  { id: 'credentials', label: 'Credentials', icon: Key },
  { id: 'templates', label: 'Templates', icon: Sparkles },
  { id: 'showcase', label: 'Components', icon: LayoutGrid },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  activeItem = 'dashboard',
  onItemClick,
  className,
}) => {
  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-full bg-dark-100 border-r border-white/5 z-40",
        "transition-all duration-moderate ease-out-expo",
        isCollapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green to-green-dark flex items-center justify-center shadow-glow flex-shrink-0">
          <Sparkles className="w-5 h-5 text-dark" />
        </div>
        {!isCollapsed && (
          <span className="ml-3 text-lg font-semibold text-white animate-fade-in">
            Agent Artel
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => (
          <SidebarItem
            key={item.id}
            id={item.id}
            label={item.label}
            icon={<item.icon className="w-5 h-5" />}
            isActive={activeItem === item.id}
            isCollapsed={isCollapsed}
            onClick={() => onItemClick?.(item.id)}
          />
        ))}
      </nav>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-dark-200 border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:border-green/30 transition-all"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
};
