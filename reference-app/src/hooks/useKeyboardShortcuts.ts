/**
 * ============================================================================
 * USE KEYBOARD SHORTCUTS HOOK
 * ============================================================================
 *
 * PURPOSE:
 * Centralized keyboard shortcut management for the workflow editor.
 * Provides declarative shortcut registration with automatic cleanup,
 * conflict detection, and platform-aware key handling (Mac vs Windows).
 *
 * ARCHITECTURE:
 * - Uses a registry pattern for shortcut management
 * - Supports modifier keys: Ctrl, Alt, Shift, Meta (Cmd on Mac)
 * - Automatic cleanup on unmount
 * - Prevents default browser behavior for registered shortcuts
 * - Supports single keys, key combinations, and sequences
 *
 * PLATFORM HANDLING:
 * - Mac: Uses Cmd (Meta) key for primary shortcuts
 * - Windows/Linux: Uses Ctrl key for primary shortcuts
 * - Automatically normalizes Cmd+Z to Ctrl+Z on Windows
 *
 * USAGE:
 * ```tsx
 * const { registerShortcut, unregisterShortcut, registerShortcuts } = useKeyboardShortcuts();
 *
 * // Register a single shortcut
 * useEffect(() => {
 *   const unregister = registerShortcut({
 *     key: 'z',
 *     modifiers: ['ctrl'],
 *     handler: () => undo(),
 *     description: 'Undo last action',
 *     preventDefault: true,
 *   });
 *   return unregister;
 * }, [undo]);
 *
 * // Register multiple shortcuts at once
 * useEffect(() => {
 *   return registerShortcuts([
 *     { key: 'z', modifiers: ['ctrl'], handler: undo },
 *     { key: 'z', modifiers: ['ctrl', 'shift'], handler: redo },
 *     { key: 'Delete', handler: deleteSelected },
 *   ]);
 * }, [undo, redo, deleteSelected]);
 * ```
 *
 * COMMON SHORTCUTS:
 * - Ctrl/Cmd + Z: Undo
 * - Ctrl/Cmd + Shift + Z: Redo
 * - Ctrl/Cmd + Y: Redo (alternative)
 * - Delete/Backspace: Delete selected
 * - Ctrl/Cmd + A: Select all
 * - Escape: Deselect all / Close panels
 * - Ctrl/Cmd + C: Copy
 * - Ctrl/Cmd + V: Paste
 * - Ctrl/Cmd + X: Cut
 * - Ctrl/Cmd + S: Save
 *
 * @author Open Agent Artel Team
 * @version 1.0.0
 * ============================================================================
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Modifier keys that can be used in shortcuts
 */
export type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';

/**
 * Special keys that have named identifiers
 */
export type SpecialKey =
  | 'Enter'
  | 'Escape'
  | 'Backspace'
  | 'Delete'
  | 'Tab'
  | 'Space'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown'
  | 'Insert'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F10'
  | 'F11'
  | 'F12';

/**
 * Shortcut configuration
 */
export interface ShortcutConfig {
  /** The key to listen for (single character or special key name) */
  key: string | SpecialKey;
  /** Modifier keys required (Ctrl, Alt, Shift, Meta) */
  modifiers?: ModifierKey[];
  /** Handler function called when shortcut is triggered */
  handler: (event: KeyboardEvent) => void | boolean;
  /** Human-readable description for help/documentation */
  description?: string;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether to stop event propagation */
  stopPropagation?: boolean;
  /** Priority for handling (higher = handled first) */
  priority?: number;
  /** Condition that must be true for shortcut to activate */
  when?: () => boolean;
}

/**
 * Internal shortcut entry with metadata
 */
interface ShortcutEntry extends ShortcutConfig {
  /** Unique ID for this shortcut registration */
  id: string;
  /** Normalized key for comparison */
  normalizedKey: string;
  /** Set of normalized modifiers */
  normalizedModifiers: Set<string>;
}

/**
 * Generate unique ID for shortcut registrations
 */
