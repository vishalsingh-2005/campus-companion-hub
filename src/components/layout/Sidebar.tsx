import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, GraduationCap, Users, BookOpen, ClipboardList,
  LogOut, Menu, X, Shield, User, Video, MapPin, IndianRupee, Code2,
  Calendar, Megaphone, BarChart3 as ChartBar, UserCheck, Ticket,
  Settings, UserPlus, BarChart3, CalendarDays, FileText, ClipboardCheck,
  CalendarCheck, Bell, ChevronsLeft, ChevronsRight, User as UserIcon,
  MessageSquare, Sparkles,
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
  { name: 'Library', href: '/admin/library', icon: BookOpen },
  { name: 'Profile Approvals', href: '/admin/profile-approvals', icon: UserCheck },
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
  { name: 'Assignments', href: '/teacher/assignments', icon: FileText },
  { name: 'Leave Requests', href: '/teacher/leave', icon: CalendarCheck },
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
  { name: 'Assignments', href: '/student/assignments', icon: FileText },
  { name: 'Library', href: '/student/library', icon: BookOpen },
  { name: 'Leave', href: '/student/leave', icon: CalendarDays },
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

  const getRoleLabel = () => {
    if (isAdmin) return 'Administrator';
    if (isTeacher) return 'Teacher';
    if (isStudent) return 'Student';
    if (isEventOrganizer) return 'Organizer';
    return 'User';
  };

  const getRoleColor = () => {
    if (isAdmin) return 'from-primary to-primary/70';
    if (isTeacher) return 'from-info to-info/70';
    if (isStudent) return 'from-success to-success/70';
    if (isEventOrganizer) return 'from-accent to-accent/70';
    return 'from-muted to-muted/70';
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
                'flex items-center justify-center p-3 rounded-xl transition-all duration-300 group/link relative',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <item.icon className={cn('h-5 w-5 transition-transform duration-300', isActive && 'scale-110')} />
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-sidebar-primary" />
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="font-medium">
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
          'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative group/link',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
        )}
      >
        <item.icon className={cn('h-4.5 w-4.5 transition-transform duration-300 flex-shrink-0', isActive && 'scale-110')} />
        <span className="truncate">{item.name}</span>
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-sidebar-primary" />
        )}
      </Link>
    );
  };

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const showExpanded = isMobile || !collapsed;

    return (
      <>
        {/* Logo */}
        <div className={cn(
          'flex h-[72px] items-center border-b border-sidebar-border/50',
          showExpanded ? 'gap-3 px-6' : 'justify-center px-2'
        )}>
          <div className={cn(
            'flex items-center justify-center rounded-2xl gradient-primary shadow-glow transition-transform hover:scale-105',
            showExpanded ? 'h-11 w-11' : 'h-10 w-10'
          )}>
            <Sparkles className={cn('text-white', showExpanded ? 'h-5 w-5' : 'h-4.5 w-4.5')} />
          </div>
          {showExpanded && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-base font-bold text-sidebar-foreground font-display tracking-tight">Campus</span>
              <span className="text-xs text-sidebar-foreground/50 font-medium">Companion</span>
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 hidden lg:flex rounded-xl"
              onClick={() => updatePreference('sidebar_collapsed', !collapsed)}
            >
              {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Role badge */}
        {showExpanded && (
          <div className="px-5 pt-5 pb-2">
            <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r text-white', getRoleColor())}>
              {isAdmin && <Shield className="h-3 w-3" />}
              {isTeacher && <BookOpen className="h-3 w-3" />}
              {isStudent && <GraduationCap className="h-3 w-3" />}
              {isEventOrganizer && <Calendar className="h-3 w-3" />}
              {getRoleLabel()}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={cn(
          'flex-1 py-3 space-y-0.5 overflow-y-auto',
          showExpanded ? 'px-3' : 'px-2'
        )}>
          {navigation.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border/50">
          {showExpanded ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sidebar-accent/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white text-sm font-bold flex-shrink-0">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">
                    {getRoleLabel()}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full justify-start gap-3 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-xl h-10"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white text-sm font-bold cursor-default">
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
                    className="text-sidebar-foreground/50 hover:text-sidebar-foreground rounded-xl"
                  >
                    <LogOut className="h-4 w-4" />
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

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[280px]';

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-2xl glass shadow-lg text-foreground"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-40 w-[280px] glass-sidebar flex flex-col transition-transform duration-500 ease-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent isMobile />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex fixed inset-y-0 left-0 z-40 glass-sidebar flex-col transition-all duration-500 ease-out',
          sidebarWidth
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}