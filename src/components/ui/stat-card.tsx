import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

type StatVariant = 'default' | 'success' | 'warning' | 'info' | 'destructive';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: StatVariant;
  className?: string;
  iconClassName?: string;
}

const variantStyles: Record<StatVariant, { icon: string; glow: string; ring: string }> = {
  default: {
    icon: 'bg-primary/12 text-primary',
    glow: 'group-hover:shadow-[0_8px_30px_hsl(252_85%_60%/0.18)]',
    ring: 'group-hover:ring-primary/20',
  },
  success: {
    icon: 'bg-success/12 text-success',
    glow: 'group-hover:shadow-[0_8px_30px_hsl(152_69%_40%/0.18)]',
    ring: 'group-hover:ring-success/20',
  },
  warning: {
    icon: 'bg-warning/12 text-warning',
    glow: 'group-hover:shadow-[0_8px_30px_hsl(38_92%_50%/0.18)]',
    ring: 'group-hover:ring-warning/20',
  },
  info: {
    icon: 'bg-info/12 text-info',
    glow: 'group-hover:shadow-[0_8px_30px_hsl(210_100%_52%/0.18)]',
    ring: 'group-hover:ring-info/20',
  },
  destructive: {
    icon: 'bg-destructive/12 text-destructive',
    glow: 'group-hover:shadow-[0_8px_30px_hsl(0_72%_51%/0.18)]',
    ring: 'group-hover:ring-destructive/20',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  description,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  iconClassName,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const numericValue = typeof value === 'number' ? value : null;
  const animatedValue = useAnimatedCounter(numericValue ?? 0);

  return (
    <div className={cn(
      'stat-card group ring-1 ring-transparent transition-all duration-500',
      styles.glow,
      styles.ring,
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground font-display tabular-nums">
            {numericValue !== null ? animatedValue : value}
          </p>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>}
          {description && <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{description}</p>}
          {trend && (
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'inline-flex items-center gap-0.5 text-xs sm:text-sm font-semibold px-1.5 py-0.5 rounded-md',
                trend.isPositive
                  ? 'text-success bg-success/10'
                  : 'text-destructive bg-destructive/10'
              )}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div className={cn(
          'flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 flex-shrink-0',
          iconClassName || styles.icon
        )}>
          <Icon className="h-5.5 w-5.5 sm:h-6.5 sm:w-6.5" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}
