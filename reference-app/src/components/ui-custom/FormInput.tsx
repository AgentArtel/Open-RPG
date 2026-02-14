import React from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helper, icon, isPassword, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const inputType = isPassword 
      ? (showPassword ? 'text' : 'password')
      : type;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              "w-full px-4 py-3 bg-dark-200 border rounded-lg",
              "text-sm text-white placeholder:text-white/30",
              "focus:outline-none focus:border-green/50 focus:shadow-glow transition-all",
              error 
                ? "border-danger/50 focus:border-danger" 
                : "border-white/10",
              icon && "pl-10",
              isPassword && "pr-10",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-danger">{error}</p>
        )}
        {helper && !error && (
          <p className="mt-1.5 text-xs text-white/40">{helper}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
