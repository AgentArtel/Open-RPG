import { cn } from '@/lib/utils';

interface FormToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export const FormToggle: React.FC<FormToggleProps> = ({
  label, checked, onChange, helperText, disabled = false, className = '',
}) => {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200',
          checked ? 'bg-green' : 'bg-white/10',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={cn('absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200', checked && 'translate-x-5')} />
      </button>
      <div className="flex-1">
        <span className="text-sm text-white/80">{label}</span>
        {helperText && <p className="text-xs text-white/40 mt-0.5">{helperText}</p>}
      </div>
    </div>
  );
};
