import React from 'react';
import { cn } from '@/lib/utils';

interface FormToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  className?: string;
}

export const FormToggle: React.FC<FormToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  className,
}) => {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        {label && (
          <label className="block text-sm font-medium text-white">{label}</label>
        )}
        {description && (
          <p className="text-xs text-white/50 mt-1">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-fast",
          checked ? "bg-green" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-fast",
            checked && "translate-x-5"
          )}
        />
      </button>
    </div>
  );
};
