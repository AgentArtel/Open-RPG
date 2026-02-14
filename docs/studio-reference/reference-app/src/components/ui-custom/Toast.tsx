/**
 * ============================================================================
 * TOAST COMPONENT
 * ============================================================================
 *
 * PURPOSE:
 * Toast notification component for displaying user feedback.
 * Supports multiple types, auto-dismiss, and action buttons.
 *
 * @author Open Agent Artel Team
 * @version 4.0.0 (Phase 4)
 * ============================================================================
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast as ToastType, ToastPosition } from '@/hooks/useToast';

export interface ToastProps {
  /** Toast data */
  toast: ToastType;
  /** Callback when toast is dismissed */
  onDismiss: (id: string) => void;
  /** Position of the toast */
  position?: ToastPosition;
}

/**
 * Individual Toast Item
 */
export const ToastItem: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const { id, type, message, description, duration = 5000, action } = toast;

  // Icons for each type
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green" />,
    error: <XCircle className="w-5 h-5 text-danger" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  const borderColors = {
    success: 'border-green/30',
    error: 'border-danger/30',
    warning: 'border-yellow-400/30',
    info: 'border-blue-400/30',
  };

  const bgColors = {
    success: 'bg-green/5',
    error: 'bg-danger/5',
    warning: 'bg-yellow-400/5',
    info: 'bg-blue-400/5',
  };

  // Handle dismiss with animation
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 300);
  };

  // Progress bar animation
  useEffect(() => {
    if (duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const newProgress = (remaining / duration) * 100;

      setProgress(newProgress);

      if (remaining <= 0) {
        clearInterval(interval);
        handleDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, id]);

  return (
    <div
      className={cn(
        'relative w-full max-w-sm overflow-hidden',
        'rounded-xl border shadow-dark-lg',
        'transition-all duration-300',
        'animate-in slide-in-from-right-full fade-in',
        isExiting && 'animate-out slide-out-to-right-full fade-out',
        borderColors[type],
        bgColors[type],
        'bg-dark-100'
      )}
      role="alert"
    >
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{message}</p>
          {description && (
            <p className="mt-1 text-sm text-white/60">{description}</p>
          )}

          {/* Action Button */}
          {action && (
            <button
              onClick={() => {
                action.onClick();
                handleDismiss();
              }}
              className={cn(
                'mt-2 text-sm font-medium',
                'hover:underline focus:outline-none focus:underline',
                type === 'success' && 'text-green',
                type === 'error' && 'text-danger',
                type === 'warning' && 'text-yellow-400',
                type === 'info' && 'text-blue-400'
              )}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div
            className={cn(
              'h-full transition-all duration-100 ease-linear',
              type === 'success' && 'bg-green',
              type === 'error' && 'bg-danger',
              type === 'warning' && 'bg-yellow-400',
              type === 'info' && 'bg-blue-400'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export interface ToastContainerProps {
  /** Array of toasts to display */
  toasts: ToastType[];
  /** Callback when a toast is dismissed */
  onDismiss: (id: string) => void;
  /** Position of the toast container */
  position?: ToastPosition;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Toast Container
 * Renders multiple toasts in a stack
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = 'bottom-right',
  className,
}) => {
  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={cn(
        'fixed z-[100] flex flex-col gap-2',
        'pointer-events-none',
        positionClasses[position],
        className
      )}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
