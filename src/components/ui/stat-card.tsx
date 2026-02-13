import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

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

const variantStyles: Record<StatVariant, { icon: string; glow: string }> = {
  default: { icon: 'bg-primary/12 text-primary', glow: 'group-hover:shadow-[0_0_20px_hsl(252_85%_60%/0.15)]' },
  success: { icon: 'bg-success/12 text-success', glow: 'group-hover:shadow-[0_0_20px_hsl(152_69%_40%/0.15)]' },
  warning: { icon: 'bg-warning/12 text-warning', glow: 'group-hover:shadow-[0_0_20px_hsl(38_92%_50%/0.15)]' },
  info: { icon: 'bg-info/12 text-info', glow: 'group-hover:shadow-[0_0_20px_hsl(210_100%_52%/0.15)]' },
  destructive: { icon: 'bg-destructive/12 text-destructive', glow: 'group-hover:shadow-[0_0_20px_hsl(0_72%_51%/0.15)]' },
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

  return (
    <div className={cn(
      'stat-card group',
      styles.glow,
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground font-display">{value}</p>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>}
          {description && <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{description}</p>}
          {trend && (
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'text-xs sm:text-sm font-semibold',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div className={cn(
          'flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 flex-shrink-0',
          iconClassName || styles.icon
        )}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}
