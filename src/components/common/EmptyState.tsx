import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  className?: string;
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, actions, className, children }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center animate-fade-in',
      className
    )}>
      <div className="relative mb-6">
        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-primary/8 flex items-center justify-center">
          <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-primary/60" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-accent/20 animate-pulse" />
        <div className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-primary/15 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-foreground font-display mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actions.map((action, i) => {
            const ActionIcon = action.icon;
            const btn = (
              <Button
                key={action.label}
                variant={i === 0 ? 'default' : 'outline'}
                size="sm"
                onClick={action.onClick}
                className={cn(
                  'rounded-xl gap-2 transition-all duration-300',
                  i === 0 && 'shadow-md hover:shadow-lg hover:shadow-primary/20'
                )}
              >
                {ActionIcon && <ActionIcon className="h-4 w-4" />}
                {action.label}
              </Button>
            );
            return action.href ? (
              <Link key={action.label} to={action.href}>{btn}</Link>
            ) : btn;
          })}
        </div>
      )}
      {children}
    </div>
  );
}
