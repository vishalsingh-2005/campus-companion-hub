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
    // If a specific path is provided, use it
    if (backTo) {
      navigate(backTo);
      return;
    }

    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback: navigate to appropriate dashboard based on current path
      const path = location.pathname;
      if (path.startsWith('/teacher')) {
        navigate('/teacher/dashboard');
      } else if (path.startsWith('/student')) {
        navigate('/student/dashboard');
      } else if (path.startsWith('/admin')) {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
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
