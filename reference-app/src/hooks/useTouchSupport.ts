/**
 * ============================================================================
 * USE TOUCH SUPPORT HOOK
 * ============================================================================
 *
 * PURPOSE:
 * Provides touch gesture support for mobile and tablet devices.
 * Implements touch equivalents of mouse interactions:
 * - Single tap: Select
 * - Double tap: Open config
 * - Long press: Context menu
 * - Pinch: Zoom
 * - Pan: Move canvas
 * - Drag: Move nodes
 *
 * GESTURE MAPPING:
 * | Mouse Action      | Touch Equivalent    |
 * |-------------------|---------------------|
 * | Click             | Tap                 |
 * | Double click      | Double tap          |
 * | Right click       | Long press          |
 * | Drag              | Touch drag          |
 * | Wheel zoom        | Pinch               |
 * | Middle drag pan   | Two-finger pan      |
 *
 * @author Open Agent Artel Team
 * @version 4.0.0 (Phase 4)
 * ============================================================================
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/** Touch gesture types */
export type TouchGesture = 'tap' | 'doubleTap' | 'longPress' | 'pinch' | 'pan' | 'none';

/** State of touch interactions */
export interface TouchState {
  /** Number of active touches */
  touchCount: number;
  /** Current gesture being performed */
  gesture: TouchGesture;
  /** Whether a touch operation is in progress */
  isTouching: boolean;
  /** Starting position of touch (for drag calculations) */
  startPosition: { x: number; y: number } | null;
  /** Current position of touch */
  currentPosition: { x: number; y: number } | null;
}

export interface UseTouchSupportOptions {
  /** Callback on tap gesture */
  onTap?: (x: number, y: number, target: EventTarget | null) => void;
  /** Callback on double tap gesture */
  onDoubleTap?: (x: number, y: number, target: EventTarget | null) => void;
  /** Callback on long press gesture */
  onLongPress?: (x: number, y: number, target: EventTarget | null) => void;
  /** Callback on pinch gesture (scale factor) */
  onPinch?: (scale: number, centerX: number, centerY: number) => void;
  /** Callback on pan gesture (delta X, Y) */
  onPan?: (deltaX: number, deltaY: number) => void;
  /** Long press duration in ms */
  longPressDuration?: number;
  /** Double tap max interval in ms */
  doubleTapInterval?: number;
  /** Minimum pinch distance to trigger */
  minPinchDistance?: number;
  /** Whether touch is enabled */
  enabled?: boolean;
}

export interface UseTouchSupportReturn {
  /** Current touch state */
  touchState: TouchState;
  /** Whether device supports touch */
  isTouchDevice: boolean;
  /** Touch handlers to spread on element */
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
  /** Manually reset touch state */
  resetTouchState: () => void;
}

/**
 * Touch point interface (works with both React.Touch and native Touch)
 */
interface TouchPoint {
  clientX: number;
  clientY: number;
}

/**
 * Get distance between two touch points
 */
function getTouchDistance(touch1: TouchPoint, touch2: TouchPoint): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get center point between two touches
 */
