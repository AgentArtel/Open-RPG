import { useState, useCallback, useRef, useEffect } from 'react';
import type { CanvasTransform } from '@/lib/canvasUtils';
import { screenToCanvas, getPortPosition, generateConnectionId } from '@/lib/canvasUtils';
import { isValidConnection, type PortType } from '@/lib/portRegistry';
import type { Connection, NodeData } from '@/types';

export interface ConnectionDrawState {
  isDrawing: boolean;
  fromNodeId: string | null;
  fromPortId: string | null;
  fromPortType: PortType | null;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
}

export interface UseConnectionDrawOptions {
  transform: CanvasTransform;
  nodes: NodeData[];
  connections: Connection[];
  onConnectionCreate?: (connection: Connection) => void;
  onConnectionCancel?: () => void;
}

export function useConnectionDraw(options: UseConnectionDrawOptions) {
  const { transform, nodes, connections, onConnectionCreate, onConnectionCancel } = options;

  const [drawState, setDrawState] = useState<ConnectionDrawState>({
    isDrawing: false,
    fromNodeId: null,
    fromPortId: null,
    fromPortType: null,
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 0, y: 0 },
  });

  // Use refs to avoid stale closures
  const drawStateRef = useRef(drawState);
  const transformRef = useRef(transform);
  const nodesRef = useRef(nodes);

  useEffect(() => {
    drawStateRef.current = drawState;
  }, [drawState]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  /**
   * Calculate distance between two points
   */
  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  /**
   * Find a node and port at a given canvas position
   */
  const findPortAtPosition = useCallback(
    (position: { x: number; y: number }): { nodeId: string; portId: string; portType: PortType } | null => {
      const nodeWidth = 200;
      const nodeHeight = 100;

      for (const node of nodesRef.current) {
        const inputPos = getPortPosition(node.position, 'input', nodeWidth, nodeHeight);
        if (getDistance(position, inputPos) < 15) {
          return { nodeId: node.id, portId: 'input', portType: 'input' };
        }

        const outputPos = getPortPosition(node.position, 'output', nodeWidth, nodeHeight);
        if (getDistance(position, outputPos) < 15) {
          return { nodeId: node.id, portId: 'output', portType: 'output' };
        }

        if (node.type === 'ai-agent') {
          const toolPos = getPortPosition(node.position, 'tool', nodeWidth, nodeHeight);
          if (getDistance(position, toolPos) < 15) {
            return { nodeId: node.id, portId: 'tool', portType: 'tool' };
          }

          const memoryPos = getPortPosition(node.position, 'memory', nodeWidth, nodeHeight);
          if (getDistance(position, memoryPos) < 15) {
            return { nodeId: node.id, portId: 'memory', portType: 'memory' };
          }
        }
      }

      return null;
    },
    []
  );

  /**
   * Start drawing a connection from a port
   */
  const startConnection = useCallback(
    (
      e: React.MouseEvent,
      nodeId: string,
      portId: string,
      portType: PortType
    ) => {
      e.stopPropagation();
      e.preventDefault();

      if (portType === 'input' || portType === 'memory') {
        return;
      }

      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) return;

      const portPosition = getPortPosition(node.position, portType as 'output' | 'tool');

      setDrawState({
        isDrawing: true,
        fromNodeId: nodeId,
        fromPortId: portId,
        fromPortType: portType,
        startPosition: portPosition,
        endPosition: portPosition,
      });

      document.body.style.cursor = 'crosshair';
    },
    []
  );

  /**
   * Update the connection line while dragging
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawStateRef.current.isDrawing) return;

      e.preventDefault();

      const canvasPos = screenToCanvas(
        e.clientX,
        e.clientY,
        transformRef.current
      );

      setDrawState((prev) => ({
        ...prev,
        endPosition: canvasPos,
      }));
    },
    []
  );

  /**
   * Cancel the current connection draw
   */
  const cancelConnection = useCallback(() => {
    if (!drawStateRef.current.isDrawing) return;

    onConnectionCancel?.();

    setDrawState({
      isDrawing: false,
      fromNodeId: null,
      fromPortId: null,
      fromPortType: null,
      startPosition: { x: 0, y: 0 },
      endPosition: { x: 0, y: 0 },
    });

    document.body.style.cursor = '';
  }, [onConnectionCancel]);

  /**
   * End drawing a connection
   */
  const endConnection = useCallback(
    (_e?: React.MouseEvent, targetNodeId?: string, targetPortId?: string) => {
      if (!drawStateRef.current.isDrawing) return;

      const { fromNodeId, fromPortId, fromPortType, endPosition } = drawStateRef.current;

      if (!fromNodeId || !fromPortId || !fromPortType) {
        cancelConnection();
        return;
      }

      let finalTargetNodeId = targetNodeId;
      let finalTargetPortId = targetPortId;

      if (!finalTargetNodeId || !finalTargetPortId) {
        const portInfo = findPortAtPosition(endPosition);
        if (portInfo) {
          finalTargetNodeId = portInfo.nodeId;
          finalTargetPortId = portInfo.portId;
        }
      }

      if (
        finalTargetNodeId &&
        finalTargetPortId &&
        finalTargetNodeId !== fromNodeId &&
        isValidConnection(fromPortId, finalTargetPortId)
      ) {
        const exists = connections.some(
          (c) =>
            c.from === fromNodeId &&
            c.to === finalTargetNodeId &&
            c.fromPort === fromPortId &&
            c.toPort === finalTargetPortId
        );

        if (!exists) {
          const newConnection: Connection = {
            id: generateConnectionId(),
            from: fromNodeId,
            to: finalTargetNodeId,
            fromPort: fromPortId,
            toPort: finalTargetPortId,
          };

          onConnectionCreate?.(newConnection);
        }
      } else {
        onConnectionCancel?.();
      }

      setDrawState({
        isDrawing: false,
        fromNodeId: null,
        fromPortId: null,
        fromPortType: null,
        startPosition: { x: 0, y: 0 },
        endPosition: { x: 0, y: 0 },
      });

      document.body.style.cursor = '';
    },
    [connections, onConnectionCreate, onConnectionCancel, findPortAtPosition]
  );

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (drawStateRef.current.isDrawing) {
        endConnection();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [endConnection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawStateRef.current.isDrawing) {
        cancelConnection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelConnection]);

  return {
    drawState,
    startConnection,
    handleMouseMove,
    endConnection,
    cancelConnection,
    isDrawing: drawState.isDrawing,
    tempLine: drawState.isDrawing
      ? {
          from: drawState.startPosition,
          to: drawState.endPosition,
        }
      : null,
  };
}
