import { cn } from '@/lib/utils';

interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  monospace?: boolean;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  label, value, onChange, placeholder = '', rows = 4,
  helperText, error, disabled = false, className = '', monospace = false,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-xs text-white/40 uppercase tracking-wider block">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-dark-200 border text-sm text-white/80 placeholder:text-white/30 resize-none',
          'focus:outline-none focus:border-green/50 transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          monospace && 'font-mono',
          error ? 'border-danger' : 'border-white/5 hover:border-white/10'
        )}
      />
      {helperText && !error && <p className="text-xs text-white/40">{helperText}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
};
