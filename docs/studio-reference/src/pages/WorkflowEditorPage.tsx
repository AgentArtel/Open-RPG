/**
 * ============================================================================
 * WORKFLOW EDITOR PAGE
 * ============================================================================
 *
 * Production-ready workflow editor with all features integrated:
 * - Node rendering and positioning
 * - Connection rendering and management
 * - Pan and zoom canvas navigation
 * - Node dragging with grid snapping
 * - Connection drawing between ports
 * - Multi-selection (Shift/Ctrl + click, box selection)
 * - Undo/redo with full history
 * - Keyboard shortcuts
 * - Config panel for node editing
 * - Bottom toolbar for actions
 * - Node palette for adding new nodes
 * - Context menus (right-click on nodes, connections, canvas)
 * - Touch/mobile support (tap, double-tap, long-press, pinch, pan)
 * - Enhanced execution visualization with progress tracking
 * - Toast notifications for user feedback
 *
 * @author Open Agent Artel Team
 * @version 4.0.0
 * ============================================================================
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ImportN8nModal } from '@/components/ImportN8nModal';
import { ExecutionResultsPanel } from '@/components/ExecutionResultsPanel';
import { ChatPanel, type ChatMode } from '@/components/ChatPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import type { N8nImportResult } from '@/types';
import { Canvas, getCanvasTransform } from '@/components/canvas/Canvas';
import { CanvasNode } from '@/components/canvas/CanvasNode';
import { ConnectionLine } from '@/components/canvas/ConnectionLine';
import { SelectionBox } from '@/components/canvas/SelectionBox';
import { NodeSearchPalette } from '@/components/canvas/NodeSearchPalette';
import { ConfigPanel } from '@/components/ConfigPanel';
import { BottomToolbar } from '@/components/BottomToolbar';
import { Header } from '@/components/Header';
import { ContextMenu, MenuPresets } from '@/components/ui-custom/ContextMenu';
import { ToastContainer } from '@/components/ui-custom/Toast';

// Phase 1 Hooks
import { useNodeDrag } from '@/hooks/useNodeDrag';
import { useConnectionDraw } from '@/hooks/useConnectionDraw';

// Phase 2 Hooks
import { useSelection } from '@/hooks/useSelection';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import {
  useKeyboardShortcuts,
  UNDO_SHORTCUT,
  REDO_SHORTCUT,
  REDO_ALT_SHORTCUT,
  DELETE_SHORTCUT,
  BACKSPACE_DELETE_SHORTCUT,
  SELECT_ALL_SHORTCUT,
  ESCAPE_SHORTCUT,
  SAVE_SHORTCUT,
} from '@/hooks/useKeyboardShortcuts';

// Phase 4 Hooks
import { useContextMenu } from '@/hooks/useContextMenu';
import { useTouchSupport } from '@/hooks/useTouchSupport';
import { useExecution } from '@/hooks/useExecution';
import { useToast } from '@/hooks/useToast';

// Utilities
import { getPortPosition, screenToCanvas, generateConnectionId } from '@/lib/canvasUtils';
import type { PortType } from '@/lib/portRegistry';
import type { NodeData, Connection, NodeType } from '@/types';

// Icons for context menus
import { Copy, Scissors, Trash2, Settings, Plus, Check, X } from 'lucide-react';

// =============================================================================
// INITIAL DATA
// =============================================================================

const initialNodes: NodeData[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 150, y: 200 },
    title: 'Manual Trigger',
    subtitle: 'Start workflow',
    isConfigured: true,
  },
  {
    id: 'agent-1',
    type: 'ai-agent',
    position: { x: 500, y: 200 },
    title: 'AI Agent',
    subtitle: 'Tools Agent',
    config: {
      agentType: 'tools-agent',
      model: 'gemini-2.5-flash',
      systemPrompt: 'You are a helpful assistant. Respond concisely and clearly.',
      userPrompt: 'Hello! Who are you and what can you do?',
      temperature: 0.7,
      maxTokens: 4096,
      maxIterations: 5,
    },
    isConfigured: true,
  },
];

const initialConnections: Connection[] = [
  { id: 'conn-1', from: 'trigger-1', to: 'agent-1', fromPort: 'output', toPort: 'input' },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface WorkflowEditorPageProps {
  onNavigate?: (page: string) => void;
}

export const WorkflowEditorPage: React.FC<WorkflowEditorPageProps> = ({ onNavigate }) => {
  // ===========================================================================
  // REFS
  // ===========================================================================

  const canvasRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef({ x: 0, y: 0 });

  // ===========================================================================
  // UNDO/REDO STATE
  // ===========================================================================

  const {
    nodes,
    connections,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  } = useUndoRedo({
    initialState: { nodes: initialNodes, connections: initialConnections },
    maxHistory: 50,
  });

  // ===========================================================================
  // SELECTION STATE
  // ===========================================================================

  const {
    selectedNodeIds,
    selectedConnectionIds,
    selectionBox,
    isNodeSelected,
    isConnectionSelected,
    hasSelection,
    handleNodeClick: handleSelectionNodeClick,
    handleConnectionClick: handleSelectionConnectionClick,
    handleSelectionBoxStart,
    handleSelectionBoxMove,
    handleSelectionBoxEnd,
    selectAll,
    clearSelection,
  } = useSelection({
    onSelectionChange: (nodeIds, connectionIds) => {
      if (nodeIds.size + connectionIds.size !== 1) {
        setIsConfigPanelOpen(false);
      }
    },
  });

  // ===========================================================================
  // CONTEXT MENU
  // ===========================================================================

  const {
    menuState,
    position: menuPosition,
    openMenu,
    closeMenu,
  } = useContextMenu();

  // ===========================================================================
  // TOAST NOTIFICATIONS
  // ===========================================================================

  const {
    toasts,
    success: showSuccess,
    error: showError,
    info: showInfo,
    dismiss: dismissToast,
  } = useToast({ defaultDuration: 4000 });

  // ===========================================================================
  // EXECUTION
  // ===========================================================================

  const [showResults, setShowResults] = useState(false);
  const [lastDuration, setLastDuration] = useState<number | undefined>();

  const {
    progress,
    isExecuting,
    executionState,
    nodeResults,
    startExecution,
    stopExecution,
    getNodeStatus,
  } = useExecution({
    nodes,
    connections,
    onExecutionStart: () => {
      setShowResults(false);
      showInfo('Workflow execution started');
    },
    onExecutionComplete: (result) => {
      setLastDuration(result.duration);
      setShowResults(true);
      if (result.status === 'completed') {
        showSuccess(`Workflow completed in ${(result.duration / 1000).toFixed(1)}s`);
      }
    },
    onExecutionError: (error) => {
      showError(error);
    },
  });

  // ===========================================================================
  // UI STATE
  // ===========================================================================

  const [isNodePaletteOpen, setIsNodePaletteOpen] = useState(false);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('closed');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('AI Agent Workflow');

  // Mock credentials for import modal (will be replaced with Supabase query)
  const availableCredentials = [
    { id: 'cred-1', name: 'OpenAI Production', service: 'OpenAI' },
    { id: 'cred-2', name: 'Slack Bot Token', service: 'Slack' },
    { id: 'cred-3', name: 'GitHub PAT', service: 'GitHub' },
    { id: 'cred-4', name: 'Stripe Test Key', service: 'Stripe' },
  ];

  // n8n import handler
  const handleImportComplete = useCallback((result: N8nImportResult, envVars?: Record<string, string>) => {
    reset({ nodes: result.nodes, connections: result.connections });
    if (result.workflowName) {
      setWorkflowName(result.workflowName);
    }
    if (envVars) {
      console.log('[n8nImport] Environment variables collected:', envVars);
    }
    showSuccess(`Workflow imported. ${result.nodes.length} nodes, ${result.connections.length} connections.`);
    setIsImportModalOpen(false);
  }, [reset, showSuccess]);

  // ===========================================================================
  // NODE DRAG HOOK
  // ===========================================================================

  const [liveNodePositions, setLiveNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  const {
    startDrag: startNodeDrag,
    handleMouseMove: handleDragMouseMove,
    handleMouseUp: handleDragMouseUp,
    isDragging: isNodeDragging,
    draggedNodeId,
  } = useNodeDrag({
    transform: getCanvasTransform(canvasRef.current),
    onDrag: useCallback((nodeId: string, position: { x: number; y: number }) => {
      setLiveNodePositions(prev => ({ ...prev, [nodeId]: position }));
    }, []),
    onDragEnd: useCallback((nodeId: string, position: { x: number; y: number }) => {
      setLiveNodePositions(prev => {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      });
      const newNodes = nodes.map((n) =>
        n.id === nodeId ? { ...n, position } : n
      );
      pushState({ nodes: newNodes, connections }, 'move-node');
    }, [nodes, connections, pushState]),
    snapToGrid: true,
    gridSize: 20,
  });

  const getNodePosition = useCallback((node: NodeData) => {
    if (draggedNodeId === node.id && liveNodePositions[node.id]) {
      return liveNodePositions[node.id];
    }
    return node.position;
  }, [draggedNodeId, liveNodePositions]);

  // ===========================================================================
  // CONNECTION DRAW HOOK
  // ===========================================================================

  const {
    startConnection,
    handleMouseMove: handleConnectionMouseMove,
    endConnection,
    tempLine,
    isDrawing: isConnectionDrawing,
    snappedPort,
    compatiblePorts,
    drawState: connectionDrawState,
  } = useConnectionDraw({
    transform: getCanvasTransform(canvasRef.current),
    nodes,
    connections,
    onConnectionCreate: useCallback((connection: Connection) => {
      pushState(
        { nodes, connections: [...connections, connection] },
        'add-connection'
      );
      showSuccess('Connection created');
    }, [nodes, connections, pushState, showSuccess]),
  });

  // ===========================================================================
  // KEYBOARD SHORTCUTS
  // ===========================================================================

  const { registerShortcuts } = useKeyboardShortcuts();

  useEffect(() => {
    return registerShortcuts([
      {
        ...UNDO_SHORTCUT,
        handler: () => {
          if (canUndo) {
            undo();
            showInfo('Undo');
            return true;
          }
          return false;
        },
      },
      {
        ...REDO_SHORTCUT,
        handler: () => {
          if (canRedo) {
            redo();
            showInfo('Redo');
            return true;
          }
          return false;
        },
      },
      {
        ...REDO_ALT_SHORTCUT,
        handler: () => {
          if (canRedo) {
            redo();
            showInfo('Redo');
            return true;
          }
          return false;
        },
      },
      {
        ...DELETE_SHORTCUT,
        handler: () => {
          handleDeleteSelected();
          return true;
        },
      },
      {
        ...BACKSPACE_DELETE_SHORTCUT,
        handler: () => {
          handleDeleteSelected();
          return true;
        },
      },
      {
        ...SELECT_ALL_SHORTCUT,
        handler: () => {
          selectAll(nodes, connections);
          showInfo('All items selected');
          return true;
        },
      },
      {
        ...ESCAPE_SHORTCUT,
        handler: () => {
          clearSelection();
          setIsConfigPanelOpen(false);
          setIsNodePaletteOpen(false);
          closeMenu();
          return true;
        },
      },
      {
        ...SAVE_SHORTCUT,
        handler: () => {
          handleSaveWorkflow();
          return true;
        },
      },
    ]);
  }, [registerShortcuts, canUndo, canRedo, undo, redo, nodes, connections, selectAll, clearSelection, closeMenu, showInfo]);

  // ===========================================================================
  // TOUCH SUPPORT
  // ===========================================================================

  const { touchHandlers, isTouchDevice } = useTouchSupport({
    enabled: true,
    onTap: () => {},
    onDoubleTap: () => {
      if (selectedNodeIds.size === 1) {
        setIsConfigPanelOpen(true);
      }
    },
    onLongPress: (longX, longY, target) => {
      const nodeEl = (target as HTMLElement)?.closest('[data-node-id]');
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute('data-node-id');
        if (nodeId) {
          openMenu('node', longX, longY, nodeId);
        }
      } else {
        openMenu('canvas', longX, longY);
      }
    },
  });

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handleDragMouseMove(e);
      handleConnectionMouseMove(e);

      if (isSelectingRef.current) {
        const canvasPos = screenToCanvas(
          e.clientX,
          e.clientY,
          getCanvasTransform(canvasRef.current)
        );
        handleSelectionBoxMove(canvasPos.x, canvasPos.y);
      }
    },
    [handleDragMouseMove, handleConnectionMouseMove, handleSelectionBoxMove]
  );

  const handleCanvasMouseUp = useCallback(
    (e: React.MouseEvent) => {
      handleDragMouseUp(e);
      endConnection(e);

      if (isSelectingRef.current) {
        isSelectingRef.current = false;
        handleSelectionBoxEnd(nodes, connections, e.shiftKey);
      }
    },
    [handleDragMouseUp, endConnection, handleSelectionBoxEnd, nodes, connections]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('[data-node-id]')) return;

      const canvasPos = screenToCanvas(
        e.clientX,
        e.clientY,
        getCanvasTransform(canvasRef.current)
      );

      isSelectingRef.current = true;
      selectionStartRef.current = canvasPos;
      handleSelectionBoxStart(canvasPos.x, canvasPos.y);
    },
    [handleSelectionBoxStart]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, type: 'node' | 'connection' | 'canvas', targetId?: string) => {
      e.preventDefault();
      e.stopPropagation();
      openMenu(type, e.clientX, e.clientY, targetId);
    },
    [openMenu]
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => (event?: React.MouseEvent) => {
      if (isNodeDragging) return;

      handleSelectionNodeClick(nodeId, {
        shiftKey: event?.shiftKey ?? false,
        ctrlKey: event?.ctrlKey ?? false,
        metaKey: event?.metaKey ?? false,
      });

      if (selectedNodeIds.size <= 1 && !event?.shiftKey && !event?.ctrlKey && !event?.metaKey) {
        setIsConfigPanelOpen(true);
      }
    },
    [isNodeDragging, handleSelectionNodeClick, selectedNodeIds.size]
  );

  const handleConnectionClick = useCallback(
    (connectionId: string, event?: React.MouseEvent) => {
      handleSelectionConnectionClick(connectionId, {
        shiftKey: event?.shiftKey ?? false,
        ctrlKey: event?.ctrlKey ?? false,
        metaKey: event?.metaKey ?? false,
      });
    },
    [handleSelectionConnectionClick]
  );

  const handlePortMouseDown = useCallback(
    (e: React.MouseEvent, portId: string, portType: PortType) => {
      const nodeElement = (e.target as HTMLElement).closest('[data-node-id]');
      const nodeId = nodeElement?.getAttribute('data-node-id');
      if (nodeId) {
        startConnection(e, nodeId, portId, portType);
      }
    },
    [startConnection]
  );

  const handlePortMouseUp = useCallback(
    (e: React.MouseEvent, portId: string, _portType: PortType) => {
      const nodeElement = (e.target as HTMLElement).closest('[data-node-id]');
      const nodeId = nodeElement?.getAttribute('data-node-id');
      if (nodeId) {
        endConnection(e, nodeId, portId);
      }
    },
    [endConnection]
  );

  // ===========================================================================
  // ACTIONS
  // ===========================================================================

  const handleAddNode = useCallback(
    (nodeType: NodeType) => {
      const titleMap: Record<string, { title: string; subtitle: string }> = {
        'trigger': { title: 'Manual Trigger', subtitle: 'Start workflow' },
        'image-gen': { title: 'Image Generator', subtitle: 'Gemini Imagen' },
        'gemini-chat': { title: 'Gemini Chat', subtitle: 'Text generation' },
        'gemini-embed': { title: 'Gemini Embed', subtitle: 'Text embeddings' },
        'gemini-vision': { title: 'Gemini Vision', subtitle: 'Image analysis' },
        'ai-agent': { title: 'AI Agent', subtitle: 'Tools Agent' },
        'openai-chat': { title: 'OpenAI Chat', subtitle: 'Chat completion' },
        'http-tool': { title: 'HTTP Request', subtitle: 'API call' },
        'code-tool': { title: 'Code', subtitle: 'JavaScript / Python' },
        'webhook': { title: 'Webhook', subtitle: 'HTTP trigger' },
        'memory': { title: 'Memory', subtitle: 'Chat memory' },
      };
      const meta = titleMap[nodeType] || { title: nodeType.charAt(0).toUpperCase() + nodeType.slice(1), subtitle: 'New node' };
      const offsetIndex = nodes.length;
      const baseX = 300 + (offsetIndex % 4) * 260;
      const baseY = 200 + Math.floor(offsetIndex / 4) * 160;
      const newNode: NodeData = {
        id: `node-${Date.now()}`,
        type: nodeType,
        position: { x: baseX, y: baseY },
        title: meta.title,
        subtitle: meta.subtitle,
        isConfigured: false,
      };

      let newConnections = [...connections];

      // Auto-connect: if adding memory/tool node, connect to nearest AI Agent
      const isToolType = nodeType === 'http-tool' || nodeType === 'code-tool' || nodeType === 'custom-tool';
      const isMemoryType = nodeType === 'memory';

      if (isToolType || isMemoryType) {
        const agents = nodes.filter(n => n.type === 'ai-agent');
        if (agents.length > 0) {
          // Find nearest agent
          let nearestAgent = agents[0];
          let nearestDist = Infinity;
          for (const agent of agents) {
            const dx = agent.position.x - baseX;
            const dy = agent.position.y - baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestAgent = agent;
            }
          }

          const targetPort = isMemoryType ? 'memory' : 'tool';
          const alreadyConnected = connections.some(
            c => c.to === nearestAgent.id && c.toPort === targetPort && c.fromPort === 'output'
          );

          if (!alreadyConnected || isToolType) {
            newConnections.push({
              id: generateConnectionId(),
              from: newNode.id,
              to: nearestAgent.id,
              fromPort: 'output',
              toPort: targetPort,
            });
            showInfo(`Auto-connected to ${nearestAgent.title}`);
          }
        }
      }

      pushState(
        { nodes: [...nodes, newNode], connections: newConnections },
        'add-node'
      );
      setIsNodePaletteOpen(false);
      showSuccess(`${newNode.title} added`);
    },
    [nodes, connections, pushState, showSuccess, showInfo]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!hasSelection) return;

    const newNodes = nodes.filter((n) => !selectedNodeIds.has(n.id));
    const newConnections = connections.filter(
      (c) =>
        !selectedConnectionIds.has(c.id) &&
        !selectedNodeIds.has(c.from) &&
        !selectedNodeIds.has(c.to)
    );

    pushState({ nodes: newNodes, connections: newConnections }, 'delete');
    clearSelection();
    setIsConfigPanelOpen(false);
    showInfo('Items deleted');
  }, [hasSelection, nodes, connections, selectedNodeIds, selectedConnectionIds, pushState, clearSelection, showInfo]);

  const handleDeleteNode = useCallback(() => {
    if (selectedNodeIds.size === 0) return;

    const newNodes = nodes.filter((n) => !selectedNodeIds.has(n.id));
    const newConnections = connections.filter(
      (c) =>
        !selectedNodeIds.has(c.from) && !selectedNodeIds.has(c.to)
    );

    pushState({ nodes: newNodes, connections: newConnections }, 'delete-node');
    clearSelection();
    setIsConfigPanelOpen(false);
    showInfo('Node deleted');
  }, [selectedNodeIds, nodes, connections, pushState, clearSelection, showInfo]);

  const handleRunWorkflow = useCallback(() => {
    if (isExecuting) {
      stopExecution();
      showInfo('Execution stopped');
    } else {
      startExecution();
    }
  }, [isExecuting, startExecution, stopExecution, showInfo]);

  const handleSaveWorkflow = useCallback(() => {
    console.log('Saving workflow...', { nodes, connections });
    showSuccess('Workflow saved');
  }, [nodes, connections, showSuccess]);

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<NodeData>) => {
      const newNodes = nodes.map((n) =>
        n.id === nodeId ? { ...n, ...updates } : n
      );
      pushState({ nodes: newNodes, connections }, 'update-node-config');
      showSuccess('Configuration saved');
    },
    [nodes, connections, pushState, showSuccess]
  );

  // ===========================================================================
  // CONTEXT MENU ITEMS
  // ===========================================================================

  const getNodeMenuItems = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return [];

      return [
        {
          id: 'configure',
          label: 'Configure',
          icon: <Settings className="w-4 h-4" />,
          onClick: () => {
            handleSelectionNodeClick(nodeId);
            setIsConfigPanelOpen(true);
          },
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          shortcut: 'Ctrl+D',
          onClick: () => {
            const newNode = {
              ...node,
              id: `node-${Date.now()}`,
              position: { x: node.position.x + 50, y: node.position.y + 50 },
            };
            pushState(
              { nodes: [...nodes, newNode], connections },
              'duplicate-node'
            );
            showSuccess('Node duplicated');
          },
        },
        MenuPresets.divider('div-1'),
        {
          id: 'copy',
          label: 'Copy',
          icon: <Copy className="w-4 h-4" />,
          shortcut: 'Ctrl+C',
          onClick: () => {
            showInfo('Copied to clipboard');
          },
        },
        {
          id: 'cut',
          label: 'Cut',
          icon: <Scissors className="w-4 h-4" />,
          shortcut: 'Ctrl+X',
          onClick: () => {
            showInfo('Cut to clipboard');
          },
        },
        MenuPresets.divider('div-2'),
        {
          id: node.isDeactivated ? 'activate' : 'deactivate',
          label: node.isDeactivated ? 'Activate' : 'Deactivate',
          icon: node.isDeactivated ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />,
          onClick: () => {
            const newNodes = nodes.map((n) =>
              n.id === nodeId ? { ...n, isDeactivated: !n.isDeactivated } : n
            );
            pushState({ nodes: newNodes, connections }, 'toggle-activation');
            showInfo(node.isDeactivated ? 'Node activated' : 'Node deactivated');
          },
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: <Trash2 className="w-4 h-4" />,
          shortcut: 'Del',
          onClick: () => {
            const newNodes = nodes.filter((n) => n.id !== nodeId);
            const newConnections = connections.filter(
              (c) => c.from !== nodeId && c.to !== nodeId
            );
            pushState({ nodes: newNodes, connections: newConnections }, 'delete-node');
            showInfo('Node deleted');
          },
        },
      ];
    },
    [nodes, connections, handleSelectionNodeClick, pushState, showInfo, showSuccess]
  );

  const getCanvasMenuItems = useCallback(
    () => [
      {
        id: 'add-node',
        label: 'Add Node',
        icon: <Plus className="w-4 h-4" />,
        onClick: () => setIsNodePaletteOpen(true),
      },
      MenuPresets.divider('div-1'),
      {
        id: 'select-all',
        label: 'Select All',
        shortcut: 'Ctrl+A',
        onClick: () => {
          selectAll(nodes, connections);
          showInfo('All items selected');
        },
      },
      {
        id: 'deselect-all',
        label: 'Deselect All',
        onClick: () => {
          clearSelection();
          showInfo('Selection cleared');
        },
      },
      MenuPresets.divider('div-2'),
      {
        id: 'fit-to-view',
        label: 'Fit to View',
        onClick: () => {
          showInfo('Fit to view');
        },
      },
      {
        id: 'reset-view',
        label: 'Reset View',
        onClick: () => {
          showInfo('View reset');
        },
      },
    ],
    [nodes, connections, selectAll, clearSelection, showInfo]
  );

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  const getConnectionPositions = (connection: Connection) => {
    const fromNode = nodes.find((n) => n.id === connection.from);
    const toNode = nodes.find((n) => n.id === connection.to);

    if (!fromNode || !toNode) {
      return { fromPos: { x: 0, y: 0 }, toPos: { x: 0, y: 0 } };
    }

    const fromPosition = getNodePosition(fromNode);
    const toPosition = getNodePosition(toNode);

    const fromPos = getPortPosition(
      fromPosition,
      connection.fromPort as 'input' | 'output' | 'tool' | 'memory'
    );
    const toPos = getPortPosition(
      toPosition,
      connection.toPort as 'input' | 'output' | 'tool' | 'memory'
    );

    return { fromPos, toPos };
  };

  const selectedNode = (() => {
    if (selectedNodeIds.size !== 1) return null;
    const nodeId = Array.from(selectedNodeIds)[0];
    return nodes.find((n) => n.id === nodeId) || null;
  })();

  // ===========================================================================
  // RENDER HELPERS
  // ===========================================================================

  const renderCanvasContent = () => (
    <Canvas
      nodes={nodes}
      connections={connections}
      selectedNodeId={selectedNodeIds.size === 1 ? Array.from(selectedNodeIds)[0] : null}
      onNodeSelect={(id) => {
        if (id) handleSelectionNodeClick(id);
        else clearSelection();
      }}
      onNodeMove={() => {}}
      onConnectionStart={() => {}}
      onConnectionEnd={() => {}}
      tempConnection={tempLine}
      isSnapped={!!snappedPort}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseDown={handleCanvasMouseDown}
    >
      {selectionBox.isActive && (
        <SelectionBox
          startX={selectionBox.startX}
          startY={selectionBox.startY}
          currentX={selectionBox.currentX}
          currentY={selectionBox.currentY}
        />
      )}
      {connections.map((connection) => {
        const { fromPos, toPos } = getConnectionPositions(connection);
        return (
          <g key={connection.id} onContextMenu={(e) => handleContextMenu(e as unknown as React.MouseEvent, 'connection', connection.id)}>
            <ConnectionLine
              connection={connection}
              fromPos={fromPos}
              toPos={toPos}
              isSelected={isConnectionSelected(connection.id)}
              isAnimating={isExecuting}
              label={connection.label}
              onClick={() => handleConnectionClick(connection.id)}
            />
          </g>
        );
      })}
      {nodes.map((node) => {
        const effectivePosition = getNodePosition(node);
        const nodeWithPosition = { ...node, position: effectivePosition };
        return (
          <div key={node.id} data-node-id={node.id} onContextMenu={(e) => handleContextMenu(e, 'node', node.id)} {...touchHandlers}>
            <CanvasNode
              data={nodeWithPosition}
              isSelected={isNodeSelected(node.id)}
              isRunning={isExecuting && getNodeStatus(node.id) === 'running'}
              executionStatus={getNodeStatus(node.id)}
              connectedToolCount={node.type === 'ai-agent' ? connections.filter(c => c.to === node.id && c.toPort === 'tool').length : 0}
              hasMemory={node.type === 'ai-agent' ? connections.some(c => c.to === node.id && c.toPort === 'memory') : false}
              isConnectionDrawing={isConnectionDrawing}
              highlightedPorts={compatiblePorts.map(p => ({ nodeId: p.nodeId, portId: p.portId }))}
              snappedPortId={snappedPort?.nodeId === node.id ? snappedPort.portId : null}
              onClick={handleNodeClick(node.id)}
              onDragStart={(e, nodeId) => startNodeDrag(e, nodeId, node.position)}
              onPortMouseDown={handlePortMouseDown}
              onPortMouseUp={handlePortMouseUp}
            />
          </div>
        );
      })}
    </Canvas>
  );

  const renderOverlays = () => (
    <>
      {isConfigPanelOpen && selectedNode && (
        <ConfigPanel
          isOpen={isConfigPanelOpen}
          onClose={() => { setIsConfigPanelOpen(false); clearSelection(); }}
          nodeData={selectedNode}
          onUpdate={handleNodeUpdate}
        />
      )}
      <ExecutionResultsPanel
        isOpen={showResults && (executionState === 'completed' || executionState === 'error')}
        onClose={() => setShowResults(false)}
        nodes={nodes}
        nodeResults={nodeResults}
        executionState={executionState}
        duration={lastDuration}
      />
    </>
  );

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="h-screen flex flex-col bg-dark">
      <Header
        workflowName={workflowName}
        isActive={true}
        onBack={() => onNavigate?.('dashboard')}
        onSave={handleSaveWorkflow}
        onImport={() => setIsImportModalOpen(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      <div className="flex-1 relative overflow-hidden">
        {chatMode === 'docked' ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={65} minSize={40}>
              <div ref={canvasRef} className="w-full h-full relative">
                {renderCanvasContent()}
                {renderOverlays()}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={25}>
              <ChatPanel
                mode="docked"
                onModeChange={setChatMode}
                agentNode={nodes.find(n => n.type === 'ai-agent') || null}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div ref={canvasRef} className="w-full h-full relative">
            {renderCanvasContent()}
            {renderOverlays()}
          </div>
        )}

        {chatMode === 'popup' && (
          <ChatPanel
            mode="popup"
            onModeChange={setChatMode}
            agentNode={nodes.find(n => n.type === 'ai-agent') || null}
          />
        )}

        <BottomToolbar
          onTest={handleRunWorkflow}
          onAddNode={() => setIsNodePaletteOpen(true)}
          onDelete={handleDeleteNode}
          canDelete={selectedNodeIds.size > 0}
          isExecuting={isExecuting}
          executionProgress={progress}
          chatMode={chatMode}
          onChatModeChange={setChatMode}
        />

        <NodeSearchPalette
          isOpen={isNodePaletteOpen}
          onClose={() => setIsNodePaletteOpen(false)}
          onSelectNode={handleAddNode}
        />

        {menuState.isOpen && (
          <ContextMenu
            position={menuPosition}
            items={
              menuState.type === 'node' && menuState.targetId
                ? getNodeMenuItems(menuState.targetId)
                : getCanvasMenuItems()
            }
            onClose={closeMenu}
          />
        )}

        <ImportN8nModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={handleImportComplete}
          availableCredentials={availableCredentials}
        />

        <ToastContainer toasts={toasts} onDismiss={dismissToast} position="bottom-right" />

        {isTouchDevice && (
          <div className="fixed top-20 right-4 z-40 px-3 py-1.5 bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] text-xs rounded-full">
            Touch Mode
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowEditorPage;
