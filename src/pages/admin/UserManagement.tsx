import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import {
  UserPlus,
  GraduationCap,
  BookOpen,
  Shield,
  Users,
  Key,
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';

export default function UserManagement() {
  const { isAdmin, isLoading } = useUserRole();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [defaultRole, setDefaultRole] = useState<'teacher' | 'student' | undefined>();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/access-denied" replace />;
  }

  const handleCreateUser = (role?: 'teacher' | 'student') => {
    setDefaultRole(role);
    setCreateDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="User Management"
        description="Create and manage user accounts for teachers and students"
      >
        <Button onClick={() => handleCreateUser()} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Create Account
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Create Teacher Account */}
        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10 text-info group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Teacher Account</CardTitle>
                <CardDescription>Create a new teacher login</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Teachers can view assigned courses and student information (read-only access to students).
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleCreateUser('teacher')}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create Teacher
            </Button>
          </CardContent>
        </Card>

        {/* Create Student Account */}
        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success group-hover:scale-110 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Student Account</CardTitle>
                <CardDescription>Create a new student login</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Students can view their own profile, enrolled courses, and grades (view-only access).
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleCreateUser('student')}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create Student
            </Button>
          </CardContent>
        </Card>

        {/* Role Permissions Info */}
        <Card className="group hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Access control overview</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary mt-0.5" />
                <span><strong>Admin:</strong> Full CRUD access</span>
              </li>
              <li className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-info mt-0.5" />
                <span><strong>Teacher:</strong> View courses & students</span>
              </li>
              <li className="flex items-start gap-2">
                <GraduationCap className="h-4 w-4 text-success mt-0.5" />
                <span><strong>Student:</strong> View own data only</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Important Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <h4 className="font-medium text-warning mb-2">Password Security</h4>
            <p className="text-sm text-muted-foreground">
              Share login credentials securely. Users should change their password after first login.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-info/10 border border-info/20">
            <h4 className="font-medium text-info mb-2">Linking Accounts</h4>
            <p className="text-sm text-muted-foreground">
              After creating a user account, link it to the corresponding student/teacher record 
              in their profile to enable role-specific features.
            </p>
          </div>
        </CardContent>
      </Card>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultRole={defaultRole}
        onUserCreated={(userId, role) => {
          console.log(`Created ${role} account with ID: ${userId}`);
        }}
      />
    </DashboardLayout>
  );
}
