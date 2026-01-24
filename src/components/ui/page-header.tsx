import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div className="animate-slide-in-left">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      {(actions || children) && (
        <div className="animate-fade-in flex items-center gap-4">
          {children}
          {actions}
        </div>
      )}
    </div>
  );
}
