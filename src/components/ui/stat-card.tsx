import { ReactNode } from 'react';
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
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground font-display">{value}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {trend && (
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'text-sm font-semibold',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3',
          iconClassName || styles.icon
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}