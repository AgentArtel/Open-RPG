import { cn } from '@/lib/utils';

interface Guide {
  type: 'horizontal' | 'vertical';
  position: number;
}

interface AlignmentGuidesProps {
  guides: Guide[];
  className?: string;
}

export const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({
  guides,
  className = '',
}) => {
  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      {guides.map((guide, index) => (
        <div
          key={index}
          className={cn(
            'absolute bg-green/60',
            guide.type === 'horizontal'
              ? 'left-0 right-0 h-px'
              : 'top-0 bottom-0 w-px'
          )}
          style={{
            [guide.type === 'horizontal' ? 'top' : 'left']: guide.position,
          }}
        >
          {/* Glow effect */}
          <div
            className={cn(
              'absolute bg-green/30 blur-sm',
              guide.type === 'horizontal'
                ? 'left-0 right-0 h-2 -top-1'
                : 'top-0 bottom-0 w-2 -left-1'
            )}
          />
        </div>
      ))}
    </div>
  );
};
