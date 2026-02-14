import React from 'react';

interface GridBackgroundProps {
  className?: string;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({ className }) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
    />
  );
};
