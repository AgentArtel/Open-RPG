import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface OnboardingStepProps {
  number: number;
  title: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
  className?: string;
}

export const OnboardingStep: React.FC<OnboardingStepProps> = ({
  number,
  title,
  description,
  isActive,
  isCompleted,
  className = '',
}) => {
  return (
    <div 
      className={cn(
        'flex items-start gap-4 p-4 rounded-xl transition-all duration-fast',
        isActive && 'bg-green/5 border border-green/20',
        isCompleted && 'opacity-60',
        !isActive && !isCompleted && 'opacity-40',
        className
      )}
    >
      {/* Step number */}
      <div 
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
          isCompleted 
            ? 'bg-green text-dark' 
            : isActive 
              ? 'bg-green/20 text-green border border-green/30'
              : 'bg-white/10 text-white/40'
        )}
      >
        {isCompleted ? (
          <Check className="w-4 h-4" />
        ) : (
          <span className="text-sm font-medium">{number}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <h4 className={cn(
          'text-sm font-medium',
          isActive ? 'text-white' : 'text-white/60'
        )}>
          {title}
        </h4>
        <p className="text-xs text-white/40 mt-1">{description}</p>
      </div>
    </div>
  );
};
