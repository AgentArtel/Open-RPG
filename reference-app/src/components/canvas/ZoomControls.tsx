import React from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToView: () => void;
  className?: string;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  onZoomIn,
  onZoomOut,
  onFitToView,
  className = '',
}) => {
  return (
    <div 
      className={`absolute bottom-6 left-6 flex items-center gap-1 px-2 py-2 bg-dark-100/95 border border-white/5 rounded-xl shadow-dark-lg backdrop-blur-sm ${className}`}
    >
      <button
        onClick={onZoomOut}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all"
        title="Zoom out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      
      <div className="px-3 py-1 min-w-[60px] text-center">
        <span className="text-sm text-white/80 font-mono">{Math.round(scale * 100)}%</span>
      </div>
      
      <button
        onClick={onZoomIn}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all"
        title="Zoom in"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      
      <div className="w-px h-6 bg-white/10 mx-1" />
      
      <button
        onClick={onFitToView}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all"
        title="Fit to view"
      >
        <Maximize className="w-4 h-4" />
      </button>
    </div>
  );
};
