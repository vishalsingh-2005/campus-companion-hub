import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ProfileDropdown } from './ProfileDropdown';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      {/* Top Header Bar */}
      <header className="fixed top-0 right-0 left-0 lg:left-72 h-16 bg-background/95 backdrop-blur-sm border-b z-40">
        <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
          {/* Left side - can add breadcrumbs or page title here */}
          <div className="flex-1" />
          
          {/* Right side - theme toggle, notifications and profile */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="lg:pl-72">
        <div className="px-4 py-6 sm:px-6 lg:px-8 pt-20 lg:pt-20">
          {children}
        </div>
      </main>
    </div>
  );
}
