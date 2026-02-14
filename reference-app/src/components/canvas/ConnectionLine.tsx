import type { Connection } from '@/types';

interface ConnectionLineProps {
  connection: Connection;
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  isSelected?: boolean;
  isAnimating?: boolean;
  label?: string;
  onClick?: () => void;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  fromPos,
  toPos,
  isSelected = false,
  isAnimating = false,
  label,
  onClick,
}) => {
  // Calculate bezier control points for smooth curve
  const dx = toPos.x - fromPos.x;
  const controlPointOffset = Math.max(Math.abs(dx) * 0.5, 80);
  
  const pathData = `M ${fromPos.x} ${fromPos.y} 
                    C ${fromPos.x} ${fromPos.y + controlPointOffset},
                      ${toPos.x} ${toPos.y - controlPointOffset},
                      ${toPos.x} ${toPos.y}`;

  // Calculate label position (midpoint)
  const midX = (fromPos.x + toPos.x) / 2;
  const midY = (fromPos.y + toPos.y) / 2;

  return (
    <>
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
          
          {/* Gradient for the line */}
          <linearGradient id={`gradient-${connection.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#79F181" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#3D943D" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#79F181" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        
        {/* Background glow line */}
        <path
          d={pathData}
          fill="none"
          stroke={isSelected ? '#79F181' : '#3A3A3A'}
          strokeWidth={isSelected ? 6 : 4}
          opacity={isSelected ? 0.3 : 0.2}
          filter={isSelected ? `url(#glow-${connection.id})` : undefined}
          className="pointer-events-auto cursor-pointer"
          onClick={onClick}
        />
        
        {/* Main line */}
        <path
          d={pathData}
          fill="none"
          stroke={isSelected ? `url(#gradient-${connection.id})` : '#3A3A3A'}
          strokeWidth={isSelected ? 2.5 : 2}
          strokeLinecap="round"
          className="pointer-events-auto cursor-pointer transition-all duration-200"
          onClick={onClick}
        />
        
        {/* Animated flow effect */}
        {isAnimating && (
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
        
        {/* Selection highlight */}
        {isSelected && (
          <path
            d={pathData}
            fill="none"
            stroke="#79F181"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.5"
            filter={`url(#glow-${connection.id})`}
          />
        )}
      </svg>
      
      {/* Label */}
      {label && (
        <div
          className="absolute px-2 py-1 bg-dark-100 border border-white/10 rounded text-[10px] text-white/60 whitespace-nowrap pointer-events-none"
          style={{
            left: midX,
            top: midY,
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
          }}
        >
          {label}
        </div>
      )}
    </>
  );
};
