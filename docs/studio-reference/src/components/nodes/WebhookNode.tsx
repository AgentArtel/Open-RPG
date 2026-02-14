import React from 'react';
import { cn } from '@/lib/utils';
import { Webhook, Check, Copy } from 'lucide-react';
import type { NodeData } from '@/types';

interface WebhookNodeProps {
  data: NodeData;
  isSelected?: boolean;
  onClick?: () => void;
}

export const WebhookNode: React.FC<WebhookNodeProps> = ({
  data,
  isSelected = false,
  onClick,
}) => {
  const webhookUrl = (data.config?.webhookUrl as string) || 'https://api.openagentartel.com/webhook/...';

  return (
    <div
      className={cn(
        "relative w-[240px] rounded-node p-4 cursor-pointer",
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
          <Webhook className="w-5 h-5 text-white/80" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{data.title}</h3>
          <p className="text-xs text-white/50 truncate">Webhook</p>
        </div>
        <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-green" />
        </div>
      </div>

      {/* Webhook URL */}
      <div className="p-2 bg-dark-200 rounded-lg flex items-center gap-2">
        <code className="flex-1 text-xs text-white/40 font-mono truncate">
          {webhookUrl}
        </code>
        <button 
          className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-green hover:bg-green/10 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(webhookUrl);
          }}
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>

      {/* Connection Ports */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
        <div className="w-3 h-3 rounded-full bg-dark-100 border-2 border-green shadow-glow cursor-pointer hover:scale-125 transition-transform" />
      </div>
    </div>
  );
};
