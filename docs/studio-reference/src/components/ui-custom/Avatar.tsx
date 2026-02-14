import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'md',
  status,
  className,
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const statusColors = {
    online: 'bg-green',
    offline: 'bg-white/30',
    away: 'bg-warning',
    busy: 'bg-danger',
  };

  const initials = name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn("relative inline-block", className)}>
      <div 
        className={cn(
          "rounded-full overflow-hidden flex items-center justify-center font-medium",
          "bg-gradient-to-br from-green/30 to-green-dark/30",
          sizeClasses[size]
        )}
      >
        {src ? (
          <img 
            src={src} 
            alt={alt || name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white/80">{initials}</span>
        )}
      </div>
      {status && (
        <span 
          className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-dark-100",
            statusColors[status]
          )} 
        />
      )}
    </div>
  );
};