function getTouchCenter(touch1: TouchPoint, touch2: TouchPoint): { x: number; y: number } {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

export function useTouchSupport(options: UseTouchSupportOptions = {}): UseTouchSupportReturn {
  const {
    onTap,
    onDoubleTap,
    onLongPress,
    onPinch,
    onPan,
    longPressDuration = 500,
    doubleTapInterval = 300,
    minPinchDistance = 10,
    enabled = true,
  } = options;

  // Detect touch device
  const [isTouchDevice] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  // Touch state
  const [touchState, setTouchState] = useState<TouchState>({
    touchCount: 0,
    gesture: 'none',
    isTouching: false,
    startPosition: null,
    currentPosition: null,
  });

  // Refs for tracking without re-renders
  const touchStartTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPinchDistanceRef = useRef<number>(0);
  const lastTouchCountRef = useRef<number>(0);
  const touchStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  /**
   * Reset touch state
   */
  const resetTouchState = useCallback(() => {
    setTouchState({
      touchCount: 0,
      gesture: 'none',
      isTouching: false,
      startPosition: null,
      currentPosition: null,
    });
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;

      const touches = e.touches;
      const touchCount = touches.length;
      lastTouchCountRef.current = touchCount;

      // Clear any existing long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (touchCount === 1) {
        // Single touch - potential tap or drag
        const touch = touches[0];
        touchStartTimeRef.current = Date.now();
        touchStartPositionRef.current = { x: touch.clientX, y: touch.clientY };
        isDraggingRef.current = false;

        setTouchState((prev) => ({
          ...prev,
          touchCount: 1,
          gesture: 'none',
          isTouching: true,
          startPosition: { x: touch.clientX, y: touch.clientY },
          currentPosition: { x: touch.clientX, y: touch.clientY },
        }));

        // Start long press timer
        longPressTimerRef.current = setTimeout(() => {
          onLongPress?.(touch.clientX, touch.clientY, e.target);
          setTouchState((prev) => ({ ...prev, gesture: 'longPress' }));
        }, longPressDuration);
      } else if (touchCount === 2) {
        // Two touches - potential pinch
        const distance = getTouchDistance(touches[0], touches[1]);
        initialPinchDistanceRef.current = distance;

        setTouchState((prev) => ({
          ...prev,
          touchCount: 2,
          gesture: 'pinch',
          isTouching: true,
        }));
      }
    },
    [enabled, longPressDuration, onLongPress]
  );

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;

      const touches = e.touches;
      const touchCount = touches.length;

      // Cancel long press if moved significantly
      if (touchCount === 1 && touchStartPositionRef.current) {
        const touch = touches[0];
        const dx = touch.clientX - touchStartPositionRef.current.x;
        const dy = touch.clientY - touchStartPositionRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 10) {
          isDraggingRef.current = true;
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }

        setTouchState((prev) => ({
          ...prev,
          gesture: isDraggingRef.current ? 'pan' : 'none',
          currentPosition: { x: touch.clientX, y: touch.clientY },
        }));

        // Call pan handler if dragging
        if (isDraggingRef.current && prevTouchState.current.startPosition) {
          onPan?.(dx, dy);
        }
      }

      // Handle pinch
      if (touchCount === 2 && initialPinchDistanceRef.current > 0) {
        const distance = getTouchDistance(touches[0], touches[1]);
        const scale = distance / initialPinchDistanceRef.current;
        const center = getTouchCenter(touches[0], touches[1]);

        if (Math.abs(distance - initialPinchDistanceRef.current) > minPinchDistance) {
          onPinch?.(scale, center.x, center.y);
        }
      }
    },
    [enabled, minPinchDistance, onPan, onPinch]
  );

  // Ref for accessing previous state in callbacks
  const prevTouchState = useRef(touchState);
  useEffect(() => {
    prevTouchState.current = touchState;
  }, [touchState]);

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;

      const touches = e.touches;
      const remainingTouches = touches.length;

      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // Handle single touch end (potential tap)
      if (lastTouchCountRef.current === 1 && !isDraggingRef.current) {
        const touchDuration = Date.now() - touchStartTimeRef.current;

        if (touchDuration < longPressDuration) {
          const timeSinceLastTap = Date.now() - lastTapTimeRef.current;

          if (timeSinceLastTap < doubleTapInterval) {
            // Double tap
            onDoubleTap?.(
              touchStartPositionRef.current?.x || 0,
              touchStartPositionRef.current?.y || 0,
              e.target
            );
            lastTapTimeRef.current = 0; // Reset
          } else {
            // Single tap - wait to see if it's a double tap
            lastTapTimeRef.current = Date.now();
            setTimeout(() => {
              if (Date.now() - lastTapTimeRef.current >= doubleTapInterval) {
                onTap?.(
                  touchStartPositionRef.current?.x || 0,
                  touchStartPositionRef.current?.y || 0,
                  e.target
                );
                lastTapTimeRef.current = 0;
              }
            }, doubleTapInterval);
          }
        }
      }

      // Reset state if no touches remain
      if (remainingTouches === 0) {
        setTouchState({
          touchCount: 0,
          gesture: 'none',
          isTouching: false,
          startPosition: null,
          currentPosition: null,
        });
        isDraggingRef.current = false;
        initialPinchDistanceRef.current = 0;
      } else {
        // Update touch count
        setTouchState((prev) => ({
          ...prev,
          touchCount: remainingTouches,
        }));
      }

      lastTouchCountRef.current = remainingTouches;
    },
    [enabled, doubleTapInterval, longPressDuration, onTap, onDoubleTap]
  );

  /**
   * Handle touch cancel
   */
  const handleTouchCancel = useCallback(() => {
    if (!enabled) return;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    resetTouchState();
  }, [enabled, resetTouchState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return {
    touchState,
    isTouchDevice,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    resetTouchState,
  };
}
