import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, PanelRightClose, PanelRight, Sparkles, Loader2 } from 'lucide-react';
import { geminiChat } from '@/lib/geminiServices';
import type { NodeData } from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type ChatMode = 'closed' | 'popup' | 'docked';

interface ChatPanelProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  agentNode?: NodeData | null;
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  mode,
  onModeChange,
  agentNode,
  className = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const config = agentNode?.config || {};
  const agentName = agentNode?.title || 'AI Agent';
  const modelName = config.model || 'gemini-2.5-flash';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (mode !== 'closed') {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [mode]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });

      const result = await geminiChat({
        messages: history,
        model: modelName,
        temperature: (config.temperature as number) ?? 0.7,
        maxTokens: (config.maxTokens as number) ?? 4096,
        systemPrompt: (config.systemPrompt as string) || 'You are a helpful assistant.',
      });

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-resp`,
        role: 'assistant',
        content: result.text || result.error || 'No response received.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to get response'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (mode === 'closed') return null;

  const isDocked = mode === 'docked';

  const content = (
    <div
      className={cn(
        'flex flex-col bg-[hsl(var(--card))] border-l border-[hsl(var(--border))]',
        isDocked ? 'h-full' : 'fixed right-4 bottom-20 w-[400px] max-w-[90vw] h-[520px] rounded-2xl border shadow-2xl z-40 animate-slide-up',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[hsl(var(--primary))]/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">{agentName}</span>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{modelName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onModeChange(isDocked ? 'popup' : 'docked')}
            className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
            title={isDocked ? 'Undock to popup' : 'Dock to side'}
          >
            {isDocked ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onModeChange('closed')}
            className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
            </div>
            <p className="text-[hsl(var(--muted-foreground))] text-sm">Chat with your agent</p>
            <p className="text-[hsl(var(--muted-foreground))]/60 text-xs mt-1">
              {agentNode ? `Using ${modelName}` : 'Add an AI Agent node to the canvas first'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                message.role === 'user'
                  ? 'bg-[hsl(var(--muted))]'
                  : 'bg-[hsl(var(--primary))]/20'
              )}>
                {message.role === 'user' ? (
                  <User className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                )}
              </div>
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                message.role === 'user'
                  ? 'bg-[hsl(var(--primary))]/20 text-[hsl(var(--foreground))] rounded-br-md'
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]/90 rounded-bl-md'
              )}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--primary))]/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
            </div>
            <div className="bg-[hsl(var(--muted))] rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--primary))]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[hsl(var(--border))] shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={agentNode ? 'Type a message...' : 'No agent node found'}
            disabled={isLoading || !agentNode}
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--primary))]/50 transition-all disabled:opacity-50 resize-none min-h-[40px] max-h-[120px]"
            style={{ fieldSizing: 'content' } as any}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || !agentNode}
            className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return content;
};
