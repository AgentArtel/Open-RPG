import React from 'react';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search workflows...',
  className,
}) => {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full pl-10 pr-10 py-2.5 bg-dark-100 border border-white/10 rounded-lg",
          "text-sm text-white placeholder:text-white/40",
          "focus:outline-none focus:border-green/50 focus:shadow-glow transition-all"
        )}
      />
      {value && (
        <button 
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
