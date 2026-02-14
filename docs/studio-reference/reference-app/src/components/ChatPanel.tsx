import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Minimize2, Maximize2, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isLoading = false,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        'fixed right-4 bottom-20 w-[380px] max-w-[90vw]',
        'bg-dark-100/98 backdrop-blur-xl border border-white/10 rounded-2xl',
        'shadow-2xl z-40 flex flex-col overflow-hidden',
        'animate-slide-up',
        isMinimized && 'h-auto',
        className
      )}
      style={{ height: isMinimized ? 'auto' : '500px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-dark-200/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-green/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-green" />
          </div>
          <div>
            <span className="text-sm font-medium text-white">Test Agent</span>
            <p className="text-[10px] text-white/40">Interactive testing</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-dark-200 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/40 text-sm">Start a conversation to test your agent</p>
                <p className="text-white/30 text-xs mt-1">Type a message below</p>
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
                    'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                    message.role === 'user' ? 'bg-white/10' : 'bg-green/20'
                  )}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-white/60" />
                    ) : (
                      <Bot className="w-4 h-4 text-green" />
                    )}
                  </div>
                  <div className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-3',
                    message.role === 'user' 
                      ? 'bg-green/20 text-white/90 rounded-br-md' 
                      : 'bg-dark-200 text-white/80 rounded-bl-md'
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-green/60 ml-1 animate-pulse" />
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/5 bg-dark-200/50">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-dark-200 border border-white/5 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-green/50 transition-all disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-green flex items-center justify-center text-dark hover:bg-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
