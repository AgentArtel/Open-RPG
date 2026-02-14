import React from 'react';
import { cn } from '@/lib/utils';
import { Chip } from '@/components/ui-custom/Chip';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap } from 'lucide-react';

interface TemplateCardProps {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  nodes: number;
  image?: string;
  onUse?: () => void;
  onPreview?: () => void;
  className?: string;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  name,
  description,
  category,
  difficulty,
  nodes,
  image,
  onUse,
  onPreview,
  className,
}) => {
  const difficultyColors = {
    beginner: 'green' as const,
    intermediate: 'yellow' as const,
    advanced: 'red' as const,
  };

  return (
    <div 
      className={cn(
        "bg-dark-100/80 border border-white/5 rounded-xl overflow-hidden group",
        "hover:border-green/20 hover:shadow-glow transition-all duration-fast",
        className
      )}
    >
      {/* Preview Image */}
      <div className="relative h-40 bg-dark-200 overflow-hidden">
        {image ? (
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-green/10 flex items-center justify-center">
              <Zap className="w-8 h-8 text-green/50" />
            </div>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Chip variant="gray" size="sm">{category}</Chip>
        </div>
        <div className="absolute top-3 right-3">
          <Chip variant={difficultyColors[difficulty]} size="sm">
            {difficulty}
          </Chip>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h4 className="text-base font-medium text-white mb-2">{name}</h4>
        <p className="text-sm text-white/50 line-clamp-2 mb-4">{description}</p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">{nodes} nodes</span>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white/60 hover:text-white"
              onClick={onPreview}
            >
              Preview
            </Button>
            <Button 
              size="sm"
              className="bg-green text-dark hover:bg-green-light"
              onClick={onUse}
            >
              Use
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
