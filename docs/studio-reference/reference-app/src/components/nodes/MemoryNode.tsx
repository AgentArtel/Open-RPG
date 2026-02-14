import React from 'react';
import { Database, Trash2 } from 'lucide-react';
import type { NodeData } from '@/types';

interface MemoryNodeProps {
  data: NodeData;
  isSelected?: boolean;
  onClick?: () => void;
}

export const MemoryNode: React.FC<MemoryNodeProps> = ({ 
  data, 
  isSelected = false,
  onClick 
}) => {
  const isDeactivated = data.isDeactivated;

  return (
    <div 
      className={`
        relative w-[160px] rounded-node p-4 cursor-pointer
        transition-all duration-fast ease-out-quart
        ${isSelected 
          ? 'bg-dark-100/95 border-2 border-green/50 shadow-glow' 
          : 'bg-dark-100/95 border border-white/10 hover:border-green/30 hover:shadow-glow'
        }
        ${isDeactivated ? 'opacity-60' : ''}
      `}
      onClick={onClick}
      style={{
        animation: 'node-appear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center flex-shrink-0">
          <Database className="w-5 h-5 text-white/80" />
        </div>
        <button 
          className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // Handle delete
          }}
        >
          <Trash2 className="w-3 h-3 text-red-400" />
        </button>
      </div>

      {/* Content */}
      <div>
        <p className="text-xs text-white/70 text-center leading-relaxed">
          {data.title || 'Postgres Chat Memory'}
        </p>
        {isDeactivated && (
          <p className="text-[10px] text-white/40 text-center mt-1">
            (Deactivated)
          </p>
        )}
      </div>

      {/* Connection Ports */}
      {/* Input port at top */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
        <div className={`
          w-3 h-3 rounded-full bg-dark-100 border-2 cursor-pointer hover:border-green hover:scale-125 transition-all
          ${isDeactivated ? 'border-white/20' : 'border-white/30'}
        `} />
      </div>

      {/* Output port at bottom */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
        <div className={`
          w-3 h-3 rounded-full bg-dark-100 border-2 cursor-pointer hover:border-green hover:scale-125 transition-all
          ${isDeactivated ? 'border-white/20' : 'border-white/30'}
        `} />
      </div>
    </div>
  );
};
