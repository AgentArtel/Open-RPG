import { cn } from '@/lib/utils';
import { Play, Zap, Clock, RefreshCw } from 'lucide-react';

interface TestTriggerButtonProps {
  onClick: () => void;
  isRunning?: boolean;
  variant?: 'default' | 'compact' | 'icon';
  className?: string;
}

export const TestTriggerButton: React.FC<TestTriggerButtonProps> = ({
  onClick,
  isRunning = false,
  variant = 'default',
  className = '',
}) => {
  if (variant === 'icon') {
    return (
      <button
        onClick={onClick}
        disabled={isRunning}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
          'bg-green hover:bg-green/90 text-dark',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isRunning && 'animate-pulse',
          className
        )}
      >
        {isRunning ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : (
          <Play className="w-5 h-5" />
        )}
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        disabled={isRunning}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
          'bg-green hover:bg-green/90 text-dark font-medium',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isRunning && 'animate-pulse',
          className
        )}
      >
        {isRunning ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Running...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            <span className="text-sm">Test</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={isRunning}
      className={cn(
        'flex items-center gap-3 px-6 py-3 rounded-xl transition-all',
        'bg-green hover:bg-green/90 text-dark font-semibold',
        'shadow-lg shadow-green/20 hover:shadow-green/30',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isRunning && 'animate-pulse',
        className
      )}
    >
      {isRunning ? (
        <>
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Executing Workflow...</span>
          <Clock className="w-4 h-4 ml-2" />
        </>
      ) : (
        <>
          <Play className="w-5 h-5" />
          <span>Test Workflow</span>
          <Zap className="w-4 h-4 ml-2" />
        </>
      )}
    </button>
  );
};
