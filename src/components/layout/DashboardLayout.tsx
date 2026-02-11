import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ProfileDropdown } from './ProfileDropdown';
import { NotificationsDropdown } from './NotificationsDropdown';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const { preferences } = usePreferences();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background gradient-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl gradient-primary animate-pulse shadow-glow" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const sidebarWidth = preferences.sidebar_collapsed ? 'lg:left-[72px]' : 'lg:left-[280px]';
  const mainPadding = preferences.sidebar_collapsed ? 'lg:pl-[72px]' : 'lg:pl-[280px]';

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <Sidebar />
      
      {/* Top bar — glass floating navbar */}
      <header className={cn(
        'fixed top-0 right-0 left-0 z-40 transition-all duration-500',
        sidebarWidth
      )}>
        <div className="m-3 mb-0 rounded-2xl glass shadow-md">
          <div className="flex items-center justify-between h-14 px-5">
            <div className="flex-1" />
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <NotificationsDropdown />
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      <main className={cn('transition-all duration-500', mainPadding)}>
        <div className="px-4 py-6 sm:px-6 lg:px-8 pt-24 lg:pt-24 page-transition">
          {children}
        </div>
      </main>
    </div>
  );
}