import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, Bot, MessageSquare, Database, Globe, Code2, Webhook, Sparkles, ImageIcon, Eye } from 'lucide-react';
import type { NodeData } from '@/types';
import type { PortType } from '@/lib/portRegistry';

interface HighlightedPort {
  nodeId: string;
  portId: string;
}

interface CanvasNodeProps {
  data: NodeData;
  isSelected?: boolean;
  isRunning?: boolean;
  executionStatus?: 'waiting' | 'running' | 'success' | 'error' | 'skipped';
  connectedToolCount?: number;
  hasMemory?: boolean;
  isConnectionDrawing?: boolean;
  highlightedPorts?: HighlightedPort[];
  snappedPortId?: string | null;
  onClick?: (e?: React.MouseEvent) => void;
  onDragStart?: (e: React.MouseEvent, nodeId: string) => void;
  onPortMouseDown?: (e: React.MouseEvent, portId: string, portType: PortType) => void;
  onPortMouseUp?: (e: React.MouseEvent, portId: string, portType: PortType) => void;
  className?: string;
}

const nodeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'ai-agent': Bot,
  'trigger': MessageSquare,
  'memory': Database,
  'http-tool': Globe,
  'code-tool': Code2,
  'webhook': Webhook,
  'openai-chat': Sparkles,
  'anthropic-chat': Sparkles,
  'image-gen': ImageIcon,
  'gemini-chat': MessageSquare,
  'gemini-embed': Database,
  'gemini-vision': Eye,
};

const nodeColors: Record<string, string> = {
  'ai-agent': 'text-green',
  'trigger': 'text-blue-400',
  'memory': 'text-purple-400',
  'http-tool': 'text-cyan-400',
  'code-tool': 'text-yellow-400',
  'webhook': 'text-orange-400',
  'openai-chat': 'text-green',
  'anthropic-chat': 'text-green',
  'image-gen': 'text-pink-400',
  'gemini-chat': 'text-emerald-400',
  'gemini-embed': 'text-indigo-400',
  'gemini-vision': 'text-amber-400',
};

const portGlowColors: Record<string, string> = {
  input: 'shadow-[0_0_12px_rgba(34,197,94,0.6)]',
  output: 'shadow-[0_0_12px_rgba(34,197,94,0.6)]',
  tool: 'shadow-[0_0_12px_rgba(168,85,247,0.6)]',
  memory: 'shadow-[0_0_12px_rgba(59,130,246,0.6)]',
};

