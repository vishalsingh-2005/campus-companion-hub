import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  showBackButton?: boolean;
  backTo?: string;
}

export function PageHeader({ title, description, actions, children, showBackButton = true, backTo }: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      const path = location.pathname;
      if (path.startsWith('/teacher')) navigate('/teacher/dashboard');
      else if (path.startsWith('/student')) navigate('/student/dashboard');
      else if (path.startsWith('/admin')) navigate('/admin/dashboard');
      else if (path.startsWith('/organizer')) navigate('/organizer/dashboard');
      else navigate('/');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div className="animate-slide-in-left flex items-center gap-4">
        {showBackButton && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
            className="flex-shrink-0 rounded-xl h-10 w-10 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">{title}</h1>
          {description && (
            <p className="mt-1.5 text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </div>
      {(actions || children) && (
        <div className="animate-fade-in flex items-center gap-3">
          {children}
          {actions}
        </div>
      )}
    </div>
  );
}