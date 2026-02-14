/**
 * ============================================================================
 * USE CONTEXT MENU HOOK
 * ============================================================================
 *
 * PURPOSE:
 * Manages context menu state and positioning for right-click interactions.
 * Supports multiple menu types (node, connection, canvas) with proper
 * positioning and click-outside handling.
 *
 * FEATURES:
 * - Right-click detection with position tracking
 * - Menu positioning with viewport boundary detection
 * - Click-outside to close
 * - Escape key to close
 * - Multiple menu types for different contexts
 *
 * USAGE:
 * ```tsx
 * const {
 *   menuState,
 *   openMenu,
 *   closeMenu,
 *   position,
 * } = useContextMenu();
 *
 * // In JSX
 * {menuState.isOpen && (
 *   <ContextMenu
 *     position={position}
 *     items={menuItems}
 *     onClose={closeMenu}
 *   />
 * )}
 * ```
 *
 * @author Open Agent Artel Team
 * @version 4.0.0 (Phase 4)
 * ============================================================================
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/** Types of context menus */
export type ContextMenuType = 'node' | 'connection' | 'canvas' | 'none';

/** Position of the context menu */
export interface MenuPosition {
  x: number;
  y: number;
}

/** State of the context menu */
export interface ContextMenuState {
  /** Whether the menu is currently open */
  isOpen: boolean;
  /** Type of menu currently open */
  type: ContextMenuType;
  /** ID of the item the menu is for (node/connection ID) */
  targetId: string | null;
}

export interface UseContextMenuOptions {
  /** Callback when menu opens */
  onOpen?: (type: ContextMenuType, targetId: string | null) => void;
  /** Callback when menu closes */
  onClose?: () => void;
}

export interface UseContextMenuReturn {
  /** Current menu state */
  menuState: ContextMenuState;
  /** Menu position in screen coordinates */
  position: MenuPosition;
  /** Open a context menu */
  openMenu: (type: ContextMenuType, x: number, y: number, targetId?: string) => void;
  /** Close the context menu */
  closeMenu: () => void;
  /** Toggle menu state */
  toggleMenu: (type: ContextMenuType, x: number, y: number, targetId?: string) => void;
  /** Check if menu is open for a specific type */
  isMenuOpen: (type: ContextMenuType) => boolean;
}

/**
 * Adjust menu position to keep it within viewport
 */
function adjustPosition(x: number, y: number, menuWidth = 200, menuHeight = 300): MenuPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Adjust X if menu would go off right edge
  let adjustedX = x;
  if (x + menuWidth > viewportWidth) {
    adjustedX = x - menuWidth;
  }

  // Adjust Y if menu would go off bottom edge
  let adjustedY = y;
  if (y + menuHeight > viewportHeight) {
    adjustedY = y - menuHeight;
  }

  // Ensure menu doesn't go off left/top edge
  adjustedX = Math.max(10, adjustedX);
  adjustedY = Math.max(10, adjustedY);

  return { x: adjustedX, y: adjustedY };
}

export function useContextMenu(options: UseContextMenuOptions = {}): UseContextMenuReturn {
  const { onOpen, onClose } = options;

  const [menuState, setMenuState] = useState<ContextMenuState>({
    isOpen: false,
    type: 'none',
    targetId: null,
  });

  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });

  // Ref to track if we just opened (prevents immediate close)
  const justOpenedRef = useRef(false);

  /**
   * Open a context menu
   */
  const openMenu = useCallback(
    (type: ContextMenuType, x: number, y: number, targetId?: string) => {
      const adjustedPosition = adjustPosition(x, y);
      setPosition(adjustedPosition);
      setMenuState({
        isOpen: true,
        type,
        targetId: targetId || null,
      });
      justOpenedRef.current = true;
      onOpen?.(type, targetId || null);

      // Reset justOpened after a short delay
      setTimeout(() => {
        justOpenedRef.current = false;
      }, 100);
    },
    [onOpen]
  );

  /**
   * Close the context menu
   */
  const closeMenu = useCallback(() => {
    if (justOpenedRef.current) return; // Don't close if we just opened

    setMenuState({
      isOpen: false,
      type: 'none',
      targetId: null,
    });
    onClose?.();
  }, [onClose]);

  /**
   * Toggle menu state
   */
  const toggleMenu = useCallback(
    (type: ContextMenuType, x: number, y: number, targetId?: string) => {
      if (menuState.isOpen && menuState.type === type && menuState.targetId === targetId) {
        closeMenu();
      } else {
        openMenu(type, x, y, targetId);
      }
    },
    [menuState, openMenu, closeMenu]
  );

  /**
   * Check if menu is open for a specific type
   */
  const isMenuOpen = useCallback(
    (type: ContextMenuType) => {
      return menuState.isOpen && menuState.type === type;
    },
    [menuState]
  );

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!menuState.isOpen) return;

      const target = e.target as HTMLElement;
      if (!target.closest('[data-context-menu]')) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuState.isOpen, closeMenu]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuState.isOpen) {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuState.isOpen, closeMenu]);

  // Close on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (menuState.isOpen) {
        closeMenu();
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [menuState.isOpen, closeMenu]);

  return {
    menuState,
    position,
    openMenu,
    closeMenu,
    toggleMenu,
    isMenuOpen,
  };
}
