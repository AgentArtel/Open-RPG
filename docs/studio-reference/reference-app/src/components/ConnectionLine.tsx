import React from 'react';
import type { Connection } from '@/types';

interface ConnectionLineProps {
  connection: Connection;
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  animated?: boolean;
  label?: string;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ 
  connection, 
  fromPos, 
  toPos,
  animated = true,
  label
}) => {
  // Calculate bezier curve control points
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const controlPointOffset = Math.max(Math.abs(dx) * 0.5, Math.abs(dy) * 0.3);
  
  const pathData = `M ${fromPos.x} ${fromPos.y} 
                    C ${fromPos.x} ${fromPos.y + controlPointOffset},
                      ${toPos.x} ${toPos.y - controlPointOffset},
                      ${toPos.x} ${toPos.y}`;

  // Calculate label position (midpoint of the curve)
  const midX = (fromPos.x + toPos.x) / 2;
  const midY = (fromPos.y + toPos.y) / 2 + controlPointOffset * 0.1;

  return (
    <svg 
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      style={{ zIndex: 1 }}
    >
      <defs>
        {/* Glow filter */}
        <filter id={`glow-${connection.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Gradient */}
        <linearGradient id={`gradient-${connection.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#79F181" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#3D943D" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#79F181" stopOpacity="0.5" />
        </linearGradient>
        
        {/* Animated gradient for data flow */}
        <linearGradient id={`flow-gradient-${connection.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#79F181" stopOpacity="0" />
          <stop offset="50%" stopColor="#79F181" stopOpacity="1" />
          <stop offset="100%" stopColor="#79F181" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Background glow line */}
      <path
        d={pathData}
        fill="none"
        stroke={`url(#gradient-${connection.id})`}
        strokeWidth="6"
        opacity="0.2"
        filter={`url(#glow-${connection.id})`}
        style={{
          animation: animated ? 'connection-draw 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
          strokeDasharray: 1000,
          strokeDashoffset: animated ? 1000 : 0,
        }}
      />
      
      {/* Main line */}
      <path
        d={pathData}
        fill="none"
        stroke={`url(#gradient-${connection.id})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{
          animation: animated ? 'connection-draw 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
          strokeDasharray: 1000,
          strokeDashoffset: animated ? 1000 : 0,
        }}
      />
      
      {/* Animated dash overlay for data flow effect */}
      {animated && (
        <path
          d={pathData}
          fill="none"
          stroke="#79F181"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="4 12"
          className="animate-dash"
          opacity="0.8"
          filter={`url(#glow-${connection.id})`}
        />
      )}
      
      {/* Label */}
      {label && (
        <g>
          <rect
            x={midX - 25}
            y={midY - 10}
            width="50"
            height="20"
            rx="4"
            fill="#0A0A0A"
            fillOpacity="0.8"
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fill="#8A8A8A"
            fontSize="9"
            fontFamily="Urbanist, sans-serif"
          >
            {label}
          </text>
        </g>
      )}
    </svg>
  );
};
