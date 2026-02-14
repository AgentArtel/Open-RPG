/**
 * ============================================================================
 * SELECTION BOX COMPONENT
 * ============================================================================
 *
 * PURPOSE:
 * Visual feedback component for drag-to-select functionality.
 * Renders a semi-transparent rectangle that follows the user's drag motion,
 * indicating which area will be selected when the drag ends.
 *
 * VISUAL DESIGN:
 * - Semi-transparent fill with brand color (green)
 * - Dashed border for visibility
 * - Glow effect for emphasis
 * - Animated appearance
 *
 * USAGE:
 * ```tsx
 * <SelectionBox
 *   startX={100}
 *   startY={100}
 *   currentX={300}
 *   currentY={250}
 * />
 * ```
 *
 * COORDINATE SYSTEM:
 * All coordinates are in canvas space (not screen space).
 * The component calculates its own dimensions based on start/current positions.
 *
 * @author Open Agent Artel Team
 * @version 1.0.0
 * ============================================================================
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectionBoxProps {
  /** Starting X position in canvas coordinates */
  startX: number;
  /** Starting Y position in canvas coordinates */
  startY: number;
  /** Current X position in canvas coordinates */
  currentX: number;
  /** Current Y position in canvas coordinates */
  currentY: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Selection Box Component
 *
 * Renders a visual selection rectangle that expands/contracts as the user drags.
 * Handles negative dimensions (dragging in any direction).
 */
export const SelectionBox: React.FC<SelectionBoxProps> = ({
  startX,
  startY,
  currentX,
  currentY,
  className,
}) => {
  // Calculate rectangle dimensions
  // Handle dragging in any direction (negative width/height)
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  // Don't render if selection is too small (likely a click, not a drag)
  if (width < 5 || height < 5) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute pointer-events-none',
        'border-2 border-dashed border-green',
        'bg-green/10',
        'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
        'animate-in fade-in duration-100',
        className
      )}
      style={{
        left: x,
        top: y,
        width,
        height,
      }}
    >
      {/* Corner indicators for visual feedback */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-green rounded-full" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green rounded-full" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-green rounded-full" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green rounded-full" />

      {/* Size indicator (optional, shown for larger selections) */}
      {width > 100 && height > 50 && (
        <div className="absolute -top-6 left-0 bg-green text-dark text-xs px-2 py-0.5 rounded font-medium">
          {Math.round(width)} × {Math.round(height)}
        </div>
      )}
    </div>
  );
};

/**
 * Selection Box Overlay
 *
 * Wrapper component that renders the selection box within the canvas transform.
 * This ensures the selection box scales correctly with zoom.
 */
export interface SelectionBoxOverlayProps {
  /** Whether the selection box is active */
  isActive: boolean;
  /** Selection box state */
  selectionBox: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null;
  className?: string;
}

export const SelectionBoxOverlay: React.FC<SelectionBoxOverlayProps> = ({
  isActive,
  selectionBox,
  className,
}) => {
  if (!isActive || !selectionBox) {
    return null;
  }

  return (
    <SelectionBox
      startX={selectionBox.startX}
      startY={selectionBox.startY}
      currentX={selectionBox.currentX}
      currentY={selectionBox.currentY}
      className={className}
    />
  );
};

export default SelectionBox;
