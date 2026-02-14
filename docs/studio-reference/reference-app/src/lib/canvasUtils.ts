/**
 * Canvas utility functions for coordinate transformations
 * Handles screen-to-canvas and canvas-to-screen coordinate conversions
 */

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

/**
 * Convert screen coordinates to canvas coordinates
 * Accounts for pan and zoom transform
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  transform: CanvasTransform
): { x: number; y: number } {
  return {
    x: (screenX - transform.x) / transform.scale,
    y: (screenY - transform.y) / transform.scale,
  };
}

/**
 * Convert canvas coordinates to screen coordinates
 * Accounts for pan and zoom transform
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  transform: CanvasTransform
): { x: number; y: number } {
  return {
    x: canvasX * transform.scale + transform.x,
    y: canvasY * transform.scale + transform.y,
  };
}

/**
 * Get the canvas bounding rect relative to the viewport
 */
export function getCanvasRect(canvasElement: HTMLElement): DOMRect {
  return canvasElement.getBoundingClientRect();
}

/**
 * Calculate the distance between two points
 */
export function getDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Snap a value to the nearest grid point
 */
export function snapToGrid(value: number, gridSize: number = 20): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap a point to the grid
 */
export function snapPointToGrid(
  point: { x: number; y: number },
  gridSize: number = 20
): { x: number; y: number } {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  };
}

/**
 * Calculate the port position on a node
 * Returns the canvas coordinates of the port
 */
export function getPortPosition(
  nodePosition: { x: number; y: number },
  portType: 'input' | 'output' | 'tool' | 'memory',
  nodeWidth: number = 200,
  nodeHeight: number = 100
): { x: number; y: number } {
  switch (portType) {
    case 'input':
      return {
        x: nodePosition.x + nodeWidth / 2,
        y: nodePosition.y,
      };
    case 'output':
      return {
        x: nodePosition.x + nodeWidth / 2,
        y: nodePosition.y + nodeHeight,
      };
    case 'tool':
      return {
        x: nodePosition.x + nodeWidth,
        y: nodePosition.y + nodeHeight / 2,
      };
    case 'memory':
      return {
        x: nodePosition.x,
        y: nodePosition.y + nodeHeight / 3,
      };
    default:
      return {
        x: nodePosition.x + nodeWidth / 2,
        y: nodePosition.y + nodeHeight / 2,
      };
  }
}

/**
 * Generate a unique ID for connections
 */
export function generateConnectionId(): string {
  return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a point is inside a node
 */
export function isPointInNode(
  point: { x: number; y: number },
  nodePosition: { x: number; y: number },
  nodeWidth: number = 200,
  nodeHeight: number = 100
): boolean {
  return (
    point.x >= nodePosition.x &&
    point.x <= nodePosition.x + nodeWidth &&
    point.y >= nodePosition.y &&
    point.y <= nodePosition.y + nodeHeight
  );
}

/**
 * Find a node at a given canvas position
 */
export function findNodeAtPosition<
  T extends { position: { x: number; y: number }; id: string }
>(
  position: { x: number; y: number },
  nodes: T[],
  nodeWidth: number = 200,
  nodeHeight: number = 100
): T | undefined {
  // Search in reverse to find the top-most node
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (isPointInNode(position, node.position, nodeWidth, nodeHeight)) {
      return node;
    }
  }
  return undefined;
}

/**
 * Calculate the center of a node
 */
export function getNodeCenter(
  nodePosition: { x: number; y: number },
  nodeWidth: number = 200,
  nodeHeight: number = 100
): { x: number; y: number } {
  return {
    x: nodePosition.x + nodeWidth / 2,
    y: nodePosition.y + nodeHeight / 2,
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate the bounding box of multiple nodes
 */
export function getNodesBoundingBox<
  T extends { position: { x: number; y: number } }
>(
  nodes: T[],
  nodeWidth: number = 200,
  nodeHeight: number = 100
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (nodes.length === 0) return null;

  const minX = Math.min(...nodes.map((n) => n.position.x));
  const minY = Math.min(...nodes.map((n) => n.position.y));
  const maxX = Math.max(...nodes.map((n) => n.position.x + nodeWidth));
  const maxY = Math.max(...nodes.map((n) => n.position.y + nodeHeight));

  return { minX, minY, maxX, maxY };
}
