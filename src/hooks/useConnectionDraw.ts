import { useState, useCallback, useRef, useEffect } from 'react';
import type { CanvasTransform } from '@/lib/canvasUtils';
import { screenToCanvas, getPortPosition, generateConnectionId } from '@/lib/canvasUtils';
import { isValidConnection, getPortsForNodeType, type PortType } from '@/lib/portRegistry';
import type { Connection, NodeData } from '@/types';

export interface ConnectionDrawState {
  isDrawing: boolean;
  fromNodeId: string | null;
  fromPortId: string | null;
  fromPortType: PortType | null;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
}

export interface CompatiblePort {
  nodeId: string;
  portId: string;
  portType: PortType;
  position: { x: number; y: number };
}

export interface UseConnectionDrawOptions {
  transform: CanvasTransform;
  nodes: NodeData[];
  connections: Connection[];
  onConnectionCreate?: (connection: Connection) => void;
  onConnectionCancel?: () => void;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;
const HIT_RADIUS = 30;
const SNAP_RADIUS = 40;

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

  const [snappedPort, setSnappedPort] = useState<CompatiblePort | null>(null);
  const [compatiblePorts, setCompatiblePorts] = useState<CompatiblePort[]>([]);

  const drawStateRef = useRef(drawState);
  const transformRef = useRef(transform);
  const nodesRef = useRef(nodes);

  useEffect(() => { drawStateRef.current = drawState; }, [drawState]);
  useEffect(() => { transformRef.current = transform; }, [transform]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  /**
   * Get all compatible target ports for the current drag source
   */
  const computeCompatiblePorts = useCallback(
    (fromNodeId: string, fromPortId: string): CompatiblePort[] => {
      const result: CompatiblePort[] = [];
      for (const node of nodesRef.current) {
        if (node.id === fromNodeId) continue;
        const ports = getPortsForNodeType(node.type);
        for (const port of ports) {
          if (isValidConnection(fromPortId, port.id)) {
            result.push({
              nodeId: node.id,
              portId: port.id,
              portType: port.type,
              position: getPortPosition(node.position, port.type, NODE_WIDTH, NODE_HEIGHT),
            });
          }
        }
      }
      return result;
    },
    []
  );

  const findPortAtPosition = useCallback(
    (position: { x: number; y: number }): { nodeId: string; portId: string; portType: PortType } | null => {
      for (const node of nodesRef.current) {
        const ports = getPortsForNodeType(node.type);
        for (const port of ports) {
          const portPos = getPortPosition(node.position, port.type, NODE_WIDTH, NODE_HEIGHT);
          if (getDistance(position, portPos) < HIT_RADIUS) {
            return { nodeId: node.id, portId: port.id, portType: port.type };
          }
        }
      }
      return null;
    },
    []
  );

  const startConnection = useCallback(
    (e: React.MouseEvent, nodeId: string, portId: string, portType: PortType) => {
      e.stopPropagation();
      e.preventDefault();

      if (portType === 'input' || portType === 'memory') return;

      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) return;

      const portPosition = getPortPosition(node.position, portType as 'output' | 'tool', NODE_WIDTH, NODE_HEIGHT);

      setDrawState({
        isDrawing: true,
        fromNodeId: nodeId,
        fromPortId: portId,
        fromPortType: portType,
        startPosition: portPosition,
        endPosition: portPosition,
      });

      // Compute which ports can accept this connection
      const compatible = computeCompatiblePorts(nodeId, portId);
      setCompatiblePorts(compatible);

      document.body.style.cursor = 'crosshair';
    },
    [computeCompatiblePorts]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawStateRef.current.isDrawing) return;
      e.preventDefault();

      const canvasPos = screenToCanvas(e.clientX, e.clientY, transformRef.current);

      // Check for snap-to-port
      let nearest: CompatiblePort | null = null;
      let nearestDist = SNAP_RADIUS;

      // Use current compatible ports from ref-like approach
      const currentFromNodeId = drawStateRef.current.fromNodeId;
      const currentFromPortId = drawStateRef.current.fromPortId;
      if (currentFromNodeId && currentFromPortId) {
        for (const node of nodesRef.current) {
          if (node.id === currentFromNodeId) continue;
          const ports = getPortsForNodeType(node.type);
          for (const port of ports) {
            if (!isValidConnection(currentFromPortId, port.id)) continue;
            const portPos = getPortPosition(node.position, port.type, NODE_WIDTH, NODE_HEIGHT);
            const dist = getDistance(canvasPos, portPos);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = { nodeId: node.id, portId: port.id, portType: port.type, position: portPos };
            }
          }
        }
      }

      setSnappedPort(nearest);

      setDrawState((prev) => ({
        ...prev,
        endPosition: nearest ? nearest.position : canvasPos,
      }));
    },
    []
  );

  const cancelConnection = useCallback(() => {
    if (!drawStateRef.current.isDrawing) return;
    onConnectionCancel?.();
    setDrawState({
      isDrawing: false, fromNodeId: null, fromPortId: null, fromPortType: null,
      startPosition: { x: 0, y: 0 }, endPosition: { x: 0, y: 0 },
    });
    setSnappedPort(null);
    setCompatiblePorts([]);
    document.body.style.cursor = '';
  }, [onConnectionCancel]);

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

      // Use snapped port if available
      if (!finalTargetNodeId || !finalTargetPortId) {
        if (snappedPort) {
          finalTargetNodeId = snappedPort.nodeId;
          finalTargetPortId = snappedPort.portId;
        } else {
          const portInfo = findPortAtPosition(endPosition);
          if (portInfo) {
            finalTargetNodeId = portInfo.nodeId;
            finalTargetPortId = portInfo.portId;
          }
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
            c.from === fromNodeId && c.to === finalTargetNodeId &&
            c.fromPort === fromPortId && c.toPort === finalTargetPortId
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
        isDrawing: false, fromNodeId: null, fromPortId: null, fromPortType: null,
        startPosition: { x: 0, y: 0 }, endPosition: { x: 0, y: 0 },
      });
      setSnappedPort(null);
      setCompatiblePorts([]);
      document.body.style.cursor = '';
    },
    [connections, onConnectionCreate, onConnectionCancel, findPortAtPosition, snappedPort]
  );

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (drawStateRef.current.isDrawing) endConnection();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [endConnection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawStateRef.current.isDrawing) cancelConnection();
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
    snappedPort,
    compatiblePorts,
    tempLine: drawState.isDrawing
      ? { from: drawState.startPosition, to: drawState.endPosition }
      : null,
  };
}
