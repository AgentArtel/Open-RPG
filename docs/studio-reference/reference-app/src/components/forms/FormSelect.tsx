import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface FormSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  helperText,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('space-y-2', className)} ref={containerRef}>
      <label className="text-xs text-white/40 uppercase tracking-wider block">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-xl bg-dark-200 border text-sm',
            'focus:outline-none focus:border-green/50 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isOpen ? 'border-green/50' : 'border-white/5 hover:border-white/10',
            selectedOption ? 'text-white/80' : 'text-white/40'
          )}
        >
          <span>{selectedOption?.label || placeholder}</span>
          <ChevronDown className={cn(
            'w-4 h-4 text-white/50 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-dark-100 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-scale-in">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-3 text-left text-sm transition-colors',
                  value === option.value
                    ? 'bg-green/10 text-green'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                )}
              >
                <span className="block">{option.label}</span>
                {option.description && (
                  <span className="block text-xs text-white/40 mt-0.5">{option.description}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {helperText && (
        <p className="text-xs text-white/40">{helperText}</p>
      )}
    </div>
  );
};
