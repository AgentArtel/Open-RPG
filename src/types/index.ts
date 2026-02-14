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
  | 'merge'
  | 'image-gen'
  | 'gemini-chat'
  | 'gemini-embed'
  | 'gemini-vision';

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

export interface Connection {
  id: string;
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
  label?: string;
  animated?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: NodeData[];
  connections: Connection[];
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
  executionCount?: number;
  lastExecutionStatus?: 'success' | 'error' | 'running';
}

export interface Execution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  nodeResults: Record<string, {
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    output?: unknown;
    error?: string;
  }>;
}

export interface Credential {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  lastUsed?: string;
}

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

// =============================================================================
// n8n IMPORT TYPES
// =============================================================================
// These types represent the raw n8n workflow JSON format.
// Used by src/lib/n8nImporter.ts to convert n8n workflows to Artel format.
// Reference: https://docs.n8n.io/workflows/export-import/

/**
 * Raw n8n node as it appears in exported workflow JSON.
 * The `type` field uses n8n's namespaced format, e.g.:
 *   - @n8n/n8n-nodes-langchain.chatTrigger
 *   - @n8n/n8n-nodes-base.httpRequest
 */
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id?: string; name: string }>;
}

/**
 * Target reference in n8n's connections structure.
 * Each connection target specifies the destination node (by name),
 * the connection type (usually "main"), and the input index.
 */
export interface N8nConnectionTarget {
  node: string;
  type: string;
  index: number;
}

/**
 * Top-level n8n workflow JSON structure.
 * `connections` is keyed by source node name (or sometimes ID in newer exports),
 * then by output type (e.g., "main", "ai_languageModel"), then an array of arrays
 * of connection targets (outer array = output index, inner array = targets for that output).
 */
export interface N8nWorkflowJSON {
  name?: string;
  nodes: N8nNode[];
  connections: Record<string, Record<string, N8nConnectionTarget[][]>>;
  settings?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

/**
 * Result of converting an n8n workflow to Artel format.
 * Contains the converted nodes/connections plus any detected missing configuration
 * (credentials and environment variables that need user input).
 */
export interface N8nImportResult {
  nodes: NodeData[];
  connections: Connection[];
  workflowName: string;
  missing: {
    /** Credential references found in n8n nodes that need to be mapped to Artel credentials */
    credentialRefs: {
      nodeId: string;
      nodeTitle: string;
      credentialType: string;
      n8nCredName: string;
    }[];
    /** Environment variable names detected in node parameters (from {{ $env.VAR }} expressions) */
    envVars: string[];
  };
}
