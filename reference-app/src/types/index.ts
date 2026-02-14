// Node Types
export type NodeType = 
  | 'trigger' 
  | 'ai-agent' 
  | 'openai-chat' 
  | 'anthropic-chat'
  | 'memory' 
  | 'http-tool'
  | 'code-tool'
  | 'custom-tool'
  | 'webhook'
  | 'schedule'
  | 'if'
  | 'merge';

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeConfig {
  credential?: string;
  model?: string;
  prompt?: string;
  maxIterations?: number;
  creativity?: number;
  language?: string;
  lines?: number;
  url?: string;
  webhookUrl?: string;
  method?: string;
  [key: string]: unknown;
}

export interface NodeData {
  id: string;
  type: NodeType;
  position: NodePosition;
  title: string;
  subtitle?: string;
  config?: NodeConfig;
  isConfigured?: boolean;
  isActive?: boolean;
  isDeactivated?: boolean;
}

// Connection Types
export interface Connection {
  id: string;
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
  label?: string;
  animated?: boolean;
}

// Log Types
export type LogType = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: LogType;
}

// Workflow Types
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: NodeData[];
  connections: Connection[];
  status: 'active' | 'inactive' | 'error' | 'running';
  lastRun?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

// Execution Types
export interface Execution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  logs: LogEntry[];
  nodeResults: Record<string, unknown>;
}

// Credential Types
export interface Credential {
  id: string;
  name: string;
  service: string;
  lastUsed?: string;
  createdAt: string;
}

// Navigation Types
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

// Animation Types
export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: string;
}

// Canvas Types
export interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}
