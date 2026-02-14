/**
 * ============================================================================
 * USE SELECTION HOOK
 * ============================================================================
 *
 * PURPOSE:
 * Manages multi-selection state for nodes and connections in the workflow canvas.
 * Supports single click, Shift+click (toggle), Ctrl/Cmd+click (add to selection),
 * and box selection (drag to select multiple items).
 *
 * ARCHITECTURE:
 * - Maintains separate Sets for selected node IDs and connection IDs
 * - Uses Set data structure for O(1) lookup and deduplication
 * - Provides selection box coordinates for visual feedback during drag-selection
 *
 * USAGE:
 * ```tsx
 * const {
 *   selectedNodeIds,
 *   selectedConnectionIds,
 *   isNodeSelected,
 *   handleNodeClick,
 *   handleSelectionBoxStart,
 *   handleSelectionBoxMove,
 *   handleSelectionBoxEnd,
 *   clearSelection,
 * } = useSelection();
 * ```
 *
 * SELECTION MODES:
 * - Single click: Replaces current selection with clicked item
 * - Shift + click: Toggles item in selection (add if not present, remove if present)
 * - Ctrl/Cmd + click: Adds item to current selection
 * - Box drag: Selects all items within the dragged rectangle
 *
 * @author Open Agent Artel Team
 * @version 1.0.0
 * ============================================================================
 */

import { useState, useCallback, useRef } from 'react';
import type { NodeData, Connection } from '@/types';

export interface SelectionBox {
  /** Whether a selection box is currently being dragged */
  isActive: boolean;
  /** Start position in canvas coordinates */
  startX: number;
  /** Start position in canvas coordinates */
  startY: number;
  /** Current position in canvas coordinates */
  currentX: number;
  /** Current position in canvas coordinates */
  currentY: number;
}

export interface UseSelectionOptions {
  /** Called when selection changes */
  onSelectionChange?: (nodeIds: Set<string>, connectionIds: Set<string>) => void;
  /** Maximum number of items that can be selected (-1 for unlimited) */
  maxSelection?: number;
}

export interface UseSelectionReturn {
  // Selection state
  /** Set of currently selected node IDs */
  selectedNodeIds: Set<string>;
  /** Set of currently selected connection IDs */
  selectedConnectionIds: Set<string>;
  /** Whether a selection box is currently active */
  selectionBox: SelectionBox;

  // Selection queries
  /** Check if a node is selected */
  isNodeSelected: (nodeId: string) => boolean;
  /** Check if a connection is selected */
  isConnectionSelected: (connectionId: string) => boolean;
  /** Get count of selected items */
  selectionCount: number;
  /** Whether any items are selected */
  hasSelection: boolean;

