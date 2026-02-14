import { cn } from '@/lib/utils';
import { Play, Pause, Square, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

interface ExecutionStep {
  id: string;
  nodeId: string;
  nodeName: string;
  status: 'waiting' | 'running' | 'success' | 'error' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

interface ExecutionOverlayProps {
  isExecuting: boolean;
  steps: ExecutionStep[];
  currentStepId?: string;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  className?: string;
}

const statusIcons = {
  waiting: Clock,
  running: Loader2,
  success: CheckCircle2,
  error: XCircle,
  skipped: Clock,
};

const statusColors = {
  waiting: 'text-white/30',
  running: 'text-green animate-spin',
  success: 'text-green',
  error: 'text-danger',
  skipped: 'text-white/30',
};

export const ExecutionOverlay: React.FC<ExecutionOverlayProps> = ({
  isExecuting,
  steps,
  currentStepId,
  onPause,
  onResume,
  onStop,
  className = '',
}) => {
  if (!isExecuting && steps.every(s => s.status === 'waiting')) return null;

  const completedSteps = steps.filter(s => s.status === 'success').length;
  const errorSteps = steps.filter(s => s.status === 'error').length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  return (
    <div 
      className={cn(
        'absolute bottom-20 left-1/2 -translate-x-1/2 w-[500px] max-w-[90vw]',
        'bg-dark-100/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl',
        'animate-slide-up',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 text-green animate-spin" />
              <span className="text-sm font-medium text-white">Executing workflow...</span>
            </>
          ) : errorSteps > 0 ? (
            <>
              <XCircle className="w-4 h-4 text-danger" />
              <span className="text-sm font-medium text-danger">Execution failed</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-green" />
              <span className="text-sm font-medium text-green">Execution completed</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isExecuting ? (
            <>
              <button
                onClick={onPause}
                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Pause className="w-4 h-4" />
              </button>
              <button
                onClick={onStop}
                className="p-2 rounded-lg text-white/50 hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <Square className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-green hover:bg-green/10 transition-colors"
            >
              <Play className="w-4 h-4" />
              Run Again
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2">
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-white/40">
          <span>{completedSteps} of {steps.length} steps</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Steps list */}
      <div className="max-h-[200px] overflow-y-auto scrollbar-thin px-4 pb-4">
        <div className="space-y-1">
          {steps.map((step, index) => {
            const Icon = statusIcons[step.status];
            const isCurrent = step.id === currentStepId;
            
            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isCurrent && 'bg-green/5',
                  step.status === 'error' && 'bg-danger/5'
                )}
              >
                <span className="text-xs text-white/30 w-5">{index + 1}</span>
                <Icon className={cn('w-4 h-4', statusColors[step.status])} />
                <span className={cn(
                  'flex-1 text-sm',
                  step.status === 'waiting' ? 'text-white/40' : 'text-white/80'
                )}>
                  {step.nodeName}
                </span>
                {step.duration && (
                  <span className="text-xs text-white/30">
                    {step.duration}ms
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
