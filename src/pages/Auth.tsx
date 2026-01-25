import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RoleCard } from '@/components/auth/RoleCard';
import { RoleLoginForm } from '@/components/auth/RoleLoginForm';
import { StudentIllustration } from '@/components/auth/illustrations/StudentIllustration';
import { TeacherIllustration } from '@/components/auth/illustrations/TeacherIllustration';
import { AdminIllustration } from '@/components/auth/illustrations/AdminIllustration';
import { EventOrganizerIllustration } from '@/components/auth/illustrations/EventOrganizerIllustration';
import { GraduationCap, BookOpen, Shield, Calendar, Loader2 } from 'lucide-react';

type SelectedRole = 'admin' | 'teacher' | 'student' | 'event_organizer' | null;

export default function Auth() {
  const { user, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Show role-specific login form
  if (selectedRole === 'student') {
    return (
      <RoleLoginForm
        role="student"
        onBack={() => setSelectedRole(null)}
        illustration={<StudentIllustration />}
        gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
        title="Student Portal"
        subtitle="Access your courses, grades, and academic information"
      />
    );
  }

  if (selectedRole === 'teacher') {
    return (
      <RoleLoginForm
        role="teacher"
        onBack={() => setSelectedRole(null)}
        illustration={<TeacherIllustration />}
        gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
        title="Teacher Portal"
        subtitle="Manage your classes and view student information"
      />
    );
  }

  if (selectedRole === 'admin') {
    return (
      <RoleLoginForm
        role="admin"
        onBack={() => setSelectedRole(null)}
        illustration={<AdminIllustration />}
        gradient="bg-gradient-to-br from-slate-700 to-slate-900"
        title="Administrator Portal"
        subtitle="Full access to manage the college system"
      />
    );
  }

  if (selectedRole === 'event_organizer') {
    return (
      <RoleLoginForm
        role="event_organizer"
        onBack={() => setSelectedRole(null)}
        illustration={<EventOrganizerIllustration />}
        gradient="bg-gradient-to-br from-violet-500 to-purple-600"
        title="Event Organizer Portal"
        subtitle="Create and manage college events"
      />
    );
  }

  // Role selection screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl gradient-primary shadow-glow">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            College Management System
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Select your role to access the portal
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <RoleCard
            title="Student"
            description="View your courses, grades, and attendance"
            icon={GraduationCap}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
            onClick={() => setSelectedRole('student')}
            delay={0}
          />
          <RoleCard
            title="Teacher"
            description="Manage classes and view student data"
            icon={BookOpen}
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
            onClick={() => setSelectedRole('teacher')}
            delay={100}
          />
          <RoleCard
            title="Event Organizer"
            description="Create and manage college events"
            icon={Calendar}
            gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
            onClick={() => setSelectedRole('event_organizer')}
            delay={200}
          />
          <RoleCard
            title="Administrator"
            description="Full system control and management"
            icon={Shield}
            gradient="bg-gradient-to-br from-slate-700 to-slate-900"
            iconBg="bg-gradient-to-br from-slate-700 to-slate-900"
            onClick={() => setSelectedRole('admin')}
            delay={300}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-12 animate-fade-in" style={{ animationDelay: '400ms' }}>
          Need help? Contact your administrator for account access.
        </p>
      </div>
    </div>
  );
}
