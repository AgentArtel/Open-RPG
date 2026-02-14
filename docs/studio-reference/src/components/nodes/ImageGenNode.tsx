import React from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon, Check } from 'lucide-react';
import type { NodeData } from '@/types';

interface ImageGenNodeProps {
  data: NodeData;
  isSelected?: boolean;
  onClick?: () => void;
}

export const ImageGenNode: React.FC<ImageGenNodeProps> = ({
  data,
  isSelected = false,
  onClick,
}) => {
  const style = (data.config?.style as string) || 'vivid';

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
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center flex-shrink-0">
          <ImageIcon className="w-5 h-5 text-pink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{data.title}</h3>
          <p className="text-xs text-white/50 truncate">Image Generator</p>
        </div>
        {data.isConfigured && (
          <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-green" />
          </div>
        )}
      </div>

      <div className="px-3 py-2 bg-dark-200 rounded-lg">
        <p className="text-xs text-white/40 truncate">Style: {style}</p>
      </div>

      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
        <div className="w-3 h-3 rounded-full bg-dark-100 border-2 border-green shadow-glow cursor-pointer hover:scale-125 transition-transform" />
      </div>
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
        <div className="w-3 h-3 rounded-full bg-dark-100 border-2 border-green shadow-glow cursor-pointer hover:scale-125 transition-transform" />
      </div>
    </div>
  );
};
