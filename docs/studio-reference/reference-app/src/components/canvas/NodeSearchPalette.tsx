import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Bot, MessageSquare, Database, Globe, Code2, Webhook, Sparkles, Clock, GitBranch, Filter } from 'lucide-react';
import type { NodeType } from '@/types';

interface NodeCategory {
  id: string;
  label: string;
  nodes: NodeItem[];
}

interface NodeItem {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const nodeCategories: NodeCategory[] = [
  {
    id: 'triggers',
    label: 'Triggers',
    nodes: [
      { id: 'chat-trigger', type: 'trigger', label: 'Chat Message', description: 'When a chat message is received', icon: MessageSquare },
      { id: 'webhook-trigger', type: 'webhook', label: 'Webhook', description: 'When a webhook is called', icon: Webhook },
      { id: 'schedule-trigger', type: 'schedule', label: 'Schedule', description: 'Run on a schedule', icon: Clock },
    ],
  },
  {
    id: 'agents',
    label: 'AI Agents',
    nodes: [
      { id: 'ai-agent', type: 'ai-agent', label: 'AI Agent', description: 'Tools-based AI agent', icon: Bot },
    ],
  },
  {
    id: 'models',
    label: 'Language Models',
    nodes: [
      { id: 'openai-chat', type: 'openai-chat', label: 'OpenAI Chat', description: 'GPT-4, GPT-3.5, etc.', icon: Sparkles },
      { id: 'anthropic-chat', type: 'anthropic-chat', label: 'Claude', description: 'Anthropic Claude models', icon: Sparkles },
    ],
  },
  {
    id: 'memory',
    label: 'Memory',
    nodes: [
      { id: 'postgres-memory', type: 'memory', label: 'Postgres Memory', description: 'Persistent chat memory', icon: Database },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    nodes: [
      { id: 'http-request', type: 'http-tool', label: 'HTTP Request', description: 'Make HTTP API calls', icon: Globe },
      { id: 'code-tool', type: 'code-tool', label: 'Code', description: 'Run JavaScript or Python', icon: Code2 },
      { id: 'if-condition', type: 'if', label: 'If', description: 'Conditional branching', icon: GitBranch },
      { id: 'merge', type: 'merge', label: 'Merge', description: 'Merge multiple inputs', icon: Filter },
    ],
  },
];

interface NodeSearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (nodeType: NodeType) => void;
  position?: { x: number; y: number };
}

export const NodeSearchPalette: React.FC<NodeSearchPaletteProps> = ({
  isOpen,
  onClose,
  onSelectNode,
  position: _position,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten all nodes for keyboard navigation
  const allNodes = nodeCategories.flatMap(cat => cat.nodes);
  const filteredNodes = allNodes.filter(node =>
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredNodes.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredNodes.length) % filteredNodes.length);
      } else if (e.key === 'Enter' && filteredNodes[selectedIndex]) {
        onSelectNode(filteredNodes[selectedIndex].type);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredNodes, selectedIndex, onClose, onSelectNode]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-32"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Palette */}
      <div 
        className="relative w-full max-w-2xl bg-dark-100 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/5">
          <Search className="w-5 h-5 text-white/40" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search nodes..."
            className="flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none"
          />
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Node list */}
        <div className="max-h-[400px] overflow-y-auto">
          {searchQuery ? (
            // Search results
            <div className="p-2">
              {filteredNodes.map((node, index) => (
                <button
                  key={node.id}
                  onClick={() => {
                    onSelectNode(node.type);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    index === selectedIndex 
                      ? 'bg-green/10 border border-green/30' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center">
                    <node.icon className="w-5 h-5 text-white/60" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{node.label}</p>
                    <p className="text-xs text-white/50">{node.description}</p>
                  </div>
                </button>
              ))}
              {filteredNodes.length === 0 && (
                <div className="p-8 text-center text-white/40">
                  No nodes found
                </div>
              )}
            </div>
          ) : (
            // Categorized list
            nodeCategories.map(category => (
              <div key={category.id} className="p-2">
                <p className="px-3 py-2 text-[11px] uppercase tracking-wider text-white/40 font-medium">
                  {category.label}
                </p>
                {category.nodes.map((node, index) => {
                  const globalIndex = nodeCategories
                    .slice(0, nodeCategories.findIndex(c => c.id === category.id))
                    .reduce((acc, c) => acc + c.nodes.length, 0) + index;
                  
                  return (
                    <button
                      key={node.id}
                      onClick={() => {
                        onSelectNode(node.type);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        globalIndex === selectedIndex 
                          ? 'bg-green/10 border border-green/30' 
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center">
                        <node.icon className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">{node.label}</p>
                        <p className="text-xs text-white/50">{node.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-dark-200/50 border-t border-white/5 text-xs text-white/40">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
