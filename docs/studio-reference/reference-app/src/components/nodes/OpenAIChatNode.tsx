import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { NodeData } from '@/types';

interface OpenAIChatNodeProps {
  data: NodeData;
  isSelected?: boolean;
  onClick?: () => void;
}

export const OpenAIChatNode: React.FC<OpenAIChatNodeProps> = ({ 
  data, 
  isSelected = false,
  onClick 
}) => {
  return (
    <div 
      className={`
        relative w-[240px] rounded-node overflow-hidden cursor-pointer
        transition-all duration-fast ease-out-quart
        ${isSelected 
          ? 'shadow-glow-intense ring-2 ring-green/50' 
          : 'hover:shadow-glow hover:ring-1 hover:ring-green/30'
        }
      `}
      onClick={onClick}
      style={{
        animation: 'node-appear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        background: 'linear-gradient(135deg, rgba(61, 148, 61, 0.9) 0%, rgba(12, 63, 9, 0.95) 100%)',
        border: '1px solid rgba(121, 241, 129, 0.4)',
      }}
    >
      {/* Glass overlay effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%)',
        }}
      />

      {/* Header */}
      <div className="relative p-4">
        <div className="flex items-start gap-3">
          {/* OpenAI Logo */}
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
              <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{data.title}</h3>
            <p className="text-xs text-white/60 truncate">Model</p>
          </div>
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="relative px-4 pb-4 space-y-3">
        {/* Credential dropdown */}
        <div>
          <label className="text-[10px] text-white/50 uppercase tracking-wider mb-1.5 block">
            Credential to connect with
          </label>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-dark-100/40 border border-white/10 hover:border-white/30 transition-colors cursor-pointer backdrop-blur-sm">
            <span className="text-sm text-white/90">{data.config?.credential || 'Open AI account 4'}</span>
            <ChevronDown className="w-4 h-4 text-white/60" />
          </div>
        </div>

        {/* Model dropdown */}
        <div>
          <label className="text-[10px] text-white/50 uppercase tracking-wider mb-1.5 block">
            Model
          </label>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-dark-100/40 border border-white/10 hover:border-white/30 transition-colors cursor-pointer backdrop-blur-sm">
            <span className="text-sm text-white/90">{data.config?.model || 'gpt-4o-mini'}</span>
            <ChevronDown className="w-4 h-4 text-white/60" />
          </div>
        </div>
      </div>

      {/* Connection Ports */}
      {/* Input port at top */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
        <div className="w-3 h-3 rounded-full bg-dark-100 border-2 border-green shadow-glow cursor-pointer hover:scale-125 transition-transform" />
      </div>

      {/* Output port at bottom */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
        <div className="w-3 h-3 rounded-full bg-dark-100 border-2 border-green shadow-glow cursor-pointer hover:scale-125 transition-transform" />
      </div>

      {/* Item label */}
      <div className="absolute -left-12 top-1/2 -translate-y-1/2">
        <span className="text-[10px] text-white/30">1 item</span>
      </div>
    </div>
  );
};
