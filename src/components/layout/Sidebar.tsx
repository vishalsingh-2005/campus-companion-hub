import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Shield,
  User,
  ShieldAlert,
  Video,
  MapPin,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, BarChart3, CalendarCheck, CalendarDays } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('admin' | 'teacher' | 'student')[];
}

const adminNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: GraduationCap, roles: ['admin'] },
  { name: 'Teachers', href: '/teachers', icon: Users, roles: ['admin'] },
  { name: 'Courses', href: '/courses', icon: BookOpen, roles: ['admin'] },
  { name: 'Enrollments', href: '/enrollments', icon: ClipboardList, roles: ['admin'] },
  { name: 'Live Sessions', href: '/live-sessions', icon: Video, roles: ['admin'] },
  { name: 'Schedules', href: '/schedules', icon: CalendarDays, roles: ['admin'] },
  { name: 'Locations', href: '/admin/locations', icon: MapPin, roles: ['admin'] },
  { name: 'Secure Attendance', href: '/secure-attendance', icon: Shield, roles: ['admin'] },
  { name: 'Attendance', href: '/attendance', icon: CalendarCheck, roles: ['admin'] },
  { name: 'Proxy Monitoring', href: '/admin/proxy-monitoring', icon: ShieldAlert, roles: ['admin'] },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3, roles: ['admin'] },
  { name: 'User Accounts', href: '/admin/users', icon: UserPlus, roles: ['admin'] },
];

const teacherNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Profile', href: '/teacher/profile', icon: User },
  { name: 'Live Sessions', href: '/live-sessions', icon: Video },
  { name: 'Secure Attendance', href: '/secure-attendance', icon: Shield },
  { name: 'Schedules', href: '/schedules', icon: CalendarDays },
  { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { name: 'Reports', href: '/attendance/reports', icon: BarChart3 },
];

import { Settings, User as UserIcon, Bell } from 'lucide-react';

const studentNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Profile', href: '/student/profile', icon: UserIcon },
  { name: 'My Courses', href: '/student/courses', icon: BookOpen },
  { name: 'My Attendance', href: '/student/attendance', icon: CalendarCheck },
  { name: 'Mark Attendance', href: '/student/mark-attendance', icon: Shield },
  { name: 'My Schedule', href: '/student/schedule', icon: CalendarDays },
  { name: 'Live Classes', href: '/live-sessions', icon: Video },
  { name: 'Notices', href: '/student/notices', icon: Bell },
  { name: 'Settings', href: '/student/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { role, isAdmin, isTeacher, isStudent } = useUserRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Get navigation based on role
  const getNavigation = () => {
    if (isAdmin) return adminNavigation;
    if (isTeacher) return teacherNavigation;
    if (isStudent) return studentNavigation;
    return [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }];
  };

  const navigation = getNavigation();

  const getRoleBadge = () => {
    if (isAdmin) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
          <Shield className="h-3 w-3" />
          Admin
        </span>
      );
    }
    if (isTeacher) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
          <BookOpen className="h-3 w-3" />
          Teacher
        </span>
      );
    }
    if (isStudent) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
          <GraduationCap className="h-3 w-3" />
          Student
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        <User className="h-3 w-3" />
        User
      </span>
    );
  };

  const getRoleLabel = () => {
    if (isAdmin) return 'Administrator';
    if (isTeacher) return 'Teacher';
    if (isStudent) return 'Student';
    return 'User';
  };

  const NavContent = () => (
    <>
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
          <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-sidebar-foreground">CMS</span>
          <span className="text-xs text-sidebar-foreground/60">College Management</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground text-sm font-medium">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {getRoleLabel()}
              </p>
              {getRoleBadge()}
            </div>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar text-sidebar-foreground shadow-lg"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-foreground/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-40 w-72 bg-sidebar flex flex-col transition-transform duration-300',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-72 bg-sidebar flex-col">
        <NavContent />
      </aside>
    </>
  );
}