  // Selection actions
  /** Handle node click with modifier key support */
  handleNodeClick: (nodeId: string, event?: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void;
  /** Handle connection click with modifier key support */
  handleConnectionClick: (connectionId: string, event?: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void;
  /** Start a selection box drag */
  handleSelectionBoxStart: (x: number, y: number) => void;
  /** Update selection box during drag */
  handleSelectionBoxMove: (x: number, y: number) => void;
  /** End selection box and select items within */
  handleSelectionBoxEnd: (nodes: NodeData[], connections: Connection[], isAdditive?: boolean) => void;
  /** Select all nodes and connections */
  selectAll: (nodes: NodeData[], connections: Connection[]) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Remove specific node from selection */
  deselectNode: (nodeId: string) => void;
  /** Remove specific connection from selection */
  deselectConnection: (connectionId: string) => void;
}

export function useSelection(options: UseSelectionOptions = {}): UseSelectionReturn {
  const { onSelectionChange, maxSelection = -1 } = options;

  // Selection state using Sets for efficient lookups
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<Set<string>>(new Set());

  // Selection box state for drag-to-select
  const [selectionBox, setSelectionBox] = useState<SelectionBox>({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  // Refs for tracking selection box without re-renders during drag
  const selectionBoxRef = useRef(selectionBox);
  selectionBoxRef.current = selectionBox;

  /**
   * Notify parent of selection changes
   */
  const notifySelectionChange = useCallback(
    (newNodeIds: Set<string>, newConnectionIds: Set<string>) => {
      onSelectionChange?.(newNodeIds, newConnectionIds);
    },
    [onSelectionChange]
  );

  /**
   * Check if a node is currently selected
   */
  const isNodeSelected = useCallback(
    (nodeId: string) => selectedNodeIds.has(nodeId),
    [selectedNodeIds]
  );

  /**
   * Check if a connection is currently selected
   */
  const isConnectionSelected = useCallback(
    (connectionId: string) => selectedConnectionIds.has(connectionId),
    [selectedConnectionIds]
  );

  /**
   * Handle node click with modifier key support
   *
   * SELECTION BEHAVIOR:
   * - No modifiers: Replace selection with this node only
   * - Shift: Toggle this node in selection
   * - Ctrl/Cmd: Add this node to selection
   */
  const handleNodeClick = useCallback(
    (nodeId: string, event?: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
      const isShift = event?.shiftKey ?? false;
      const isCtrl = (event?.ctrlKey || event?.metaKey) ?? false;

      setSelectedNodeIds((prev) => {
        const newSet = new Set(prev);

        if (isShift) {
          // Shift + click: Toggle selection
          if (newSet.has(nodeId)) {
            newSet.delete(nodeId);
          } else if (maxSelection === -1 || newSet.size < maxSelection) {
            newSet.add(nodeId);
          }
        } else if (isCtrl) {
          // Ctrl/Cmd + click: Add to selection
          if (!newSet.has(nodeId) && (maxSelection === -1 || newSet.size < maxSelection)) {
            newSet.add(nodeId);
          }
        } else {
          // Normal click: Replace selection
          newSet.clear();
          newSet.add(nodeId);
          // Clear connection selection when selecting single node
          setSelectedConnectionIds(new Set());
        }

        // Notify after state update
        setTimeout(() => notifySelectionChange(newSet, selectedConnectionIds), 0);
        return newSet;
      });
    },
    [maxSelection, notifySelectionChange, selectedConnectionIds]
  );

  /**
   * Handle connection click with modifier key support
   * Same behavior as node click
   */
  const handleConnectionClick = useCallback(
    (connectionId: string, event?: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
      const isShift = event?.shiftKey ?? false;
      const isCtrl = (event?.ctrlKey || event?.metaKey) ?? false;

      setSelectedConnectionIds((prev) => {
        const newSet = new Set(prev);

        if (isShift) {
          // Toggle selection
          if (newSet.has(connectionId)) {
            newSet.delete(connectionId);
          } else if (maxSelection === -1 || newSet.size < maxSelection) {
            newSet.add(connectionId);
          }
        } else if (isCtrl) {
          // Add to selection
          if (!newSet.has(connectionId) && (maxSelection === -1 || newSet.size < maxSelection)) {
            newSet.add(connectionId);
          }
        } else {
          // Replace selection
          newSet.clear();
          newSet.add(connectionId);
          // Clear node selection when selecting single connection
          setSelectedNodeIds(new Set());
        }

        setTimeout(() => notifySelectionChange(selectedNodeIds, newSet), 0);
        return newSet;
      });
    },
    [maxSelection, notifySelectionChange, selectedNodeIds]
  );

  /**
   * Start a selection box drag
   * Call this when user starts dragging on empty canvas area
   */
  const handleSelectionBoxStart = useCallback((x: number, y: number) => {
    setSelectionBox({
      isActive: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });
  }, []);

  /**
   * Update selection box during drag
   */
  const handleSelectionBoxMove = useCallback((x: number, y: number) => {
    if (!selectionBoxRef.current.isActive) return;

    setSelectionBox((prev) => ({
      ...prev,
      currentX: x,
      currentY: y,
    }));
  }, []);

  /**
   * End selection box and select items within
   *
   * SELECTION BOX LOGIC:
   * - Calculates the bounding box from start to current position
   * - Selects nodes whose center point falls within the box
   * - Selects connections whose midpoint falls within the box
   * - If Shift is held, adds to existing selection instead of replacing
   */
  const handleSelectionBoxEnd = useCallback(
    (nodes: NodeData[], _connections: Connection[], isAdditive = false) => {
      const box = selectionBoxRef.current;
      if (!box.isActive) return;

      // Calculate selection box bounds (handle negative dimensions)
      const minX = Math.min(box.startX, box.currentX);
      const maxX = Math.max(box.startX, box.currentX);
      const minY = Math.min(box.startY, box.currentY);
      const maxY = Math.max(box.startY, box.currentY);

      // Find nodes within selection box (check center point)
      const nodeIdsInBox = new Set<string>();
      nodes.forEach((node) => {
        const centerX = node.position.x + 100; // Half of node width (200)
        const centerY = node.position.y + 50; // Half of node height (100)
        if (centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY) {
          nodeIdsInBox.add(node.id);
        }
      });

      // Update node selection
      setSelectedNodeIds((prev) => {
        const newSet = isAdditive ? new Set(prev) : new Set<string>();
        nodeIdsInBox.forEach((id) => {
          if (maxSelection === -1 || newSet.size < maxSelection) {
            newSet.add(id);
          }
        });
        setTimeout(() => notifySelectionChange(newSet, selectedConnectionIds), 0);
        return newSet;
      });

      // Reset selection box
      setSelectionBox({
        isActive: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
    },
    [maxSelection, notifySelectionChange, selectedConnectionIds]
  );

  /**
   * Select all nodes and connections
   */
  const selectAll = useCallback(
    (nodes: NodeData[], connections: Connection[]) => {
      const allNodeIds = new Set(nodes.map((n) => n.id));
      const allConnectionIds = new Set(connections.map((c) => c.id));

      setSelectedNodeIds(allNodeIds);
      setSelectedConnectionIds(allConnectionIds);
      notifySelectionChange(allNodeIds, allConnectionIds);
    },
    [notifySelectionChange]
  );

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedNodeIds(new Set());
    setSelectedConnectionIds(new Set());
    notifySelectionChange(new Set(), new Set());
  }, [notifySelectionChange]);

  /**
   * Deselect a specific node
   */
  const deselectNode = useCallback(
    (nodeId: string) => {
      setSelectedNodeIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        setTimeout(() => notifySelectionChange(newSet, selectedConnectionIds), 0);
        return newSet;
      });
    },
    [notifySelectionChange, selectedConnectionIds]
  );

  /**
   * Deselect a specific connection
   */
  const deselectConnection = useCallback(
    (connectionId: string) => {
      setSelectedConnectionIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        setTimeout(() => notifySelectionChange(selectedNodeIds, newSet), 0);
        return newSet;
      });
    },
    [notifySelectionChange, selectedNodeIds]
  );

  // Computed values
  const selectionCount = selectedNodeIds.size + selectedConnectionIds.size;
  const hasSelection = selectionCount > 0;

  return {
    // State
    selectedNodeIds,
    selectedConnectionIds,
    selectionBox,

    // Queries
    isNodeSelected,
    isConnectionSelected,
    selectionCount,
    hasSelection,

    // Actions
    handleNodeClick,
    handleConnectionClick,
    handleSelectionBoxStart,
    handleSelectionBoxMove,
    handleSelectionBoxEnd,
    selectAll,
    clearSelection,
    deselectNode,
    deselectConnection,
  };
}
