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
import { MessageSquare, Plus, Trash2, LayoutGrid, Play, Square, Loader2, PanelRight, X } from 'lucide-react';
import type { ChatMode } from '@/components/ChatPanel';

export interface BottomToolbarProps {
  onTest?: () => void;
  onAddNode?: () => void;
  onDelete?: () => void;
  onToggleGrid?: () => void;
  canDelete?: boolean;
  isExecuting?: boolean;
  executionProgress?: number;
  chatMode?: ChatMode;
  onChatModeChange?: (mode: ChatMode) => void;
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  onTest,
  onAddNode,
  onDelete,
  onToggleGrid,
  canDelete = false,
  isExecuting = false,
  executionProgress = 0,
  chatMode = 'closed',
  onChatModeChange,
}) => {
  const handleChatClick = () => {
    if (!onChatModeChange) return;
    const next: Record<ChatMode, ChatMode> = {
      closed: 'popup',
      popup: 'docked',
      docked: 'closed',
    };
    onChatModeChange(next[chatMode]);
  };

  const chatLabel = chatMode === 'closed' ? 'Chat' : chatMode === 'popup' ? 'Dock Chat' : 'Close Chat';
  const ChatIcon = chatMode === 'closed' ? MessageSquare : chatMode === 'popup' ? PanelRight : X;
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

          {/* Chat Mode Button */}
          <button 
            onClick={handleChatClick}
            className={cn(
              "px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
              chatMode !== 'closed'
                ? "text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10"
                : "text-white/70 hover:text-white hover:bg-white/5"
            )}
          >
            <ChatIcon className="w-4 h-4" />
            {chatLabel}
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
