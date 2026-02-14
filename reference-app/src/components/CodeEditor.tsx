import { cn } from '@/lib/utils';
import { useState, useCallback } from 'react';
import { Copy, Check, Play, Download } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: 'javascript' | 'typescript' | 'python' | 'json' | 'sql';
  label?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  height?: string;
  onRun?: () => void;
  className?: string;
}

const languageLabels: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  json: 'JSON',
  sql: 'SQL',
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
  label,
  readOnly = false,
  showLineNumbers = true,
  height = '300px',
  onRun,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const lines = value.split('\n');

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${language === 'json' ? 'json' : language === 'python' ? 'py' : 'js'}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [value, language]);

  return (
    <div className={cn('rounded-xl overflow-hidden border border-white/5 bg-dark-200', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-dark-100 border-b border-white/5">
        <div className="flex items-center gap-3">
          {label && <span className="text-sm text-white/60">{label}</span>}
          <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-white/40 uppercase">
            {languageLabels[language]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onRun && (
            <button
              onClick={onRun}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-green hover:bg-green/10 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Run
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            title="Copy"
          >
            {copied ? <Check className="w-4 h-4 text-green" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div 
        className="relative overflow-auto scrollbar-thin"
        style={{ height }}
      >
        <div className="flex">
          {showLineNumbers && (
            <div className="flex-shrink-0 py-3 px-3 text-right bg-dark-100/50 select-none">
              {lines.map((_, i) => (
                <div 
                  key={i} 
                  className="text-xs text-white/20 font-mono leading-6"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          )}
          <div className="flex-1 relative min-w-0">
            <textarea
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              readOnly={readOnly}
              spellCheck={false}
              className={cn(
                'w-full h-full p-3 text-sm font-mono text-white/80 bg-transparent resize-none',
                'focus:outline-none',
                'leading-6',
                readOnly && 'cursor-default'
              )}
              style={{ 
                tabSize: 2,
                whiteSpace: 'pre',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
