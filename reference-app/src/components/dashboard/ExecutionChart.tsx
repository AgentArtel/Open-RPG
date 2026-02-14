import React from 'react';
import { cn } from '@/lib/utils';

interface ExecutionChartProps {
  data: number[];
  labels?: string[];
  className?: string;
}

export const ExecutionChart: React.FC<ExecutionChartProps> = ({
  data,
  labels,
  className,
}) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  // Generate SVG path for sparkline
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  // Generate area path
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className={cn("bg-dark-100/80 border border-white/5 rounded-xl p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Execution Trends</h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green" />
          <span className="text-xs text-white/50">Success</span>
        </div>
      </div>

      <div className="relative h-32">
        <svg 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#79F181" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#79F181" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Area fill */}
          <polygon 
            points={areaPoints}
            fill="url(#chartGradient)"
          />
          
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#79F181"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Data points */}
          {data.map((value, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - ((value - min) / range) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1.5"
                fill="#79F181"
              />
            );
          })}
        </svg>
      </div>

      {labels && (
        <div className="flex justify-between mt-2 text-xs text-white/30">
          {labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
};
