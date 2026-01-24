import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface RoleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  iconBg: string;
  onClick: () => void;
  delay?: number;
}

export function RoleCard({
  title,
  description,
  icon: Icon,
  gradient,
  iconBg,
  onClick,
  delay = 0,
}: RoleCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center p-8 rounded-2xl border-2 border-transparent',
        'bg-card shadow-lg transition-all duration-500 ease-out',
        'hover:shadow-2xl hover:-translate-y-2 hover:border-primary/30',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'animate-slide-up'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background gradient on hover */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500',
          'group-hover:opacity-10',
          gradient
        )}
      />

      {/* Icon container */}
      <div
        className={cn(
          'relative flex h-24 w-24 items-center justify-center rounded-2xl mb-6',
          'transition-all duration-500 group-hover:scale-110 group-hover:rotate-3',
          iconBg
        )}
      >
        <Icon className="h-12 w-12 text-white transition-transform duration-300 group-hover:scale-110" />
        
        {/* Floating animation rings */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className={cn('absolute inset-0 rounded-2xl animate-ping', iconBg, 'opacity-20')} />
        </div>
      </div>

      {/* Text content */}
      <h3 className="text-xl font-bold text-foreground mb-2 transition-colors group-hover:text-primary">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-[180px]">
        {description}
      </p>

      {/* Arrow indicator */}
      <div className="mt-4 flex items-center gap-1 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:gap-2">
        <span className="text-sm font-medium">Continue</span>
        <svg
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
