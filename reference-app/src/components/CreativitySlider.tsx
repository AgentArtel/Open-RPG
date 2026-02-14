import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';

interface CreativitySliderProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
}

export const CreativitySlider: React.FC<CreativitySliderProps> = ({ 
  value, 
  onChange,
  step = 1 
}) => {
  const percentage = Math.round(value);

  // Generate scatter dots with random positions
  const scatterDots = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.2,
      delay: Math.random() * 0.5,
    }));
  }, []);

  return (
    <div 
      className="relative z-20 w-[340px] rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(61, 148, 61, 0.95) 0%, rgba(12, 63, 9, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(121, 241, 129, 0.3)',
      }}
    >
      {/* Glass overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 40%)',
        }}
      />

      {/* Header */}
      <div className="relative p-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/60">Step 2/2</span>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-white/60" />
            <span className="text-xs text-white/80">Posts ready: 32.4%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">AI</span>
          <span className="text-white font-medium">Creativity ratio</span>
        </div>
      </div>

      {/* Scatter Plot Visualization */}
      <div className="relative px-4 py-4">
        <div className="relative h-20 mb-4 overflow-hidden rounded-lg">
          {/* Background gradient */}
          <div 
            className="absolute inset-0 rounded-lg"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)',
            }}
          />
          
          {/* Scatter dots */}
          {scatterDots.map((dot) => (
            <div
              key={dot.id}
              className="absolute rounded-full bg-white animate-fade-in"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                opacity: dot.x < value ? dot.opacity : dot.opacity * 0.3,
                animationDelay: `${dot.delay}s`,
                transition: 'opacity 0.3s ease',
              }}
            />
          ))}

          {/* Vertical indicator line */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-white/30 transition-all duration-100"
            style={{ left: `${value}%` }}
          />
        </div>

        {/* Slider input */}
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider-green"
            style={{
              background: `linear-gradient(to right, #79F181 0%, #79F181 ${value}%, rgba(255,255,255,0.2) ${value}%, rgba(255,255,255,0.2) 100%)`,
            }}
          />
        </div>

        {/* Labels */}
        <div className="flex justify-between mt-3 text-xs text-white/50">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Value display */}
      <div className="relative px-4 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Creativity level</span>
          <span className="text-2xl font-semibold text-white">{percentage}%</span>
        </div>
      </div>
    </div>
  );
};
