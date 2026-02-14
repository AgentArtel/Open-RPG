import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'url';
  helperText?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  label, value, onChange, placeholder = '', type = 'text',
  helperText, error, disabled = false, className = '',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-xs text-white/40 uppercase tracking-wider block">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-3 rounded-xl bg-dark-200 border text-sm text-white/80 placeholder:text-white/30',
            'focus:outline-none focus:border-green/50 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-danger' : 'border-white/5 hover:border-white/10'
          )}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {helperText && !error && <p className="text-xs text-white/40">{helperText}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
};
