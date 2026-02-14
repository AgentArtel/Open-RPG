import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  delay = 300,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div 
          className={cn(
            "absolute z-50 px-2 py-1 bg-dark-200 text-white text-xs rounded-lg whitespace-nowrap",
            "border border-white/10 shadow-lg",
            "animate-fade-in",
            positionClasses[position],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
