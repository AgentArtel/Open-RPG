/**
 * ============================================================================
 * USE EXECUTION HOOK
 * ============================================================================
 *
 * PURPOSE:
 * Manages workflow execution state, progress tracking, and node status updates.
 * Provides visual feedback during execution with status animations.
 *
 * @author Open Agent Artel Team
 * @version 4.0.0 (Phase 4)
 * ============================================================================
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { NodeData, Connection } from '@/types';

export type NodeExecutionStatus = 'waiting' | 'running' | 'success' | 'error' | 'skipped';
export type ExecutionState = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface ExecutionLog {
  id: string;
  timestamp: number;
  nodeId: string;
  nodeName: string;
  status: NodeExecutionStatus;
  message?: string;
  duration?: number;
}

export interface ExecutionResult {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: ExecutionState;
  nodeStatuses: Record<string, NodeExecutionStatus>;
  logs: ExecutionLog[];
  error?: string;
}

export type NodeStatusMap = Record<string, NodeExecutionStatus>;

export interface UseExecutionOptions {
  nodes: NodeData[];
  connections: Connection[];
  onExecutionStart?: () => void;
  onExecutionComplete?: (result: ExecutionResult) => void;
  onExecutionError?: (error: string) => void;
  onNodeStatusChange?: (nodeId: string, status: NodeExecutionStatus) => void;
}

export interface UseExecutionReturn {
  executionState: ExecutionState;
  nodeStatuses: NodeStatusMap;
  progress: number;
  logs: ExecutionLog[];
  currentExecutionId: string | null;
  startTime: number | null;
  isExecuting: boolean;
  canExecute: boolean;
  executionHistory: ExecutionResult[];
  startExecution: () => void;
  stopExecution: () => void;
  pauseExecution: () => void;
  resumeExecution: () => void;
  resetExecution: () => void;
  getNodeStatus: (nodeId: string) => NodeExecutionStatus;
  setNodeStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  clearHistory: () => void;
}

function generateExecutionId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function buildExecutionOrder(nodes: NodeData[], connections: Connection[]): string[] {
  const nodeIds = nodes.map((n) => n.id);
  const inDegree: Record<string, number> = {};
  const adjacency: Record<string, string[]> = {};

  nodeIds.forEach((id) => {
    inDegree[id] = 0;
    adjacency[id] = [];
  });

  connections.forEach((conn) => {
    if (adjacency[conn.from]) {
      adjacency[conn.from].push(conn.to);
      inDegree[conn.to]++;
    }
  });

  const queue: string[] = [];
  const result: string[] = [];

  nodeIds.forEach((id) => {
    if (inDegree[id] === 0) {
      queue.push(id);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    adjacency[current].forEach((neighbor) => {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }

  return result;
}

export function useExecution(options: UseExecutionOptions): UseExecutionReturn {
  const { nodes, connections, onExecutionStart, onExecutionComplete, onExecutionError, onNodeStatusChange } = options;

  const [executionState, setExecutionState] = useState<ExecutionState>('idle');
  const [nodeStatuses, setNodeStatuses] = useState<NodeStatusMap>({});
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionResult[]>([]);

  const executionOrderRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const executionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = useMemo(() => {
    if (executionState === 'idle') return 0;
    if (executionState === 'completed') return 100;

    const totalNodes = nodes.length;
    if (totalNodes === 0) return 0;

    const completedNodes = Object.values(nodeStatuses).filter(
      (s) => s === 'success' || s === 'error' || s === 'skipped'
    ).length;

    return Math.round((completedNodes / totalNodes) * 100);
  }, [executionState, nodeStatuses, nodes.length]);

  const addLog = useCallback((nodeId: string, nodeName: string, status: NodeExecutionStatus, message?: string) => {
    const log: ExecutionLog = {
      id: generateLogId(),
      timestamp: Date.now(),
      nodeId,
      nodeName,
      status,
      message,
    };
    setLogs((prev) => [...prev, log]);
  }, []);

  const setNodeStatus = useCallback(
    (nodeId: string, status: NodeExecutionStatus) => {
      setNodeStatuses((prev) => ({ ...prev, [nodeId]: status }));
      onNodeStatusChange?.(nodeId, status);

      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        addLog(nodeId, node.title, status);
      }
    },
    [nodes, onNodeStatusChange, addLog]
  );

  const getNodeStatus = useCallback(
    (nodeId: string) => {
      return nodeStatuses[nodeId] || 'waiting';
    },
    [nodeStatuses]
  );

  const executeNextNode = useCallback(() => {
    if (isPausedRef.current) return;

    const order = executionOrderRef.current;
    const index = currentIndexRef.current;

    if (index >= order.length) {
      const endTime = Date.now();
      const result: ExecutionResult = {
        id: currentExecutionId!,
        startTime: startTime!,
        endTime,
        duration: endTime - startTime!,
        status: 'completed',
        nodeStatuses: { ...nodeStatuses },
        logs: [...logs],
      };

      setExecutionState('completed');
      setExecutionHistory((prev) => [result, ...prev].slice(0, 50));
      onExecutionComplete?.(result);
      return;
    }

    const nodeId = order[index];
    const node = nodes.find((n) => n.id === nodeId);

    if (!node) {
      currentIndexRef.current++;
      executeNextNode();
      return;
    }

    if (node.isDeactivated) {
      setNodeStatus(nodeId, 'skipped');
      currentIndexRef.current++;
      executeNextNode();
      return;
    }

    setNodeStatus(nodeId, 'running');

    executionTimerRef.current = setTimeout(() => {
      const hasError = Math.random() < 0.1;
      setNodeStatus(nodeId, hasError ? 'error' : 'success');

      if (hasError) {
        const error = `Execution failed for node: ${node.title}`;
        onExecutionError?.(error);
      }

      currentIndexRef.current++;
      executeNextNode();
    }, 500 + Math.random() * 1000);
  }, [currentExecutionId, logs, nodeStatuses, nodes, onExecutionComplete, onExecutionError, setNodeStatus, startTime]);

  const startExecution = useCallback(() => {
    if (executionState === 'running') return;

    const executionId = generateExecutionId();
    const now = Date.now();

    executionOrderRef.current = buildExecutionOrder(nodes, connections);
    currentIndexRef.current = 0;
    isPausedRef.current = false;

    setCurrentExecutionId(executionId);
    setStartTime(now);
    setExecutionState('running');
    setNodeStatuses({});
    setLogs([]);

    nodes.forEach((node) => {
      if (!node.isDeactivated) {
        setNodeStatus(node.id, 'waiting');
      }
    });

    onExecutionStart?.();
    executeNextNode();
  }, [connections, executionState, executeNextNode, nodes, onExecutionStart, setNodeStatus]);

  const stopExecution = useCallback(() => {
    if (executionTimerRef.current) {
      clearTimeout(executionTimerRef.current);
      executionTimerRef.current = null;
    }

    setExecutionState('idle');
    isPausedRef.current = false;
  }, []);

  const pauseExecution = useCallback(() => {
    if (executionState !== 'running') return;

    isPausedRef.current = true;
    setExecutionState('paused');

    if (executionTimerRef.current) {
      clearTimeout(executionTimerRef.current);
      executionTimerRef.current = null;
    }
  }, [executionState]);

  const resumeExecution = useCallback(() => {
    if (executionState !== 'paused') return;

    isPausedRef.current = false;
    setExecutionState('running');
    executeNextNode();
  }, [executionState, executeNextNode]);

  const resetExecution = useCallback(() => {
    stopExecution();
    setExecutionState('idle');
    setNodeStatuses({});
    setLogs([]);
    setCurrentExecutionId(null);
    setStartTime(null);
  }, [stopExecution]);

  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
  }, []);

  useEffect(() => {
    return () => {
      if (executionTimerRef.current) {
        clearTimeout(executionTimerRef.current);
      }
    };
  }, []);

  return {
    executionState,
    nodeStatuses,
    progress,
    logs,
    currentExecutionId,
    startTime,
    isExecuting: executionState === 'running',
    canExecute: executionState === 'idle' || executionState === 'completed' || executionState === 'error',
    executionHistory,
    startExecution,
    stopExecution,
    pauseExecution,
    resumeExecution,
    resetExecution,
    getNodeStatus,
    setNodeStatus,
    clearHistory,
  };
}
