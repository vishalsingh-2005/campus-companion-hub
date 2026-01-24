import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-destructive/10 blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-md animate-scale-in">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 animate-pulse">
            <ShieldX className="h-12 w-12 text-destructive" />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Access Denied
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>

        {/* Additional info */}
        <div className="mt-12 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground">
            <strong>Error Code:</strong> 403 Forbidden
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Your current role does not have the required permissions for this resource.
          </p>
        </div>
      </div>
    </div>
  );
}
