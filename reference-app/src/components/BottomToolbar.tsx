/**
 * ============================================================================
 * BOTTOM TOOLBAR COMPONENT - PHASE 4
 * ============================================================================
 *
 * PURPOSE:
 * Floating toolbar at the bottom of the workflow editor with execution progress.
 *
 * PHASE 4 ADDITIONS:
 * - Execution progress bar
 * - Execution state indicator
 * - Stop button during execution
 *
 * @author Open Agent Artel Team
 * @version 4.0.0 (Phase 4)
 * ============================================================================
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, Plus, Trash2, LayoutGrid, Play, Square, Loader2 } from 'lucide-react';

export interface BottomToolbarProps {
  /** Callback when test button is clicked */
  onTest?: () => void;
  /** Callback when hide chat button is clicked */
  onHideChat?: () => void;
  /** Callback when add node button is clicked */
  onAddNode?: () => void;
  /** Callback when delete button is clicked */
  onDelete?: () => void;
  /** Callback when grid toggle is clicked */
  onToggleGrid?: () => void;
  /** Whether delete action is available */
  canDelete?: boolean;
  /** Whether workflow is executing (Phase 4) */
  isExecuting?: boolean;
  /** Execution progress 0-100 (Phase 4) */
  executionProgress?: number;
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  onTest,
  onHideChat,
  onAddNode,
  onDelete,
  onToggleGrid,
  canDelete = false,
  isExecuting = false,
  executionProgress = 0,
}) => {
  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
      style={{
        bottom: '240px',
      }}
    >
      <div className="flex flex-col items-center gap-2">
        {/* Execution Progress Bar (Phase 4) */}
        {isExecuting && (
          <div className="w-full max-w-[200px] px-3 py-2 rounded-xl bg-dark-100/95 border border-green/30 shadow-dark-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-green font-medium flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Executing...
              </span>
              <span className="text-xs text-green font-mono">{Math.round(executionProgress)}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green transition-all duration-300 ease-out"
                style={{ width: `${executionProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Main Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-dark-100/95 border border-white/5 shadow-dark-lg backdrop-blur-sm">
          {/* Test/Stop Button */}
          <button 
            onClick={onTest}
            className={cn(
              "px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
              isExecuting
                ? "text-danger hover:text-danger hover:bg-danger/10"
                : "text-white/70 hover:text-white hover:bg-white/5"
            )}
          >
            {isExecuting ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Test
              </>
            )}
          </button>
          
          {/* Hide Chat Button */}
          <button 
            onClick={onHideChat}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Hide chat
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Timestamp */}
          <div className="px-3 py-1.5 rounded-xl bg-green/15 border border-green/30">
            <span className="text-sm text-green font-mono font-medium">11:44</span>
          </div>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Grid Toggle */}
          <button 
            onClick={onToggleGrid}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Toggle Grid"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          {/* Add Node */}
          <button 
            onClick={onAddNode}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Add Node"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Delete */}
          <button 
            onClick={onDelete}
            disabled={!canDelete}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
              canDelete
                ? "text-white/60 hover:text-danger hover:bg-danger/10"
                : "text-white/20 cursor-not-allowed"
            )}
            title={canDelete ? "Delete Selected (Delete)" : "Nothing selected"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
