import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  showBackButton?: boolean;
}

export function PageHeader({ title, description, actions, children, showBackButton = true }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div className="animate-slide-in-left flex items-center gap-4">
        {showBackButton && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="flex-shrink-0"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 text-muted-foreground">{description}</p>
          )}
        </div>
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
