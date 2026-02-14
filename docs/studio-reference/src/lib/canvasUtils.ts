export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  transform: CanvasTransform,
  canvasRect?: DOMRect
): { x: number; y: number } {
  const offsetX = canvasRect ? canvasRect.left : 0;
  const offsetY = canvasRect ? canvasRect.top : 0;
  return {
    x: (screenX - offsetX - transform.x) / transform.scale,
    y: (screenY - offsetY - transform.y) / transform.scale,
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  transform: CanvasTransform,
  canvasRect?: DOMRect
): { x: number; y: number } {
  const offsetX = canvasRect ? canvasRect.left : 0;
  const offsetY = canvasRect ? canvasRect.top : 0;
  return {
    x: canvasX * transform.scale + transform.x + offsetX,
    y: canvasY * transform.scale + transform.y + offsetY,
  };
}

export function getPortPosition(
  nodePosition: { x: number; y: number },
  portType: 'input' | 'output' | 'tool' | 'memory',
  nodeWidth: number = 220,
  nodeHeight: number = 100
): { x: number; y: number } {
  switch (portType) {
    case 'input':
      return { x: nodePosition.x + nodeWidth / 2, y: nodePosition.y };
    case 'output':
      return { x: nodePosition.x + nodeWidth / 2, y: nodePosition.y + nodeHeight };
    case 'tool':
      return { x: nodePosition.x + nodeWidth, y: nodePosition.y + nodeHeight / 2 };
    case 'memory':
      return { x: nodePosition.x, y: nodePosition.y + nodeHeight / 2 };
    default:
      return { x: nodePosition.x + nodeWidth / 2, y: nodePosition.y + nodeHeight };
  }
}

export function snapToGrid(value: number, gridSize: number = 20): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPointToGrid(
  point: { x: number; y: number },
  gridSize: number = 20
): { x: number; y: number } {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  };
}

export function getDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function generateConnectionId(): string {
  return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function isPointInNode(
  point: { x: number; y: number },
  nodePosition: { x: number; y: number },
  nodeWidth: number = 200,
  nodeHeight: number = 80
): boolean {
  return (
    point.x >= nodePosition.x &&
    point.x <= nodePosition.x + nodeWidth &&
    point.y >= nodePosition.y &&
    point.y <= nodePosition.y + nodeHeight
  );
}

export function getNodeCenter(
  nodePosition: { x: number; y: number },
  nodeWidth: number = 200,
  nodeHeight: number = 80
): { x: number; y: number } {
  return {
    x: nodePosition.x + nodeWidth / 2,
    y: nodePosition.y + nodeHeight / 2,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getNodesBoundingBox(
  nodes: Array<{ position: { x: number; y: number } }>,
  nodeWidth: number = 200,
  nodeHeight: number = 80
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + nodeWidth);
    maxY = Math.max(maxY, node.position.y + nodeHeight);
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
