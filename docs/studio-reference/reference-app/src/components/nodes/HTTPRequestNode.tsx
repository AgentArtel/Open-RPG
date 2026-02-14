import React from 'react';
import { cn } from '@/lib/utils';
import { Globe, Check } from 'lucide-react';
import type { NodeData } from '@/types';

interface HTTPRequestNodeProps {
  data: NodeData;
  isSelected?: boolean;
  onClick?: () => void;
}

export const HTTPRequestNode: React.FC<HTTPRequestNodeProps> = ({
  data,
  isSelected = false,
  onClick,
}) => {
  const methodColors: Record<string, string> = {
    GET: 'text-blue-400',
    POST: 'text-green',
    PUT: 'text-yellow-400',
    DELETE: 'text-danger',
    PATCH: 'text-purple-400',
  };

  const method = (data.config?.method as string) || 'GET';
  const methodColor = methodColors[method] || 'text-white';
  const url = (data.config?.url as string) || 'https://api.example.com';

  return (
    <div
      className={cn(
        "relative w-[220px] rounded-node p-4 cursor-pointer",
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
          <Globe className="w-5 h-5 text-white/80" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{data.title}</h3>
          <p className="text-xs text-white/50 truncate">HTTP Request</p>
        </div>
        <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-green" />
        </div>
      </div>

      {/* Method & URL Preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-mono font-medium", methodColor)}>
            {method}
          </span>
        </div>
        <div className="px-3 py-2 bg-dark-200 rounded-lg">
          <p className="text-xs text-white/40 truncate">
            {url}
          </p>
        </div>
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
