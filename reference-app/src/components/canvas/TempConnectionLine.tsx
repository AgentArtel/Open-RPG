import React from 'react';

interface TempConnectionLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/**
 * Temporary connection line shown while dragging from a port
 * This is drawn on top of everything and follows the mouse
 */
export const TempConnectionLine: React.FC<TempConnectionLineProps> = ({
  from,
  to,
}) => {
  // Calculate control points for bezier curve
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Control point offset based on distance
  const controlOffset = Math.min(distance * 0.5, 100);

  const controlPoint1 = {
    x: from.x,
    y: from.y + controlOffset,
  };

  const controlPoint2 = {
    x: to.x,
    y: to.y - controlOffset,
  };

  const pathD = `M ${from.x} ${from.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${to.x} ${to.y}`;

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 1000 }}
    >
      {/* Glow effect */}
      <defs>
        <filter id="temp-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main line */}
      <path
        d={pathD}
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        strokeDasharray="5,5"
        filter="url(#temp-glow)"
        className="animate-pulse"
      />

      {/* Start point indicator */}
      <circle
        cx={from.x}
        cy={from.y}
        r="6"
        fill="#22c55e"
        className="animate-pulse"
      />

      {/* End point indicator (follows mouse) */}
      <circle
        cx={to.x}
        cy={to.y}
        r="4"
        fill="#22c55e"
        stroke="#fff"
        strokeWidth="2"
      />
    </svg>
  );
};
