import React from 'react';
import { cn } from '@/lib/utils';
import { Code2, Check } from 'lucide-react';
import type { NodeData } from '@/types';

interface CodeNodeProps {
  data: NodeData;
  isSelected?: boolean;
  onClick?: () => void;
}

export const CodeNode: React.FC<CodeNodeProps> = ({
  data,
  isSelected = false,
  onClick,
}) => {
  const language = (data.config?.language as string) || 'javascript';
  const lines = (data.config?.lines as number) || 0;
  
  const languageIcons: Record<string, string> = {
    javascript: 'JS',
    python: 'PY',
    typescript: 'TS',
    bash: 'SH',
  };

  const langLabel = languageIcons[language] || language;

  return (
    <div
      className={cn(
        "relative w-[200px] rounded-node p-4 cursor-pointer",
        "transition-all duration-fast ease-out-quart",
        isSelected
          ? 'bg-dark-100/95 border-2 border-green/50 shadow-glow'
          : 'bg-dark-100/95 border border-white/10 hover:border-green/30 hover:shadow-glow'
      )}
      onClick={onClick}
      style={{ animation: 'node-appear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center flex-shrink-0">
          <Code2 className="w-5 h-5 text-white/80" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{data.title}</h3>
          <p className="text-xs text-white/50 truncate">Code</p>
        </div>
        <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-green" />
        </div>
      </div>

      {/* Language Badge */}
      <div className="flex items-center justify-between">
        <span className="px-2 py-1 bg-dark-200 rounded text-xs font-mono text-white/60 uppercase">
          {langLabel}
        </span>
        <span className="text-xs text-white/30">
          {lines} lines
        </span>
      </div>

      {/* Connection Ports */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
        <div className="w-3 h-3 rounded-full bg-dark-100 border-2 border-green shadow-glow cursor-pointer hover:scale-125 transition-transform" />
      </div>
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
        <div className="w-3 h-3 rounded-full bg-dark-100 border-2 border-green shadow-glow cursor-pointer hover:scale-125 transition-transform" />
      </div>
    </div>
  );
};