export const CanvasNode: React.FC<CanvasNodeProps> = ({
  data,
  isSelected = false,
  isRunning = false,
  executionStatus = 'waiting',
  connectedToolCount = 0,
  hasMemory = false,
  isConnectionDrawing = false,
  highlightedPorts = [],
  snappedPortId = null,
  onClick,
  onDragStart,
  onPortMouseDown,
  onPortMouseUp,
  className = '',
}) => {
  const Icon = nodeIcons[data.type] || Bot;
  const iconColor = nodeColors[data.type] || 'text-white';

  const isPortHighlighted = useCallback((portId: string) => {
    return highlightedPorts.some(p => p.nodeId === data.id && p.portId === portId);
  }, [highlightedPorts, data.id]);

  const isPortSnapped = useCallback((portId: string) => {
    return snappedPortId === portId;
  }, [snappedPortId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.port-handle')) return;
    e.stopPropagation();
    onDragStart?.(e, data.id);
  }, [data.id, onDragStart]);

  const handlePortMouseDown = useCallback((e: React.MouseEvent, portId: string, portType: PortType) => {
    e.stopPropagation();
    e.preventDefault();
    onPortMouseDown?.(e, portId, portType);
  }, [onPortMouseDown]);

  const handlePortMouseUp = useCallback((e: React.MouseEvent, portId: string, portType: PortType) => {
    e.stopPropagation();
    e.preventDefault();
    onPortMouseUp?.(e, portId, portType);
  }, [onPortMouseUp]);

  const getBorderStyle = () => {
    if (executionStatus === 'error') return 'border-danger shadow-[0_0_0_1px_rgba(229,77,77,0.4),0_0_12px_rgba(229,77,77,0.15)]';
    if (isSelected) return 'border-green shadow-glow';
    if (isRunning) return 'border-green animate-pulse-glow';
    return 'border-white/10 hover:border-green/30 hover:shadow-glow';
  };

  const renderPort = (portId: string, portType: PortType, positionClasses: string, borderColor: string) => {
    const highlighted = isConnectionDrawing && isPortHighlighted(portId);
    const snapped = isConnectionDrawing && isPortSnapped(portId);
    const dimmed = isConnectionDrawing && !highlighted && !isPortHighlighted(portId);

    return (
      <div className={cn('absolute group', positionClasses)}>
        {/* Invisible larger hit area - 32px */}
        <div
          className="port-handle absolute inset-0 w-8 h-8 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 cursor-crosshair z-10"
          onMouseDown={(e) => handlePortMouseDown(e, portId, portType)}
          onMouseUp={(e) => handlePortMouseUp(e, portId, portType)}
        />
        {/* Visual port circle - 20px */}
        <div
          className={cn(
            'port-handle w-5 h-5 rounded-full bg-dark-100 border-2 cursor-crosshair transition-all duration-150',
            borderColor,
            highlighted && !snapped && 'scale-125 animate-pulse',
            highlighted && portGlowColors[portType],
            snapped && 'scale-150 !border-green !bg-green/30',
            snapped && 'shadow-[0_0_16px_rgba(34,197,94,0.8)]',
            dimmed && 'opacity-30',
            !isConnectionDrawing && 'hover:scale-125 hover:shadow-glow',
          )}
        />
        {/* Label */}
        <span className={cn(
          'absolute text-[9px] text-white/40 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
          portType === 'input' && '-top-5 left-1/2 -translate-x-1/2',
          portType === 'output' && '-bottom-5 left-1/2 -translate-x-1/2',
          portType === 'tool' && 'top-1/2 -right-10 -translate-y-1/2',
          portType === 'memory' && 'top-1/2 -left-14 -translate-y-1/2',
        )}>
          {portType === 'input' ? 'Input' : portType === 'output' ? 'Output' : portType === 'tool' ? 'Tool' : 'Memory'}
        </span>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'absolute w-[220px] rounded-xl border backdrop-blur-sm cursor-grab active:cursor-grabbing select-none pb-4',
        'transition-all duration-fast ease-out-quart',
        (data.type === 'openai-chat' || data.type === 'anthropic-chat')
          ? 'bg-gradient-green border-[rgba(121,241,129,0.4)]'
          : 'bg-dark-100/95',
        getBorderStyle(),
        data.isDeactivated && 'opacity-60',
        className
      )}
      style={{
        left: data.position.x,
        top: data.position.y,
        animation: 'nodeAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
      onMouseDown={handleMouseDown}
      onClick={onClick}
    >
      {/* Execution status overlay */}
      {executionStatus !== 'waiting' && (
        <div className={cn(
          'absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center z-10',
          executionStatus === 'running' && 'bg-green/20 animate-pulse',
          executionStatus === 'success' && 'bg-green',
          executionStatus === 'error' && 'bg-danger',
          executionStatus === 'skipped' && 'bg-white/20',
        )}>
          {executionStatus === 'success' && <Check className="w-4 h-4 text-dark" />}
          {executionStatus === 'error' && <span className="text-white text-xs">×</span>}
          {executionStatus === 'running' && <div className="w-3 h-3 rounded-full bg-green" />}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className={cn('w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center flex-shrink-0', iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{data.title}</h3>
          <p className="text-xs text-white/50 truncate">{data.subtitle || data.type}</p>
        </div>
        {data.isConfigured && executionStatus === 'waiting' && (
          <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-green" />
          </div>
        )}
      </div>

      {/* Agent config summary */}
      {data.type === 'ai-agent' && data.config && (
        <div className="px-4 pb-1 flex flex-wrap gap-1">
          {(data.config as any).model && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green/10 text-green/80">
              {(data.config as any).model === 'gemini-2.5-flash' ? 'Flash' : 'Pro'}
            </span>
          )}
          {(data.config as any).agentType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400/80">
              {(data.config as any).agentType === 'tools-agent' ? 'Tools' : 'Chat'}
            </span>
          )}
          {connectedToolCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400/80">
              {connectedToolCount} tool{connectedToolCount > 1 ? 's' : ''}
            </span>
          )}
          {hasMemory && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400/80">
              Memory
            </span>
          )}
        </div>
      )}

      {/* Deactivated label */}
      {data.isDeactivated && (
        <div className="px-4 pb-2">
          <span className="text-[10px] text-white/40">(Deactivated)</span>
        </div>
      )}

      {/* Input port (top) */}
      {renderPort('input', 'input', '-top-2.5 left-1/2 -translate-x-1/2', 'border-white/30')}

      {/* Output port (bottom) */}
      {renderPort('output', 'output', '-bottom-2.5 left-1/2 -translate-x-1/2', 'border-green')}

      {/* Side ports for AI agents */}
      {data.type === 'ai-agent' && (
        <>
          {renderPort('tool', 'tool', 'top-1/2 -right-2.5 -translate-y-1/2', 'border-purple-400')}
          {renderPort('memory', 'memory', 'top-1/3 -left-2.5 -translate-y-1/2', 'border-blue-400')}
        </>
      )}
    </div>
  );
};
