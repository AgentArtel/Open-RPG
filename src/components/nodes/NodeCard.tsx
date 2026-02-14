import { cn } from '@/lib/utils';
import { Check, Bot, MessageSquare, Database, Globe, Code2, Webhook, Clock, GitBranch, Filter, Sparkles } from 'lucide-react';

interface NodeCardProps {
  type: string;
  title: string;
  subtitle: string;
  icon?: React.ComponentType<{ className?: string }>;
  isConfigured?: boolean;
  isDeactivated?: boolean;
  className?: string;
}

const nodeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'ai-agent': Bot,
  'trigger': MessageSquare,
  'memory': Database,
  'http-tool': Globe,
  'code-tool': Code2,
  'webhook': Webhook,
  'schedule': Clock,
  'if': GitBranch,
  'merge': Filter,
  'openai-chat': Sparkles,
  'anthropic-chat': Sparkles,
};

const nodeColors: Record<string, string> = {
  'ai-agent': 'text-green',
  'trigger': 'text-blue-400',
  'memory': 'text-purple-400',
  'http-tool': 'text-cyan-400',
  'code-tool': 'text-yellow-400',
  'webhook': 'text-orange-400',
  'schedule': 'text-pink-400',
  'if': 'text-red-400',
  'merge': 'text-indigo-400',
  'openai-chat': 'text-green',
  'anthropic-chat': 'text-green',
};

export const NodeCard: React.FC<NodeCardProps> = ({
  type,
  title,
  subtitle,
  icon: CustomIcon,
  isConfigured = false,
  isDeactivated = false,
  className = '',
}) => {
  const Icon = CustomIcon || nodeIcons[type] || Bot;
  const iconColor = nodeColors[type] || 'text-white';

  return (
    <div
      className={cn(
        'p-4 rounded-xl bg-dark-100 border transition-all duration-fast',
        'hover:border-green/30 hover:shadow-glow',
        isConfigured ? 'border-green/30' : 'border-white/5',
        isDeactivated && 'opacity-50',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center flex-shrink-0', iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
          <p className="text-xs text-white/50 truncate">{subtitle}</p>
        </div>
        {isConfigured && (
          <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-green" />
          </div>
        )}
      </div>
    </div>
  );
};