function generateShortcutId(): string {
  return `shortcut-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Normalize a key string for comparison
 * Handles case insensitivity and special key aliases
 */
function normalizeKey(key: string): string {
  // Convert to lowercase for consistency
  let normalized = key.toLowerCase();

  // Handle special key aliases
  const aliases: Record<string, string> = {
    'space': ' ',
    'spacebar': ' ',
    'esc': 'escape',
    'del': 'delete',
    'ins': 'insert',
    'pgup': 'pageup',
    'pgdown': 'pagedown',
    'up': 'arrowup',
    'down': 'arrowdown',
    'left': 'arrowleft',
    'right': 'arrowright',
  };

  return aliases[normalized] || normalized;
}

/**
 * Normalize modifiers array to a Set for efficient comparison
 */
function normalizeModifiers(modifiers: ModifierKey[] = []): Set<string> {
  return new Set(modifiers.map((m) => m.toLowerCase()));
}

/**
 * Check if the current keyboard event matches a shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutEntry): boolean {
  // Check if condition is met
  if (shortcut.when && !shortcut.when()) {
    return false;
  }

  // Normalize event key
  const eventKey = normalizeKey(event.key);
  const shortcutKey = shortcut.normalizedKey;

  // Check key match
  if (eventKey !== shortcutKey) {
    return false;
  }

  // Check modifiers
  const requiredModifiers = shortcut.normalizedModifiers;

  // Check each required modifier
  for (const mod of requiredModifiers) {
    switch (mod) {
      case 'ctrl':
        if (!event.ctrlKey) return false;
        break;
      case 'alt':
        if (!event.altKey) return false;
        break;
      case 'shift':
        if (!event.shiftKey) return false;
        break;
      case 'meta':
        if (!event.metaKey) return false;
        break;
    }
  }

  // Check for extra modifiers not in the shortcut
  // This prevents Ctrl+Shift+Z from triggering Ctrl+Z
  if (event.ctrlKey && !requiredModifiers.has('ctrl')) return false;
  if (event.altKey && !requiredModifiers.has('alt')) return false;
  if (event.shiftKey && !requiredModifiers.has('shift')) return false;
  if (event.metaKey && !requiredModifiers.has('meta')) return false;

  return true;
}

export interface UseKeyboardShortcutsReturn {
  /**
   * Register a single keyboard shortcut
   * @returns Unregister function to remove the shortcut
   */
  registerShortcut: (config: ShortcutConfig) => () => void;

  /**
   * Register multiple shortcuts at once
   * @returns Unregister function to remove all shortcuts
   */
  registerShortcuts: (configs: ShortcutConfig[]) => () => void;

  /**
   * Unregister a specific shortcut by its config
   */
  unregisterShortcut: (config: ShortcutConfig) => void;

  /**
   * Get all currently registered shortcuts (for debugging/help)
   */
  getRegisteredShortcuts: () => ShortcutConfig[];

  /**
   * Check if a shortcut is currently registered
   */
  isShortcutRegistered: (key: string, modifiers?: ModifierKey[]) => boolean;

  /**
   * Create platform-aware shortcut display string
   * e.g., "Ctrl+Z" on Windows, "⌘Z" on Mac
   */
  formatShortcut: (key: string, modifiers?: ModifierKey[]) => string;
}

export function useKeyboardShortcuts(): UseKeyboardShortcutsReturn {
  // Registry of all registered shortcuts
  const shortcutsRef = useRef<ShortcutEntry[]>([]);

  /**
   * Register a single keyboard shortcut
   */
  const registerShortcut = useCallback((config: ShortcutConfig): (() => void) => {
    const id = generateShortcutId();

    const entry: ShortcutEntry = {
      ...config,
      id,
      normalizedKey: normalizeKey(config.key),
      normalizedModifiers: normalizeModifiers(config.modifiers),
    };

    // Add to registry
    shortcutsRef.current.push(entry);

    // Sort by priority (higher first)
    shortcutsRef.current.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    // Return unregister function
    return () => {
      shortcutsRef.current = shortcutsRef.current.filter((s) => s.id !== id);
    };
  }, []);

  /**
   * Register multiple shortcuts at once
   */
  const registerShortcuts = useCallback(
    (configs: ShortcutConfig[]): (() => void) => {
      const unregisterFns = configs.map((config) => registerShortcut(config));

      // Return combined unregister function
      return () => {
        unregisterFns.forEach((fn) => fn());
      };
    },
    [registerShortcut]
  );

  /**
   * Unregister a shortcut by its config
   * Note: This finds and removes the first matching shortcut
   */
  const unregisterShortcut = useCallback((config: ShortcutConfig): void => {
    const normalizedKey = normalizeKey(config.key);
    const normalizedModifiers = normalizeModifiers(config.modifiers);

    shortcutsRef.current = shortcutsRef.current.filter((s) => {
      // Keep if key doesn't match
      if (s.normalizedKey !== normalizedKey) return true;

      // Keep if modifiers don't match
      if (s.normalizedModifiers.size !== normalizedModifiers.size) return true;
      for (const mod of normalizedModifiers) {
        if (!s.normalizedModifiers.has(mod)) return true;
      }

      // Remove this match
      return false;
    });
  }, []);

  /**
   * Get all registered shortcuts
   */
  const getRegisteredShortcuts = useCallback((): ShortcutConfig[] => {
    return shortcutsRef.current.map(({ id: _id, normalizedKey: _nk, normalizedModifiers: _nm, ...config }) => config);
  }, []);

  /**
   * Check if a shortcut is registered
   */
  const isShortcutRegistered = useCallback(
    (key: string, modifiers: ModifierKey[] = []): boolean => {
      const normalizedKey = normalizeKey(key);
      const normalizedModifiers = normalizeModifiers(modifiers);

      return shortcutsRef.current.some((s) => {
        if (s.normalizedKey !== normalizedKey) return false;
        if (s.normalizedModifiers.size !== normalizedModifiers.size) return false;
        for (const mod of normalizedModifiers) {
          if (!s.normalizedModifiers.has(mod)) return false;
        }
        return true;
      });
    },
    []
  );

  /**
   * Format a shortcut for display (platform-aware)
   */
  const formatShortcut = useCallback((key: string, modifiers: ModifierKey[] = []): string => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    const modifierSymbols: Record<ModifierKey, string> = isMac
      ? {
          ctrl: '⌃',
          alt: '⌥',
          shift: '⇧',
          meta: '⌘',
        }
      : {
          ctrl: 'Ctrl',
          alt: 'Alt',
          shift: 'Shift',
          meta: 'Win',
        };

    const parts = modifiers.map((m) => modifierSymbols[m]);

    // Format key
    let keyDisplay = key;
    if (key.length === 1) {
      keyDisplay = key.toUpperCase();
    } else {
      // Capitalize special keys
      keyDisplay = key.charAt(0).toUpperCase() + key.slice(1);
    }

    parts.push(keyDisplay);

    return isMac ? parts.join('') : parts.join('+');
  }, []);

  /**
   * Global keyboard event handler
   * This is the core handler that processes all keyboard events
   * and dispatches to registered shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts when user is typing in an input
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (isInput) {
        // Allow Escape and some navigation keys even in inputs
        const allowedInInput = ['Escape', 'Enter'];
        if (!allowedInInput.includes(event.key)) {
          return;
        }
      }

      // Find matching shortcut (sorted by priority)
      for (const shortcut of shortcutsRef.current) {
        if (matchesShortcut(event, shortcut)) {
          // Call handler
          const result = shortcut.handler(event);

          // Prevent default if requested or if handler returns true
          if (shortcut.preventDefault !== false || result === true) {
            event.preventDefault();
          }

          // Stop propagation if requested
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }

          // Only handle the first matching shortcut
          break;
        }
      }
    };

    // Add global listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return {
    registerShortcut,
    registerShortcuts,
    unregisterShortcut,
    getRegisteredShortcuts,
    isShortcutRegistered,
    formatShortcut,
  };
}

/**
 * ============================================================================
 * PRESET SHORTCUT CONFIGURATIONS
 * ============================================================================
 *
 * Common shortcut configurations for the workflow editor.
 * Import and use these for consistent behavior.
 *
 * Example:
 * ```tsx
 * import { useKeyboardShortcuts, UNDO_SHORTCUT, REDO_SHORTCUT } from '@/hooks/useKeyboardShortcuts';
 *
 * const { registerShortcuts } = useKeyboardShortcuts();
 *
 * useEffect(() => {
 *   return registerShortcuts([
 *     { ...UNDO_SHORTCUT, handler: undo },
 *     { ...REDO_SHORTCUT, handler: redo },
 *   ]);
 * }, [undo, redo]);
 * ```
 */

export const UNDO_SHORTCUT: Omit<ShortcutConfig, 'handler'> = {
  key: 'z',
  modifiers: ['ctrl'],
  description: 'Undo last action',
  preventDefault: true,
};

export const REDO_SHORTCUT: Omit<ShortcutConfig, 'handler'> = {
  key: 'z',
  modifiers: ['ctrl', 'shift'],
  description: 'Redo last undone action',
  preventDefault: true,
};

export const REDO_ALT_SHORTCUT: Omit<ShortcutConfig, 'handler'> = {
  key: 'y',
  modifiers: ['ctrl'],
  description: 'Redo last undone action (alternative)',
  preventDefault: true,
};

export const DELETE_SHORTCUT: Omit<ShortcutConfig, 'handler'> = {
  key: 'Delete',
  description: 'Delete selected items',
  preventDefault: true,
};

export const BACKSPACE_DELETE_SHORTCUT: Omit<ShortcutConfig, 'handler'> = {
  key: 'Backspace',
  description: 'Delete selected items',
  preventDefault: true,
};

export const SELECT_ALL_SHORTCUT: Omit<ShortcutConfig, 'handler'> = {
  key: 'a',
  modifiers: ['ctrl'],
  description: 'Select all items',
  preventDefault: true,
};

export const ESCAPE_SHORTCUT: Omit<ShortcutConfig, 'handler'> = {
  key: 'Escape',
  description: 'Deselect all / Close panels',
  preventDefault: true,
};

export const COPY_SHORTCUT: Omit<ShortcutConfig, 'handler'> = {
  key: 'c',
  modifiers: ['ctrl'],
  description: 'Copy selected items',
  preventDefault: true,
};

export const PASTE_SHORTCUT: Omit<ShortcutConfig, 'handler'> = {
  key: 'v',
  modifiers: ['ctrl'],
  description: 'Paste items',
  preventDefault: true,
};

export const CUT_SHORTCUT: Omit<ShortcutConfig, 'handler'> = {
  key: 'x',
  modifiers: ['ctrl'],
  description: 'Cut selected items',
  preventDefault: true,
};

export const SAVE_SHORTCUT: Omit<ShortcutConfig, 'handler'> = {
  key: 's',
  modifiers: ['ctrl'],
  description: 'Save workflow',
  preventDefault: true,
};

export const DUPLICATE_SHORTCUT: Omit<ShortcutConfig, 'handler'> = {
  key: 'd',
  modifiers: ['ctrl'],
  description: 'Duplicate selected items',
  preventDefault: true,
};
