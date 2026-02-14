import React from 'react';
import type { NodeData } from '@/types';

interface MiniMapProps {
  nodes: NodeData[];
  transform: { x: number; y: number; scale: number };
  canvasRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  nodes,
  transform,
  canvasRef,
  className = '',
}) => {
  const canvasWidth = canvasRef.current?.clientWidth || 800;
  const canvasHeight = canvasRef.current?.clientHeight || 600;

  // Calculate content bounds
  const minX = nodes.length > 0 ? Math.min(...nodes.map(n => n.position.x)) : 0;
  const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.x + 240)) : 400;
  const minY = nodes.length > 0 ? Math.min(...nodes.map(n => n.position.y)) : 0;
  const maxY = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.y + 200)) : 300;

  const contentWidth = Math.max(maxX - minX, 400);
  const contentHeight = Math.max(maxY - minY, 300);

  // MiniMap dimensions
  const mapWidth = 160;
  const mapHeight = 120;

  // Scale factor for mini map
  const mapScale = Math.min(mapWidth / contentWidth, mapHeight / contentHeight);

  // Viewport rectangle in mini map coordinates
  const viewportX = (-transform.x / transform.scale - minX) * mapScale;
  const viewportY = (-transform.y / transform.scale - minY) * mapScale;
  const viewportWidth = (canvasWidth / transform.scale) * mapScale;
  const viewportHeight = (canvasHeight / transform.scale) * mapScale;

  return (
    <div
      className={`absolute bottom-6 right-6 w-40 h-30 bg-dark-100/95 border border-white/5 rounded-lg overflow-hidden shadow-dark-lg backdrop-blur-sm ${className}`}
    >
      {/* Mini map content */}
      <div
        className="relative w-full h-full"
        style={{
          transform: `scale(${mapScale})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Node dots */}
        {nodes.map(node => (
          <div
            key={node.id}
            className="absolute w-6 h-4 rounded bg-white/20"
            style={{
              left: node.position.x - minX,
              top: node.position.y - minY,
            }}
          />
        ))}
      </div>

      {/* Viewport indicator */}
      <div
        className="absolute border-2 border-green/60 rounded pointer-events-none"
        style={{
          left: Math.max(0, viewportX),
          top: Math.max(0, viewportY),
          width: Math.min(viewportWidth, mapWidth - Math.max(0, viewportX)),
          height: Math.min(viewportHeight, mapHeight - Math.max(0, viewportY)),
        }}
      />
    </div>
  );
};
