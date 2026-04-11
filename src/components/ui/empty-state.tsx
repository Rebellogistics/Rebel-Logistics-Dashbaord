import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}

const TONE: Record<NonNullable<EmptyStateProps['tone']>, { tile: string; ring: string; icon: string }> = {
  neutral: { tile: 'bg-muted', ring: 'ring-rebel-border', icon: 'text-rebel-text-tertiary' },
  accent: { tile: 'bg-rebel-accent-surface', ring: 'ring-rebel-accent/20', icon: 'text-rebel-accent' },
  success: { tile: 'bg-rebel-success-surface', ring: 'ring-rebel-success/20', icon: 'text-rebel-success' },
  warning: { tile: 'bg-rebel-warning-surface', ring: 'ring-rebel-warning/20', icon: 'text-rebel-warning' },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  tone = 'accent',
}: EmptyStateProps) {
  const t = TONE[tone];
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-rebel-border bg-card px-6 py-12 text-center flex flex-col items-center gap-3',
        className,
      )}
    >
      <div
        className={cn(
          'h-14 w-14 rounded-2xl flex items-center justify-center ring-1',
          t.tile,
          t.ring,
        )}
      >
        <Icon className={cn('w-6 h-6', t.icon)} />
      </div>
      <div className="space-y-1 max-w-md">
        <p className="text-[14px] font-bold text-rebel-text">{title}</p>
        {description && (
          <p className="text-[11.5px] text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5 mt-1"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
