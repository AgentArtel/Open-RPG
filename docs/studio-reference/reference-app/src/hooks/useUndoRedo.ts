/**
 * ============================================================================
 * USE UNDO/REDO HOOK
 * ============================================================================
 *
 * PURPOSE:
 * Implements a complete undo/redo system using the Command pattern with a
 * history stack. Supports unlimited undo levels with memory-efficient state
 * snapshots.
 *
 * ARCHITECTURE:
 * - Uses a history stack (array) to store state snapshots
 * - Maintains a pointer to the current position in history
 * - Each action creates a new snapshot and pushes it to the stack
 * - Undo moves the pointer back, redo moves it forward
 * - When new action occurs after undo, future history is discarded
 *
 * STATE SNAPSHOT STRATEGY:
 * - Stores complete state snapshots (nodes + connections)
 * - Future optimization: Could use delta-based snapshots for large workflows
 * - Current implementation suitable for workflows with < 1000 nodes
 *
 * USAGE:
 * ```tsx
 * const { state, undo, redo, canUndo, canRedo, pushState, reset } = useUndoRedo({
 *   initialState: { nodes: [], connections: [] },
 *   maxHistory: 50, // Optional: limit history size
 * });
 *
 * // Push new state after user action
 * pushState({ nodes: newNodes, connections: newConnections });
 *
 * // Undo/redo
 * undo(); // Reverts to previous state
 * redo(); // Re-applies undone state
 * ```
 *
 * KEYBOARD SHORTCUTS (to be wired up separately):
 * - Cmd/Ctrl + Z: Undo
 * - Cmd/Ctrl + Shift + Z: Redo
 * - Cmd/Ctrl + Y: Redo (alternative)
 *
 * @author Open Agent Artel Team
 * @version 1.0.0
 * ============================================================================
 */

import { useState, useCallback, useRef } from 'react';
import type { NodeData, Connection } from '@/types';

/**
 * State snapshot structure
 * Stores a complete copy of the workflow state at a point in time
 */
export interface WorkflowState {
  /** Array of all nodes in the workflow */
  nodes: NodeData[];
  /** Array of all connections between nodes */
  connections: Connection[];
  /** Optional timestamp for debugging/auditing */
  timestamp?: number;
  /** Optional action description for debugging */
  action?: string;
}

/**
 * History entry with metadata
 */
export interface HistoryEntry extends WorkflowState {
  /** Unique ID for this history entry */
  id: string;
  /** Timestamp when this entry was created */
  timestamp: number;
  /** Description of the action that created this state */
  action: string;
}

export interface UseUndoRedoOptions {
  /** Initial state to populate the history stack */
  initialState: WorkflowState;
  /** Maximum number of history entries to keep (-1 for unlimited) */
  maxHistory?: number;
  /** Callback fired when state changes via undo/redo */
  onStateChange?: (state: WorkflowState, action: 'undo' | 'redo' | 'push') => void;
  /** Callback fired when history changes (new entry, undo, redo) */
  onHistoryChange?: (history: HistoryEntry[], currentIndex: number) => void;
}

export interface UseUndoRedoReturn {
  // Current state
  /** Current state at the current history position */
  state: WorkflowState;
  /** Current nodes (convenience accessor) */
  nodes: NodeData[];
  /** Current connections (convenience accessor) */
  connections: Connection[];

  // History info
  /** Full history stack for debugging/auditing */
  history: HistoryEntry[];
  /** Current position in history (0 = initial state) */
  currentIndex: number;
  /** Total number of history entries */
  historyLength: number;

  // Undo/redo capabilities
  /** Whether undo is possible (not at beginning of history) */
  canUndo: boolean;
  /** Whether redo is possible (not at end of history) */
  canRedo: boolean;
  /** Number of undo steps available */
  undoCount: number;
  /** Number of redo steps available */
  redoCount: number;

  // Actions
  /**
   * Push a new state to history
   * @param newState - The new state to push
   * @param action - Description of the action (for debugging/auditing)
   */
  pushState: (newState: WorkflowState, action?: string) => void;
  /** Undo the last action (move back in history) */
  undo: () => void;
  /** Redo a previously undone action (move forward in history) */
  redo: () => void;
  /** Jump to a specific point in history */
  jumpTo: (index: number) => void;
  /** Clear all history and reset to initial state */
  reset: (initialState?: WorkflowState) => void;
  /** Get a specific history entry by index */
  getHistoryEntry: (index: number) => HistoryEntry | undefined;
}

/**
 * Generate a unique ID for history entries
 */
