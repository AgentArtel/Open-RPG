/**
 * Port Registry - Defines all available ports and their compatibility
 * Used for connection validation and port discovery
 */

export type PortType = 'input' | 'output' | 'tool' | 'memory';

export interface PortDefinition {
  id: string;
  type: PortType;
  label: string;
  description: string;
  // Which node types can have this port
  compatibleNodes: string[];
  // Which port types can connect to this port
  acceptsConnectionsFrom: PortType[];
  // Visual position on the node
  position: 'top' | 'bottom' | 'left' | 'right';
  // Maximum number of connections (-1 for unlimited)
  maxConnections: number;
  // Color for the port indicator
  color: string;
}

// Standard input port - receives data from other nodes
export const INPUT_PORT: PortDefinition = {
  id: 'input',
  type: 'input',
  label: 'Input',
  description: 'Receives data from previous nodes',
  compatibleNodes: ['*'], // All node types
  acceptsConnectionsFrom: ['output', 'tool'],
  position: 'top',
  maxConnections: -1,
  color: '#ffffff',
};

// Standard output port - sends data to next nodes
export const OUTPUT_PORT: PortDefinition = {
  id: 'output',
  type: 'output',
  label: 'Output',
  description: 'Sends data to next nodes',
  compatibleNodes: ['*'], // All node types
  acceptsConnectionsFrom: [], // Outputs don't accept connections
  position: 'bottom',
  maxConnections: -1,
  color: '#22c55e', // Green
};

// Tool port for AI agents - connects tools to agents
export const TOOL_PORT: PortDefinition = {
  id: 'tool',
  type: 'tool',
  label: 'Tool',
  description: 'Connect tools to AI agents',
  compatibleNodes: ['ai-agent'],
  acceptsConnectionsFrom: [], // Tool ports don't accept connections
  position: 'right',
  maxConnections: -1,
  color: '#a855f7', // Purple
};

// Memory port for AI agents - connects memory to agents
export const MEMORY_PORT: PortDefinition = {
  id: 'memory',
  type: 'memory',
  label: 'Memory',
  description: 'Connect memory to AI agents',
  compatibleNodes: ['ai-agent'],
  acceptsConnectionsFrom: ['output'],
  position: 'left',
  maxConnections: 1,
  color: '#3b82f6', // Blue
};

// Registry of all port definitions
export const PORT_REGISTRY: Record<string, PortDefinition> = {
  input: INPUT_PORT,
  output: OUTPUT_PORT,
  tool: TOOL_PORT,
  memory: MEMORY_PORT,
};

/**
 * Get port definition by ID
 */
export function getPortDefinition(portId: string): PortDefinition | undefined {
  return PORT_REGISTRY[portId];
}

/**
 * Get all ports available for a node type
 */
export function getPortsForNodeType(nodeType: string): PortDefinition[] {
  return Object.values(PORT_REGISTRY).filter(
    (port) =>
      port.compatibleNodes.includes('*') ||
      port.compatibleNodes.includes(nodeType)
  );
}

/**
 * Check if a connection between two ports is valid
 */
export function isValidConnection(
  fromPortId: string,
  toPortId: string
): boolean {
  const fromPort = getPortDefinition(fromPortId);
  const toPort = getPortDefinition(toPortId);

  if (!fromPort || !toPort) return false;

  // Check if the target port accepts connections from the source port type
  return toPort.acceptsConnectionsFrom.includes(fromPort.type);
}

/**
 * Get the port position offset relative to node center
 * Used for calculating connection line endpoints
 */
export function getPortOffset(
  portType: PortType,
  nodeWidth: number = 200,
  nodeHeight: number = 100
): { x: number; y: number } {
  switch (portType) {
    case 'input':
      return { x: 0, y: -nodeHeight / 2 };
    case 'output':
      return { x: 0, y: nodeHeight / 2 };
    case 'tool':
      return { x: nodeWidth / 2, y: 0 };
    case 'memory':
      return { x: -nodeWidth / 2, y: -nodeHeight / 6 };
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Get the port color for visual indication
 */
export function getPortColor(portId: string): string {
  const port = getPortDefinition(portId);
  return port?.color || '#ffffff';
}

/**
 * Check if a port can accept more connections
 */
export function canAcceptConnection(
  portId: string,
  currentConnectionCount: number
): boolean {
  const port = getPortDefinition(portId);
  if (!port) return false;
  if (port.maxConnections === -1) return true;
  return currentConnectionCount < port.maxConnections;
}
