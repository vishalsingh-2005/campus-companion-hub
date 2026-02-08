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
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const sidebarWidth = preferences.sidebar_collapsed ? 'lg:left-[68px]' : 'lg:left-72';
  const mainPadding = preferences.sidebar_collapsed ? 'lg:pl-[68px]' : 'lg:pl-72';

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <header className={cn(
        'fixed top-0 right-0 left-0 h-16 bg-background/95 backdrop-blur-sm border-b z-40 transition-all duration-300',
        sidebarWidth
      )}>
        <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationsDropdown />
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className={cn('transition-all duration-300', mainPadding)}>
        <div className="px-4 py-6 sm:px-6 lg:px-8 pt-20 lg:pt-20">
          {children}
        </div>
      </main>
    </div>
  );
}