function generateHistoryId(): string {
  return `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone state to prevent accidental mutations
 * This ensures history snapshots are immutable
 */
function cloneState(state: WorkflowState): WorkflowState {
  return {
    nodes: state.nodes.map((n) => ({ ...n })),
    connections: state.connections.map((c) => ({ ...c })),
    timestamp: state.timestamp,
    action: state.action,
  };
}

export function useUndoRedo(options: UseUndoRedoOptions): UseUndoRedoReturn {
  const { initialState, maxHistory = -1, onStateChange, onHistoryChange } = options;

  // Initialize history with the initial state
  const initialEntry: HistoryEntry = {
    ...cloneState(initialState),
    id: generateHistoryId(),
    timestamp: Date.now(),
    action: 'initial',
  };

  // History stack - array of state snapshots
  const [history, setHistory] = useState<HistoryEntry[]>([initialEntry]);

  // Current position in history (index of the active state)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Refs for accessing current values in callbacks without stale closures
  const historyRef = useRef(history);
  const currentIndexRef = useRef(currentIndex);

  historyRef.current = history;
  currentIndexRef.current = currentIndex;

  /**
   * Push a new state to history
   *
   * BEHAVIOR:
   * 1. Clones the provided state to prevent mutations
   * 2. Creates a new history entry with metadata
   * 3. If we're not at the end of history, discards future entries
   * 4. Adds new entry to history
   * 5. Enforces maxHistory limit if set
   * 6. Moves current index to the new entry
   *
   * @param newState - The new state to push
   * @param action - Description of the action (e.g., 'add-node', 'move-node', 'delete-connection')
   */
  const pushState = useCallback(
    (newState: WorkflowState, action: string = 'unknown') => {
      const currentHistory = historyRef.current;
      const currentIdx = currentIndexRef.current;

      // Create new history entry
      const newEntry: HistoryEntry = {
        ...cloneState(newState),
        id: generateHistoryId(),
        timestamp: Date.now(),
        action,
      };

      // Discard future history if we're not at the end
      // This happens when user undoes, then makes a new change
      const newHistory = currentHistory.slice(0, currentIdx + 1);

      // Add new entry
      newHistory.push(newEntry);

      // Enforce max history limit
      if (maxHistory > 0 && newHistory.length > maxHistory) {
        // Remove oldest entries (but keep initial state at index 0)
        const entriesToRemove = newHistory.length - maxHistory;
        newHistory.splice(1, entriesToRemove);
      }

      // Update state
      setHistory(newHistory);
      setCurrentIndex(newHistory.length - 1);

      // Notify listeners
      onStateChange?.(newState, 'push');
      onHistoryChange?.(newHistory, newHistory.length - 1);
    },
    [maxHistory, onStateChange, onHistoryChange]
  );

  /**
   * Undo the last action
   *
   * BEHAVIOR:
   * 1. Decrements current index (if not at beginning)
   * 2. Returns state at the new current index
   * 3. Notifies listeners of state change
   */
  const undo = useCallback(() => {
    const currentIdx = currentIndexRef.current;

    // Can't undo if at the beginning
    if (currentIdx <= 0) return;

    const newIndex = currentIdx - 1;
    const newState = historyRef.current[newIndex];

    setCurrentIndex(newIndex);
    onStateChange?.(newState, 'undo');
    onHistoryChange?.(historyRef.current, newIndex);
  }, [onStateChange, onHistoryChange]);

  /**
   * Redo a previously undone action
   *
   * BEHAVIOR:
   * 1. Increments current index (if not at end)
   * 2. Returns state at the new current index
   * 3. Notifies listeners of state change
   */
  const redo = useCallback(() => {
    const currentIdx = currentIndexRef.current;
    const currentHistory = historyRef.current;

    // Can't redo if at the end
    if (currentIdx >= currentHistory.length - 1) return;

    const newIndex = currentIdx + 1;
    const newState = currentHistory[newIndex];

    setCurrentIndex(newIndex);
    onStateChange?.(newState, 'redo');
    onHistoryChange?.(currentHistory, newIndex);
  }, [onStateChange, onHistoryChange]);

  /**
   * Jump to a specific point in history
   *
   * USE CASES:
   * - Time-travel debugging
   * - History browser UI
   * - Reset to specific checkpoint
   *
   * @param index - The history index to jump to
   */
  const jumpTo = useCallback(
    (index: number) => {
      const currentHistory = historyRef.current;

      // Validate index
      if (index < 0 || index >= currentHistory.length) return;

      const newState = currentHistory[index];
      const action = index < currentIndexRef.current ? 'undo' : 'redo';

      setCurrentIndex(index);
      onStateChange?.(newState, action);
      onHistoryChange?.(currentHistory, index);
    },
    [onStateChange, onHistoryChange]
  );

  /**
   * Reset history to initial state
   *
   * @param newInitialState - Optional new initial state (defaults to empty)
   */
  const reset = useCallback(
    (newInitialState?: WorkflowState) => {
      const state = newInitialState ?? { nodes: [], connections: [] };
      const entry: HistoryEntry = {
        ...cloneState(state),
        id: generateHistoryId(),
        timestamp: Date.now(),
        action: 'reset',
      };

      setHistory([entry]);
      setCurrentIndex(0);
      onStateChange?.(state, 'push');
      onHistoryChange?.([entry], 0);
    },
    [onStateChange, onHistoryChange]
  );

  /**
   * Get a specific history entry by index
   */
  const getHistoryEntry = useCallback((index: number): HistoryEntry | undefined => {
    return historyRef.current[index];
  }, []);

  // Computed values
  const currentState = history[currentIndex];
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  const undoCount = currentIndex;
  const redoCount = history.length - currentIndex - 1;

  return {
    // Current state
    state: currentState,
    nodes: currentState.nodes,
    connections: currentState.connections,

    // History info
    history,
    currentIndex,
    historyLength: history.length,

    // Capabilities
    canUndo,
    canRedo,
    undoCount,
    redoCount,

    // Actions
    pushState,
    undo,
    redo,
    jumpTo,
    reset,
    getHistoryEntry,
  };
}
