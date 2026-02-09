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
  Video,
  MapPin,
  IndianRupee,
  Code2,
  Calendar,
  Megaphone,
  BarChart3 as ChartBar,
  UserCheck,
  Ticket,
  Settings,
  UserPlus,
  BarChart3,
  CalendarDays,
  FileText,
  ClipboardCheck,
  CalendarCheck,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  User as UserIcon,
  MessageSquare,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePreferences } from '@/contexts/PreferencesContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: GraduationCap },
  { name: 'Teachers', href: '/teachers', icon: Users },
  { name: 'Event Organizers', href: '/admin/organizers', icon: Calendar },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Enrollments', href: '/enrollments', icon: ClipboardList },
  { name: 'Fees Management', href: '/admin/fees', icon: IndianRupee },
  { name: 'Schedules', href: '/schedules', icon: CalendarDays },
  { name: 'Locations', href: '/admin/locations', icon: MapPin },
  { name: 'Holidays', href: '/admin/holidays', icon: CalendarDays },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'User Accounts', href: '/admin/users', icon: UserPlus },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const teacherNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Profile', href: '/teacher/profile', icon: User },
  { name: 'Test Management', href: '/teacher/tests', icon: ClipboardList },
  { name: 'Coding Labs', href: '/teacher/coding-labs', icon: Code2 },
  { name: 'Live Sessions', href: '/live-sessions', icon: Video },
  { name: 'Secure Attendance', href: '/secure-attendance', icon: Shield },
  { name: 'Schedules', href: '/schedules', icon: CalendarDays },
  { name: 'Holiday Calendar', href: '/teacher/holidays', icon: Calendar },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Reports', href: '/attendance/reports', icon: BarChart3 },
  { name: 'Settings', href: '/teacher/settings', icon: Settings },
];

const studentNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Profile', href: '/student/profile', icon: UserIcon },
  { name: 'My Courses', href: '/student/courses', icon: BookOpen },
  { name: 'Syllabus', href: '/student/syllabus', icon: FileText },
  { name: 'Tests & Exams', href: '/student/tests', icon: ClipboardCheck },
  { name: 'Coding Labs', href: '/student/coding-labs', icon: Code2 },
  { name: 'My Fees', href: '/student/fees', icon: IndianRupee },
  { name: 'My Attendance', href: '/student/attendance', icon: CalendarCheck },
  { name: 'Mark Attendance', href: '/student/mark-attendance', icon: Shield },
  { name: 'My Schedule', href: '/student/schedule', icon: CalendarDays },
  { name: 'Events', href: '/student/events', icon: Ticket },
  { name: 'Live Classes', href: '/live-sessions', icon: Video },
  { name: 'Holiday Calendar', href: '/student/holidays', icon: Calendar },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Notices', href: '/student/notices', icon: Bell },
  { name: 'Settings', href: '/student/settings', icon: Settings },
];

const organizerNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Events', href: '/organizer/events', icon: Calendar },
  { name: 'Attendance', href: '/organizer/attendance', icon: UserCheck },
  { name: 'Announcements', href: '/organizer/announcements', icon: Megaphone },
  { name: 'Analytics', href: '/organizer/analytics', icon: ChartBar },
  { name: 'Live Sessions', href: '/live-sessions', icon: Video },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Settings', href: '/organizer/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin, isTeacher, isStudent, isEventOrganizer } = useUserRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { preferences, updatePreference } = usePreferences();
  const collapsed = preferences.sidebar_collapsed;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getNavigation = () => {
    if (isAdmin) return adminNavigation;
    if (isTeacher) return teacherNavigation;
    if (isStudent) return studentNavigation;
    if (isEventOrganizer) return organizerNavigation;
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
    if (isEventOrganizer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
          <Calendar className="h-3 w-3" />
          Organizer
        </span>
      );
    }
    return null;
  };

  const getRoleLabel = () => {
    if (isAdmin) return 'Administrator';
    if (isTeacher) return 'Teacher';
    if (isStudent) return 'Student';
    if (isEventOrganizer) return 'Organizer';
    return 'User';
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center justify-center p-3 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
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
  };

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const showExpanded = isMobile || !collapsed;

    return (
      <>
        <div className={cn(
          'flex h-16 items-center border-b border-sidebar-border',
          showExpanded ? 'gap-3 px-6' : 'justify-center px-2'
        )}>
          <div className={cn(
            'flex items-center justify-center rounded-xl gradient-primary shadow-glow',
            showExpanded ? 'h-10 w-10' : 'h-9 w-9'
          )}>
            <GraduationCap className={cn(
              'text-sidebar-primary-foreground',
              showExpanded ? 'h-5 w-5' : 'h-4 w-4'
            )} />
          </div>
          {showExpanded && (
            <div className="flex flex-col flex-1">
              <span className="text-lg font-bold text-sidebar-foreground">CMS</span>
              <span className="text-xs text-sidebar-foreground/60">College Management</span>
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hidden lg:flex"
              onClick={() => updatePreference('sidebar_collapsed', !collapsed)}
            >
              {collapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <nav className={cn(
          'flex-1 py-6 space-y-1 overflow-y-auto',
          showExpanded ? 'px-4' : 'px-2'
        )}>
          {navigation.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          {showExpanded ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground text-sm font-medium flex-shrink-0">
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
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">{user?.email}</TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    size="icon"
                    className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </>
    );
  };

  const sidebarWidth = collapsed ? 'w-[68px]' : 'w-72';

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

      {/* Mobile sidebar - always expanded */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-40 w-72 bg-sidebar flex flex-col transition-transform duration-300',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent isMobile />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex fixed inset-y-0 left-0 z-40 bg-sidebar flex-col transition-all duration-300',
          sidebarWidth
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
