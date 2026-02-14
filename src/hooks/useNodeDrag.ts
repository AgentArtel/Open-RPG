import { useState, useCallback, useRef, useEffect } from 'react';
import type { CanvasTransform } from '@/lib/canvasUtils';
import { screenToCanvas, snapPointToGrid } from '@/lib/canvasUtils';

export interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  offset: { x: number; y: number };
}

export interface UseNodeDragOptions {
  transform: CanvasTransform;
  onDragStart?: (nodeId: string) => void;
  onDrag?: (nodeId: string, position: { x: number; y: number }) => void;
  onDragEnd?: (nodeId: string, position: { x: number; y: number }) => void;
  snapToGrid?: boolean;
  gridSize?: number;
}

export function useNodeDrag(options: UseNodeDragOptions) {
  const {
    transform,
    onDragStart,
    onDrag,
    onDragEnd,
    snapToGrid = true,
    gridSize = 20,
  } = options;

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    nodeId: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
  });

  // Use refs to avoid stale closures in event listeners
  const dragStateRef = useRef(dragState);
  const transformRef = useRef(transform);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  /**
   * Start dragging a node
   * Call this from the node's mousedown handler
   */
  const startDrag = useCallback(
    (
      e: React.MouseEvent,
      nodeId: string,
      nodePosition: { x: number; y: number }
    ) => {
      e.stopPropagation();
      e.preventDefault();

      // Convert mouse position to canvas coordinates
      const canvasPos = screenToCanvas(
        e.clientX,
        e.clientY,
        transformRef.current
      );

      // Calculate offset from node top-left corner
      const offset = {
        x: canvasPos.x - nodePosition.x,
        y: canvasPos.y - nodePosition.y,
      };

      const newState: DragState = {
        isDragging: true,
        nodeId,
        startPosition: { ...nodePosition },
        currentPosition: { ...nodePosition },
        offset,
      };

      setDragState(newState);
      onDragStart?.(nodeId);

      // Add global listeners
      document.body.style.cursor = 'grabbing';
    },
    [onDragStart]
  );

  /**
   * Handle mouse move during drag
   * This is called from the canvas's mousemove handler
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragStateRef.current.isDragging || !dragStateRef.current.nodeId) {
        return;
      }

      e.preventDefault();

      const canvasPos = screenToCanvas(
        e.clientX,
        e.clientY,
        transformRef.current
      );

      // Calculate new position accounting for the offset
      let newPosition = {
        x: canvasPos.x - dragStateRef.current.offset.x,
        y: canvasPos.y - dragStateRef.current.offset.y,
      };

      // Snap to grid if enabled
      if (snapToGrid) {
        newPosition = snapPointToGrid(newPosition, gridSize);
      }

      setDragState((prev) => ({
        ...prev,
        currentPosition: newPosition,
      }));

      onDrag?.(dragStateRef.current.nodeId, newPosition);
    },
    [onDrag, snapToGrid, gridSize]
  );

  /**
   * End dragging
   * This is called from the canvas's mouseup handler
   */
  const handleMouseUp = useCallback(
    (e?: React.MouseEvent) => {
      if (!dragStateRef.current.isDragging || !dragStateRef.current.nodeId) {
        return;
      }

      e?.preventDefault();

      const finalPosition = dragStateRef.current.currentPosition;
      const nodeId = dragStateRef.current.nodeId;

      onDragEnd?.(nodeId, finalPosition);

      setDragState({
        isDragging: false,
        nodeId: null,
        startPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        offset: { x: 0, y: 0 },
      });

      document.body.style.cursor = '';
    },
    [onDragEnd]
  );

  /**
   * Cancel dragging (e.g., on Escape key)
   */
  const cancelDrag = useCallback(() => {
    if (!dragStateRef.current.isDragging) return;

    const nodeId = dragStateRef.current.nodeId;
    const startPosition = dragStateRef.current.startPosition;

    if (nodeId) {
      // Revert to start position
      onDragEnd?.(nodeId, startPosition);
    }

    setDragState({
      isDragging: false,
      nodeId: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },
    });

    document.body.style.cursor = '';
  }, [onDragEnd]);

  // Global mouse up handler to catch drag end outside canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragStateRef.current.isDragging) {
        handleMouseUp();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleMouseUp]);

  // Escape key handler to cancel drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragStateRef.current.isDragging) {
        cancelDrag();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelDrag]);

  return {
    dragState,
    startDrag,
    handleMouseMove,
    handleMouseUp,
    cancelDrag,
    isDragging: dragState.isDragging,
    draggedNodeId: dragState.nodeId,
  };
}
