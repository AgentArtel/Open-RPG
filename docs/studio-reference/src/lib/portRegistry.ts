export type PortType = 'input' | 'output' | 'tool' | 'memory';

export interface PortDefinition {
  id: string;
  type: PortType;
  label: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  compatibleWith: PortType[];
  maxConnections: number;
  color: string;
}

export const INPUT_PORT: PortDefinition = {
  id: 'input',
  type: 'input',
  label: '',
  position: 'top',
  compatibleWith: ['output', 'tool'],
  maxConnections: Infinity,
  color: '#FFFFFF',
};

export const OUTPUT_PORT: PortDefinition = {
  id: 'output',
  type: 'output',
  label: '',
  position: 'bottom',
  compatibleWith: ['input'],
  maxConnections: Infinity,
  color: '#79F181',
};

export const TOOL_PORT: PortDefinition = {
  id: 'tool',
  type: 'tool',
  label: 'Tools',
  position: 'right',
  compatibleWith: ['output'],
  maxConnections: Infinity,
  color: '#C586C0',
};

export const MEMORY_PORT: PortDefinition = {
  id: 'memory',
  type: 'memory',
  label: 'Memory',
  position: 'left',
  compatibleWith: ['output'],
  maxConnections: 1,
  color: '#6CB6FF',
};

import type { NodeType } from '@/types';

export function getPortsForNodeType(nodeType: NodeType): PortDefinition[] {
  switch (nodeType) {
    case 'trigger':
    case 'webhook':
    case 'schedule':
      return [OUTPUT_PORT];
    case 'ai-agent':
      return [INPUT_PORT, OUTPUT_PORT, TOOL_PORT, MEMORY_PORT];
    case 'openai-chat':
    case 'anthropic-chat':
      return [INPUT_PORT];
    case 'memory':
      return [OUTPUT_PORT];
    case 'http-tool':
    case 'code-tool':
    case 'custom-tool':
      return [OUTPUT_PORT];
    case 'if':
      return [INPUT_PORT, OUTPUT_PORT];
    case 'merge':
      return [INPUT_PORT, OUTPUT_PORT];
    default:
      return [INPUT_PORT, OUTPUT_PORT];
  }
}

export function getPortDefinition(portId: string): PortDefinition | undefined {
  switch (portId) {
    case 'input': return INPUT_PORT;
    case 'output': return OUTPUT_PORT;
    case 'tool': return TOOL_PORT;
    case 'memory': return MEMORY_PORT;
    default: return undefined;
  }
}

export function isValidConnection(fromPortId: string, toPortId: string): boolean {
  const fromPort = getPortDefinition(fromPortId);
  const toPort = getPortDefinition(toPortId);
  if (!fromPort || !toPort) return false;
  // Bidirectional check: either port lists the other as compatible
  return fromPort.compatibleWith.includes(toPort.type) || toPort.compatibleWith.includes(fromPort.type);
}

export function getPortOffset(
  portType: PortType,
  nodeWidth: number = 200,
  nodeHeight: number = 80
): { x: number; y: number } {
  switch (portType) {
    case 'input': return { x: nodeWidth / 2, y: 0 };
    case 'output': return { x: nodeWidth / 2, y: nodeHeight };
    case 'tool': return { x: nodeWidth, y: nodeHeight / 2 };
    case 'memory': return { x: 0, y: nodeHeight / 2 };
    default: return { x: nodeWidth / 2, y: nodeHeight };
  }
}

export function getPortColor(portId: string): string {
  const port = getPortDefinition(portId);
  return port?.color || '#FFFFFF';
}

export function canAcceptConnection(portId: string, currentCount: number): boolean {
  const port = getPortDefinition(portId);
  if (!port) return false;
  return currentCount < port.maxConnections;
}
