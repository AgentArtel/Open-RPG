/**
 * ============================================================================
 * USE TOAST HOOK
 * ============================================================================
 *
 * PURPOSE:
 * Toast notification system for user feedback.
 * Provides non-intrusive notifications for actions and events.
 *
 * FEATURES:
 * - Multiple toast types (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Manual dismiss
 * - Toast queue management
 * - Position options
 * - Action buttons in toasts
 *
 * USAGE:
 * ```tsx
 * const { toast, success, error, warning, info, dismiss } = useToast();
 *
 * // Show toast
 * success('Workflow saved successfully!');
 * error('Failed to save workflow');
 * warning('Some nodes are not configured');
 * info('New version available');
 *
 * // Toast with action
 * success('Node added', {
 *   action: { label: 'Undo', onClick: () => undo() }
 * });
 * ```
 *
 * @author Open Agent Artel Team
 * @version 4.0.0 (Phase 4)
 * ============================================================================
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/** Toast types */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Toast position */
export type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

/** Toast action */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

/** Toast item */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
  createdAt: number;
}

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: ToastAction;
}

export interface UseToastOptions {
  /** Default duration for toasts */
  defaultDuration?: number;
  /** Maximum number of toasts to show at once */
  maxToasts?: number;
  /** Default position */
  position?: ToastPosition;
}

export interface UseToastReturn {
  /** Active toasts */
  toasts: Toast[];
  /** Show a toast with specific type */
  toast: (type: ToastType, message: string, options?: ToastOptions) => string;
  /** Show success toast */
  success: (message: string, options?: ToastOptions) => string;
  /** Show error toast */
  error: (message: string, options?: ToastOptions) => string;
  /** Show warning toast */
  warning: (message: string, options?: ToastOptions) => string;
  /** Show info toast */
  info: (message: string, options?: ToastOptions) => string;
  /** Dismiss a specific toast */
  dismiss: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
  /** Update a toast */
  update: (id: string, updates: Partial<Omit<Toast, 'id' | 'createdAt'>>) => void;
}

/**
 * Generate unique toast ID
 */
function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useToast(options: UseToastOptions = {}): UseToastReturn {
  const { defaultDuration = 5000, maxToasts = 5 } = options;

  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /**
   * Clear toast timer
   */
  const clearToastTimer = useCallback((id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  /**
   * Set toast timer for auto-dismiss
   */
  const setToastTimer = useCallback(
    (id: string, duration: number) => {
      clearToastTimer(id);

      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [clearToastTimer]
  );

  /**
   * Show a toast
   */
  const toast = useCallback(
    (type: ToastType, message: string, options: ToastOptions = {}): string => {
      const id = generateToastId();
      const duration = options.duration ?? defaultDuration;

      const newToast: Toast = {
        id,
        type,
        message,
        description: options.description,
        duration,
        action: options.action,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        // Remove oldest if at max
        const newToasts = [...prev, newToast];
        if (newToasts.length > maxToasts) {
          const removed = newToasts.shift();
          if (removed) {
            clearToastTimer(removed.id);
          }
        }
        return newToasts;
      });

      // Set auto-dismiss timer
      setToastTimer(id, duration);

      return id;
    },
    [defaultDuration, maxToasts, setToastTimer, clearToastTimer]
  );

  /**
   * Show success toast
   */
  const success = useCallback(
    (message: string, options?: ToastOptions) => {
      return toast('success', message, options);
    },
    [toast]
  );

  /**
   * Show error toast
   */
  const error = useCallback(
    (message: string, options?: ToastOptions) => {
      return toast('error', message, { duration: 8000, ...options });
    },
    [toast]
  );

  /**
   * Show warning toast
   */
  const warning = useCallback(
    (message: string, options?: ToastOptions) => {
      return toast('warning', message, options);
    },
    [toast]
  );

  /**
   * Show info toast
   */
  const info = useCallback(
    (message: string, options?: ToastOptions) => {
      return toast('info', message, options);
    },
    [toast]
  );

  /**
   * Dismiss a toast
   */
  const dismiss = useCallback((id: string) => {
    clearToastTimer(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, [clearToastTimer]);

  /**
   * Dismiss all toasts
   */
  const dismissAll = useCallback(() => {
    Object.keys(timersRef.current).forEach(clearToastTimer);
    setToasts([]);
  }, [clearToastTimer]);

  /**
   * Update a toast
   */
  const update = useCallback(
    (id: string, updates: Partial<Omit<Toast, 'id' | 'createdAt'>>) => {
      setToasts((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const updated = { ...t, ...updates };
            // Reset timer if duration changed
            if (updates.duration !== undefined) {
              setToastTimer(id, updates.duration);
            }
            return updated;
          }
          return t;
        })
      );
    },
    [setToastTimer]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  return {
    toasts,
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
    update,
  };
}
