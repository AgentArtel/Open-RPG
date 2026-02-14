import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GridBackground } from './GridBackground';
import { ZoomControls } from './ZoomControls';
import { MiniMap } from './MiniMap';
import { TempConnectionLine } from './TempConnectionLine';
import type { NodeData, Connection } from '@/types';
import type { CanvasTransform } from '@/lib/canvasUtils';

interface CanvasProps {
  nodes: NodeData[];
  connections: Connection[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeMove: (nodeId: string, position: { x: number; y: number }) => void;
  onConnectionStart: (nodeId: string, portId: string) => void;
  onConnectionEnd: (nodeId: string, portId: string) => void;
  /** Temporary connection line while dragging */
  tempConnection?: { from: { x: number; y: number }; to: { x: number; y: number } } | null;
  children: React.ReactNode;
  className?: string;
  /** Called when mouse moves on canvas - for drag/connection updates */
  onMouseMove?: (e: React.MouseEvent) => void;
  /** Called when mouse up on canvas - for drag/connection end */
  onMouseUp?: (e: React.MouseEvent) => void;
  /** Called when mouse down on canvas - for selection box start (Phase 2) */
  onMouseDown?: (e: React.MouseEvent) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  connections: _connections,
  selectedNodeId: _selectedNodeId,
  onNodeSelect: _onNodeSelect,
  onNodeMove: _onNodeMove,
  onConnectionStart: _onConnectionStart,
  onConnectionEnd: _onConnectionEnd,
  tempConnection,
  children,
  className = '',
  onMouseMove,
  onMouseUp,
  onMouseDown,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<CanvasTransform>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Expose transform to parent via ref
  useEffect(() => {
    if (canvasRef.current) {
      (canvasRef.current as HTMLDivElement & { transform: CanvasTransform }).transform = transform;
    }
  }, [transform]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Forward to parent first for selection box (Phase 2)
    onMouseDown?.(e);

    // Only pan on left click and when clicking directly on canvas background
    if (e.button !== 0) return;
    if (e.target !== canvasRef.current) return;

    setIsPanning(true);
    setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    // Deselect when clicking background
    _onNodeSelect?.(null);
  }, [transform, _onNodeSelect, onMouseDown]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    // Handle panning
    if (isPanning) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    }

    // Forward to parent for drag/connection handling
    onMouseMove?.(e);
  }, [isPanning, panStart, onMouseMove]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }
    // Forward to parent for drag/connection handling
    onMouseUp?.(e);
  }, [isPanning, onMouseUp]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform(prev => ({
        ...prev,
        scale: Math.min(Math.max(prev.scale * delta, 0.1), 3),
      }));
    }
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 3),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.1),
    }));
  }, []);

  const handleFitToView = useCallback(() => {
    if (nodes.length === 0) {
      setTransform({ x: 0, y: 0, scale: 1 });
      return;
    }
    
    const minX = Math.min(...nodes.map(n => n.position.x));
    const maxX = Math.max(...nodes.map(n => n.position.x + 240));
    const minY = Math.min(...nodes.map(n => n.position.y));
    const maxY = Math.max(...nodes.map(n => n.position.y + 200));
    
    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;
    
    const contentWidth = maxX - minX + 100;
    const contentHeight = maxY - minY + 100;
    
    const scale = Math.min(
      (canvasWidth - 100) / contentWidth,
      (canvasHeight - 100) / contentHeight,
      1.5
    );
    
    setTransform({
      x: (canvasWidth - contentWidth * scale) / 2 - minX * scale + 50,
      y: (canvasHeight - contentHeight * scale) / 2 - minY * scale + 50,
      scale,
    });
  }, [nodes]);

  // Global mouse up for panning
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsPanning(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div 
      ref={canvasRef}
      className={`relative w-full h-full overflow-hidden bg-dark ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onWheel={handleWheel}
    >
      <GridBackground />
      
      {/* Transform container */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {children}
        
        {/* Temporary connection line (drawn inside transform so it scales) */}
        {tempConnection && (
          <TempConnectionLine from={tempConnection.from} to={tempConnection.to} />
        )}
      </div>

      {/* Zoom Controls */}
      <ZoomControls
        scale={transform.scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToView={handleFitToView}
      />

      {/* MiniMap */}
      <MiniMap
        nodes={nodes}
        transform={transform}
        canvasRef={canvasRef}
      />
    </div>
  );
};

// Export transform getter for hooks
export const getCanvasTransform = (canvasElement: HTMLElement | null): CanvasTransform => {
  if (!canvasElement) return { x: 0, y: 0, scale: 1 };
  return (canvasElement as HTMLDivElement & { transform: CanvasTransform }).transform || { x: 0, y: 0, scale: 1 };
};
