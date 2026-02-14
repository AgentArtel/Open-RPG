import { cn } from '@/lib/utils';
import { Key, Edit2, Trash2, Check, AlertCircle } from 'lucide-react';

interface CredentialCardProps {
  id: string;
  name: string;
  type: string;
  isConnected: boolean;
  lastUsed?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onTest?: () => void;
  className?: string;
}

const credentialIcons: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠',
  google: '🔍',
  slack: '💬',
  github: '💻',
  notion: '📝',
  default: '🔑',
};

export const CredentialCard: React.FC<CredentialCardProps> = ({
  name,
  type,
  isConnected,
  lastUsed,
  onEdit,
  onDelete,
  onTest,
  className = '',
}) => {
  const icon = credentialIcons[type.toLowerCase()] || credentialIcons.default;

  return (
    <div 
      className={cn(
        'group relative p-5 rounded-2xl bg-dark-100 border transition-all duration-fast',
        isConnected 
          ? 'border-green/30 hover:border-green/50 hover:shadow-glow' 
          : 'border-white/5 hover:border-white/10',
        className
      )}
    >
      {/* Status indicator */}
      <div className={cn(
        'absolute top-4 right-4 w-2.5 h-2.5 rounded-full',
        isConnected ? 'bg-green' : 'bg-white/20'
      )}>
        {isConnected && (
          <div className="absolute inset-0 rounded-full bg-green animate-ping opacity-30" />
        )}
      </div>

      {/* Content */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-dark-200 flex items-center justify-center text-2xl">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
          <p className="text-xs text-white/50 capitalize">{type}</p>
          
          {/* Status */}
          <div className="flex items-center gap-2 mt-2">
            {isConnected ? (
              <>
                <Check className="w-3.5 h-3.5 text-green" />
                <span className="text-xs text-green">Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-white/30" />
                <span className="text-xs text-white/40">Not connected</span>
              </>
            )}
          </div>
          
          {lastUsed && (
            <p className="text-[10px] text-white/30 mt-1">
              Last used: {lastUsed}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </button>
        {onTest && (
          <button
            onClick={onTest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-green hover:bg-green/10 transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            Test
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-danger hover:bg-danger/10 transition-colors ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
