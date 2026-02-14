/**
 * ============================================================================
 * CONTEXT MENU COMPONENT
 * ============================================================================
 *
 * PURPOSE:
 * Right-click context menu for nodes, connections, and canvas.
 * Supports keyboard navigation, hover states, and disabled items.
 *
 * FEATURES:
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Hover states
 * - Disabled items
 * - Dividers
 * - Icons
 * - Submenu support (future)
 *
 * @author Open Agent Artel Team
 * @version 4.0.0 (Phase 4)
 * ============================================================================
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { MenuPosition } from '@/hooks/useContextMenu';

/** Menu item types */
export type MenuItemType = 'item' | 'divider' | 'submenu';

/** Menu item definition */
export interface MenuItem {
  /** Unique ID for the item */
  id: string;
  /** Display label */
  label: string;
  /** Item type */
  type?: MenuItemType;
  /** Icon component */
  icon?: React.ReactNode;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Keyboard shortcut display */
  shortcut?: string;
  /** Click handler */
  onClick?: () => void;
  /** Submenu items (for type='submenu') */
  submenu?: MenuItem[];
}

export interface ContextMenuProps {
  /** Menu position */
  position: MenuPosition;
  /** Menu items */
  items: MenuItem[];
  /** Callback when menu closes */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Context Menu Component
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  items,
  onClose,
  className,
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter out dividers for keyboard navigation
  const navigableItems = items.filter((item) => item.type !== 'divider');

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const nextIndex = prev + 1;
            return nextIndex >= navigableItems.length ? 0 : nextIndex;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const nextIndex = prev - 1;
            return nextIndex < 0 ? navigableItems.length - 1 : nextIndex;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < navigableItems.length) {
            const item = navigableItems[focusedIndex];
            if (!item.disabled && item.onClick) {
              item.onClick();
              onClose();
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [focusedIndex, navigableItems, onClose]
  );

  // Focus first item on mount
  useEffect(() => {
    if (navigableItems.length > 0) {
      setFocusedIndex(0);
    }
    menuRef.current?.focus();
  }, [navigableItems.length]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  /**
   * Handle item click
   */
  const handleItemClick = useCallback(
    (item: MenuItem) => {
      if (!item.disabled && item.onClick) {
        item.onClick();
        onClose();
      }
    },
    [onClose]
  );

  // Calculate adjusted position to keep menu in viewport
  const adjustedPosition = React.useMemo(() => {
    const menuWidth = 220;
    const menuHeight = Math.min(items.length * 40, 400);

    let x = position.x;
    let y = position.y;

    if (x + menuWidth > window.innerWidth) {
      x = x - menuWidth;
    }
    if (y + menuHeight > window.innerHeight) {
      y = y - menuHeight;
    }

    return { x: Math.max(10, x), y: Math.max(10, y) };
  }, [position, items.length]);

  return (
    <div
      ref={menuRef}
      data-context-menu
      className={cn(
        'fixed z-50 min-w-[200px] max-w-[280px]',
        'bg-dark-100 border border-white/10 rounded-xl',
        'shadow-dark-lg py-1.5',
        'outline-none',
        'animate-in fade-in zoom-in-95 duration-100',
        className
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {items.map((item) => {
        // Find navigable index for this item
        const navigableIndex = navigableItems.findIndex((ni) => ni.id === item.id);
        const isFocused = navigableIndex === focusedIndex;

        if (item.type === 'divider') {
          return (
            <div
              key={item.id}
              className="my-1.5 mx-2 h-px bg-white/10"
            />
          );
        }

        return (
          <button
            key={item.id}
            ref={(el) => {
              if (navigableIndex >= 0) {
                itemRefs.current[navigableIndex] = el;
              }
            }}
            className={cn(
              'w-full px-3 py-2 flex items-center gap-3',
              'text-left text-sm transition-colors',
              'hover:bg-white/5 focus:bg-white/5 focus:outline-none',
              item.disabled && 'opacity-40 cursor-not-allowed',
              isFocused && 'bg-white/5',
              'first:rounded-t-lg last:rounded-b-lg'
            )}
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => setFocusedIndex(navigableIndex)}
            disabled={item.disabled}
          >
            {/* Icon */}
            {item.icon && (
              <span className="w-4 h-4 flex items-center justify-center text-white/60">
                {item.icon}
              </span>
            )}

            {/* Label */}
            <span className={cn(
              'flex-1',
              item.disabled ? 'text-white/40' : 'text-white/90'
            )}>
              {item.label}
            </span>

            {/* Shortcut */}
            {item.shortcut && (
              <span className="text-xs text-white/40 font-mono">
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Predefined menu item presets for common actions
 */
export const MenuPresets = {
  /** Divider item */
  divider: (id: string): MenuItem => ({
    id,
    label: '',
    type: 'divider',
  }),

  /** Delete item */
  delete: (onClick: () => void, shortcut?: string): MenuItem => ({
    id: 'delete',
    label: 'Delete',
    icon: '🗑️',
    shortcut,
    onClick,
  }),

  /** Copy item */
  copy: (onClick: () => void, shortcut?: string): MenuItem => ({
    id: 'copy',
    label: 'Copy',
    icon: '📋',
    shortcut,
    onClick,
  }),

  /** Cut item */
  cut: (onClick: () => void, shortcut?: string): MenuItem => ({
    id: 'cut',
    label: 'Cut',
    icon: '✂️',
    shortcut,
    onClick,
  }),

  /** Paste item */
  paste: (onClick: () => void, shortcut?: string): MenuItem => ({
    id: 'paste',
    label: 'Paste',
    icon: '📄',
    shortcut,
    onClick,
  }),

  /** Duplicate item */
  duplicate: (onClick: () => void, shortcut?: string): MenuItem => ({
    id: 'duplicate',
    label: 'Duplicate',
    icon: '⎘',
    shortcut,
    onClick,
  }),

  /** Rename item */
  rename: (onClick: () => void): MenuItem => ({
    id: 'rename',
    label: 'Rename',
    icon: '✏️',
    onClick,
  }),

  /** Configure item */
  configure: (onClick: () => void): MenuItem => ({
    id: 'configure',
    label: 'Configure',
    icon: '⚙️',
    onClick,
  }),

  /** Deactivate item */
  deactivate: (onClick: () => void): MenuItem => ({
    id: 'deactivate',
    label: 'Deactivate',
    icon: '⏸️',
    onClick,
  }),

  /** Activate item */
  activate: (onClick: () => void): MenuItem => ({
    id: 'activate',
    label: 'Activate',
    icon: '▶️',
    onClick,
  }),

  /** Execute item */
  execute: (onClick: () => void): MenuItem => ({
    id: 'execute',
    label: 'Execute',
    icon: '▶️',
    onClick,
  }),

  /** View logs item */
  viewLogs: (onClick: () => void): MenuItem => ({
    id: 'view-logs',
    label: 'View Logs',
    icon: '📋',
    onClick,
  }),

  /** Fit to view item */
  fitToView: (onClick: () => void): MenuItem => ({
    id: 'fit-to-view',
    label: 'Fit to View',
    icon: '🔍',
    onClick,
  }),

  /** Add node item */
  addNode: (onClick: () => void): MenuItem => ({
    id: 'add-node',
    label: 'Add Node',
    icon: '➕',
    onClick,
  }),

  /** Select all item */
  selectAll: (onClick: () => void, shortcut?: string): MenuItem => ({
    id: 'select-all',
    label: 'Select All',
    shortcut,
    onClick,
  }),

  /** Deselect all item */
  deselectAll: (onClick: () => void): MenuItem => ({
    id: 'deselect-all',
    label: 'Deselect All',
    onClick,
  }),
};

export default ContextMenu;
