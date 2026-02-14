import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ArrowRight, AlertCircle } from 'lucide-react';
import type { LogEntry } from '@/types';

interface LogsPanelProps {
  logs: LogEntry[];
}

export const LogsPanel: React.FC<LogsPanelProps> = ({ logs }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'warning':
        return (
          <div className="w-4 h-4 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-2.5 h-2.5 text-warning" />
          </div>
        );
      case 'error':
        return (
          <div className="w-4 h-4 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-2.5 h-2.5 text-danger" />
          </div>
        );
      case 'success':
        return (
          <div className="w-4 h-4 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-green" />
          </div>
        );
      default:
        return (
          <div className="w-4 h-4 rounded-full bg-blue-400/20 flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
          </div>
        );
    }
  };

  return (
    <div 
      className={`
        fixed left-0 right-0 bottom-0 bg-dark/98 border-t border-white/5 z-30
        transition-all duration-moderate ease-out-expo
        ${isExpanded ? 'h-[220px]' : 'h-[48px]'}
      `}
      style={{
        backdropFilter: 'blur(20px)',
        right: '400px', // Account for config panel
      }}
    >
      {/* Header */}
      <div 
        className="h-12 px-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-white/80">
            Latest Logs from AI Agent node
          </h3>
          <span className="text-xs text-white/40 px-2 py-0.5 rounded-full bg-white/5">
            {logs.length} entries
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              // Navigate to full logs
            }}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Logs Content */}
      {isExpanded && (
        <div className="h-[calc(220px-48px)] overflow-y-auto scrollbar-thin p-4">
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div 
                key={log.id}
                className="flex items-start gap-3 text-sm animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="text-white/40 font-mono text-xs whitespace-nowrap pt-0.5">
                  {log.timestamp}
                </span>
                {getLogIcon(log.type)}
                <span className={`
                  font-mono text-sm
                  ${log.type === 'success' ? 'text-green/80' : ''}
                  ${log.type === 'error' ? 'text-danger/80' : ''}
                  ${log.type === 'warning' ? 'text-warning/80' : ''}
                  ${log.type === 'info' ? 'text-white/60' : ''}
                `}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
