import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { Terminal, Download, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  nodeId?: string;
  nodeName?: string;
  message: string;
  data?: Record<string, unknown>;
}

interface ExecutionLogProps {
  logs: LogEntry[];
  isOpen: boolean;
  onClose: () => void;
  onClear?: () => void;
  className?: string;
}

const levelColors = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-danger',
  debug: 'text-white/40',
};

const levelBgColors = {
  info: 'bg-blue-400/10',
  warn: 'bg-yellow-400/10',
  error: 'bg-danger/10',
  debug: 'bg-white/5',
};

export const ExecutionLog: React.FC<ExecutionLogProps> = ({
  logs,
  isOpen,
  onClose,
  onClear,
  className = '',
}) => {
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter(log => 
    filter === 'all' || log.level === filter
  );

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedEntries);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedEntries(newSet);
  };

  const handleDownload = () => {
    const content = logs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.nodeName ? `[${log.nodeName}] ` : ''}${log.message}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-log-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        'fixed right-0 bottom-0 w-[500px] max-w-[90vw] h-[400px]',
        'bg-dark-100/98 backdrop-blur-xl border border-white/10 rounded-tl-2xl',
        'shadow-2xl z-50 flex flex-col animate-slide-left',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-green" />
          <span className="text-sm font-medium text-white">Execution Log</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white/60">
            {filteredLogs.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Filter buttons */}
          <div className="flex items-center gap-0.5 mr-2">
            {(['all', 'info', 'warn', 'error'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2 py-1 rounded text-[10px] uppercase transition-colors',
                  filter === f 
                    ? 'bg-white/10 text-white' 
                    : 'text-white/40 hover:text-white/60'
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg text-white/40 hover:text-danger hover:bg-danger/10 transition-colors"
            title="Clear"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">
            No logs to display
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedEntries.has(log.id);
            
            return (
              <div
                key={log.id}
                className={cn(
                  'rounded-lg overflow-hidden',
                  levelBgColors[log.level]
                )}
              >
                <button
                  onClick={() => log.data && toggleExpanded(log.id)}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left"
                >
                  <span className={cn('text-[10px] uppercase font-medium mt-0.5', levelColors[log.level])}>
                    {log.level}
                  </span>
                  <span className="text-[10px] text-white/30 mt-0.5">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  {log.nodeName && (
                    <span className="text-[10px] text-white/40 mt-0.5">
                      [{log.nodeName}]
                    </span>
                  )}
                  <span className="flex-1 text-sm text-white/70">{log.message}</span>
                  {log.data && (
                    isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> 
                               : <ChevronDown className="w-4 h-4 text-white/40" />
                  )}
                </button>
                {isExpanded && log.data && (
                  <div className="px-3 pb-3">
                    <pre className="text-xs font-mono text-white/50 bg-dark-200/50 rounded-lg p-2 overflow-auto">
                      {JSON.stringify(log.data as Record<string, unknown>, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
