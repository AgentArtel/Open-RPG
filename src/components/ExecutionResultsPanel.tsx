import React, { useState } from 'react';
import { X, Image, MessageSquare, Binary, Eye, CheckCircle, AlertCircle, Clock, Bot } from 'lucide-react';
import type { NodeData } from '@/types';
import type { ExecutionState } from '@/hooks/useExecution';

interface ExecutionResultsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: NodeData[];
  nodeResults: Record<string, any>;
  executionState: ExecutionState;
  duration?: number;
}

export const ExecutionResultsPanel: React.FC<ExecutionResultsPanelProps> = ({
  isOpen,
  onClose,
  nodes,
  nodeResults,
  executionState,
  duration,
}) => {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  if (!isOpen) return null;

  const nodeEntries = Object.entries(nodeResults).filter(([_, result]) => result);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'image-gen': return <Image className="w-4 h-4 text-pink-400" />;
      case 'gemini-chat': return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'gemini-embed': return <Binary className="w-4 h-4 text-purple-400" />;
      case 'gemini-vision': return <Eye className="w-4 h-4 text-cyan-400" />;
      case 'ai-agent': return <Bot className="w-4 h-4 text-green" />;
      default: return <CheckCircle className="w-4 h-4 text-green" />;
    }
  };

  const renderResult = (nodeId: string, result: any, node?: NodeData) => {
    if (result.error) {
      return (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{result.error}</p>
        </div>
      );
    }

    if (result.imageDataUrl) {
      return (
        <div className="space-y-2">
          <img
            src={result.imageDataUrl}
            alt="Generated image"
            className="w-full max-w-md rounded-lg border border-white/10"
          />
        </div>
      );
    }

    if (result.text) {
      return (
        <div className="space-y-2">
          <div className="p-3 bg-dark-200 rounded-lg">
            <p className="text-sm text-white/80 whitespace-pre-wrap">{result.text}</p>
          </div>
          {/* Tool call logs */}
          {result.toolCalls && result.toolCalls.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Tool Calls ({result.iterations} iterations)</p>
              {result.toolCalls.map((tc: any, i: number) => (
                <div key={i} className="p-2 bg-purple-400/5 border border-purple-400/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400">{tc.tool}</span>
                    <span className="text-[10px] text-white/30">iteration {tc.iteration}</span>
                  </div>
                  <pre className="text-[10px] text-white/50 overflow-auto max-h-20">{JSON.stringify(tc.result, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
          {result.iterations && result.iterations > 1 && !result.toolCalls && (
            <span className="text-[10px] text-white/30">{result.iterations} iterations</span>
          )}
          {result.memorySessionId && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400/60">Memory: {result.memorySessionId}</span>
          )}
          {result.model && (
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <span className="px-1.5 py-0.5 rounded bg-white/5">{result.model}</span>
              {result.toolCount > 0 && <span>{result.toolCount} tools</span>}
              {result.usage && <span>Tokens: {JSON.stringify(result.usage)}</span>}
            </div>
          )}
        </div>
      );
    }

    if (result.dimensions != null) {
      return (
        <div className="p-3 bg-dark-200 rounded-lg">
          <p className="text-sm text-white/60">Embedding: {result.dimensions} dimensions</p>
        </div>
      );
    }

    if (result.simulated) {
      return (
        <div className="p-2 bg-dark-200 rounded-lg">
          <p className="text-xs text-white/40">Simulated — no backend for this node type</p>
        </div>
      );
    }

    if (result.triggered) {
      return (
        <div className="p-2 bg-dark-200 rounded-lg">
          <p className="text-xs text-white/40">Triggered ✓</p>
        </div>
      );
    }

    return (
      <div className="p-2 bg-dark-200 rounded-lg">
        <pre className="text-xs text-white/50 overflow-auto max-h-32">{JSON.stringify(result, null, 2)}</pre>
      </div>
    );
  };

  return (
    <div className="absolute bottom-16 left-0 right-0 z-30 mx-4 mb-2 animate-in slide-in-from-bottom duration-300">
      <div className="bg-dark-100/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-[60vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            {executionState === 'completed' ? (
              <CheckCircle className="w-5 h-5 text-green" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <h3 className="text-sm font-semibold text-white">
              Execution {executionState === 'completed' ? 'Complete' : 'Failed'}
            </h3>
            {duration != null && (
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Clock className="w-3 h-3" />
                {(duration / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto p-4 space-y-3">
          {nodeEntries.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-4">No results</p>
          ) : (
            nodeEntries.map(([nodeId, result]) => {
              const node = nodes.find(n => n.id === nodeId);
              const isExpanded = expandedNode === nodeId;
              return (
                <div key={nodeId} className="border border-white/5 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedNode(isExpanded ? null : nodeId)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                  >
                    {getNodeIcon(node?.type || '')}
                    <span className="text-sm text-white/80 font-medium">{node?.title || nodeId}</span>
                    {result.error && <span className="ml-auto text-xs text-red-400">Error</span>}
                    {!result.error && <span className="ml-auto text-xs text-green">Success</span>}
                  </button>
                  {(isExpanded || result.imageDataUrl) && (
                    <div className="px-3 pb-3">
                      {renderResult(nodeId, result, node)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
