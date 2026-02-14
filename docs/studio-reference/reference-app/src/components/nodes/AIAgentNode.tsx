import React from 'react';
import { Bot, Check, Plus } from 'lucide-react';
import type { NodeData } from '@/types';

interface AIAgentNodeProps {
  data: NodeData;
  isSelected?: boolean;
  onClick?: () => void;
}

export const AIAgentNode: React.FC<AIAgentNodeProps> = ({ 
  data, 
  isSelected = false,
  onClick 
}) => {
  return (
    <div 
      className={`
        relative w-[200px] rounded-node p-4 cursor-pointer
        transition-all duration-fast ease-out-quart
        ${isSelected 
          ? 'bg-dark-100/95 border-2 border-green/50 shadow-glow' 
          : 'bg-dark-100/95 border border-white/10 hover:border-green/30 hover:shadow-glow'
        }
      `}
      onClick={onClick}
      style={{
        animation: 'node-appear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white/80" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{data.title}</h3>
          <p className="text-xs text-white/50 truncate">{data.subtitle || 'Tools Agent'}</p>
        </div>
        <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-green" />
        </div>
      </div>

      {/* Connection Ports */}
      {/* Input port at top */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
        <div className="w-3 h-3 rounded-full bg-dark-100 border-2 border-green shadow-glow cursor-pointer hover:scale-125 transition-transform" />
      </div>

      {/* Output ports at bottom */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-6">
        <div className="relative group">
          <div className="w-3 h-3 rounded-full bg-dark-100 border-2 border-green/50 cursor-pointer hover:border-green hover:scale-125 transition-all" />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-white/40 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Chat model
          </span>
        </div>
        <div className="relative group">
          <div className="w-3 h-3 rounded-full bg-dark-100 border-2 border-white/30 cursor-pointer hover:border-green hover:scale-125 transition-all" />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-white/40 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Memory
          </span>
        </div>
        <div className="relative group">
          <div className="w-3 h-3 rounded-full bg-dark-100 border-2 border-white/30 cursor-pointer hover:border-green hover:scale-125 transition-all flex items-center justify-center">
            <Plus className="w-2 h-2 text-white/50" />
          </div>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-white/40 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Tool
          </span>
        </div>
      </div>

      {/* Item label */}
      <div className="absolute -left-12 top-1/2 -translate-y-1/2">
        <span className="text-[10px] text-white/30">1 item</span>
      </div>
    </div>
  );
};
