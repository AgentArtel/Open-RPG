import React from 'react';
import { MessageSquare, Check } from 'lucide-react';
import type { NodeData } from '@/types';

interface TriggerNodeProps {
  data: NodeData;
  isSelected?: boolean;
  onClick?: () => void;
}

export const TriggerNode: React.FC<TriggerNodeProps> = ({ 
  data: _data, 
  isSelected = false,
  onClick 
}) => {
  return (
    <div 
      className={`
        relative w-[160px] rounded-node p-4 cursor-pointer
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
          <MessageSquare className="w-5 h-5 text-white/80" />
        </div>
        <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0 ml-auto">
          <Check className="w-3 h-3 text-green" />
        </div>
      </div>

      {/* Content */}
      <div>
        <p className="text-xs text-white/70 text-center leading-relaxed">
          When chat<br />message received
        </p>
      </div>

      {/* Connection Ports */}
      {/* Output port at bottom */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
        <div className="w-3 h-3 rounded-full bg-dark-100 border-2 border-green shadow-glow cursor-pointer hover:scale-125 transition-transform" />
      </div>

      {/* Item label */}
      <div className="absolute -right-10 top-1/2 -translate-y-1/2">
        <span className="text-[10px] text-white/30">1 item</span>
      </div>
    </div>
  );
};
