import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  UserPlus,
  GraduationCap,
  BookOpen,
  Shield,
  Key,
  Search,
  KeyRound,
  Loader2,
  Calendar,
  UserX,
  UserCheck,
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserWithRole {
  id: string;
  email: string;
  role: string;
  name?: string;
  created_at: string;
  is_active: boolean;
}

export default function UserManagement() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [defaultRole, setDefaultRole] = useState<'teacher' | 'student' | 'event_organizer' | undefined>();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch teachers with user_id
      const { data: teachers } = await supabase
        .from('teachers')
        .select('user_id, first_name, last_name, email, created_at')
        .not('user_id', 'is', null);

      // Fetch students with user_id  
      const { data: students } = await supabase
        .from('students')
        .select('user_id, first_name, last_name, email, created_at')
        .not('user_id', 'is', null);

      // Fetch user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Fetch profiles to get is_active status
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, is_active');

      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      const activeMap = new Map(profiles?.map(p => [p.user_id, p.is_active !== false]) || []);

      const allUsers: UserWithRole[] = [];

      // Add teachers
      teachers?.forEach(t => {
        if (t.user_id) {
          allUsers.push({
            id: t.user_id,
            email: t.email,
            role: rolesMap.get(t.user_id) || 'teacher',
            name: `${t.first_name} ${t.last_name}`,
            created_at: t.created_at,
            is_active: activeMap.get(t.user_id) ?? true,
          });
        }
      });

      // Add students
      students?.forEach(s => {
        if (s.user_id) {
          allUsers.push({
            id: s.user_id,
            email: s.email,
            role: rolesMap.get(s.user_id) || 'student',
            name: `${s.first_name} ${s.last_name}`,
            created_at: s.created_at,
            is_active: activeMap.get(s.user_id) ?? true,
          });
        }
      });

      // Add any users with roles that aren't in teachers/students (like admins)
      roles?.forEach(r => {
        if (!allUsers.find(u => u.id === r.user_id)) {
          allUsers.push({
            id: r.user_id,
            email: 'Unknown',
            role: r.role,
            created_at: new Date().toISOString(),
            is_active: activeMap.get(r.user_id) ?? true,
          });
        }
      });

      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading) {
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

  const handleCreateUser = (role?: 'teacher' | 'student' | 'event_organizer') => {
    setDefaultRole(role);
    setCreateDialogOpen(true);
  };

  const handleResetPassword = (user: UserWithRole) => {
    setSelectedUser({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    setResetPasswordDialogOpen(true);
  };

  const handleToggleActive = async (targetUser: UserWithRole) => {
    const newStatus = !targetUser.is_active;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('user_id', targetUser.id);

      if (error) throw error;

      toast.success(newStatus ? 'User account activated' : 'User account deactivated');
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-primary/10 text-primary">Admin</Badge>;
      case 'teacher':
        return <Badge className="bg-info/10 text-info">Teacher</Badge>;
      case 'student':
        return <Badge className="bg-success/10 text-success">Student</Badge>;
      case 'event_organizer':
        return <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400">Event Organizer</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
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

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="create">Quick Create</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={fetchUsers}>
              Refresh
            </Button>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>
                Manage login credentials for all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium">No users found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery ? 'Try a different search term' : 'Create a user account to get started'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">
                          {user.name || '-'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <Badge className={user.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                            {user.is_active ? 'Active' : 'Deactivated'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(user)}
                            className="gap-1"
                          >
                            <KeyRound className="h-4 w-4" />
                            Reset
                          </Button>
                          {user.role !== 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(user)}
                              className={user.is_active ? 'gap-1 text-destructive hover:text-destructive' : 'gap-1 text-success hover:text-success'}
                            >
                              {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              {user.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

            {/* Create Event Organizer Account */}
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Event Organizer</CardTitle>
                    <CardDescription>Create a new organizer login</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Event organizers can create and manage college events, registrations, and more.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleCreateUser('event_organizer')}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Organizer
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
                  <li className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400 mt-0.5" />
                    <span><strong>Organizer:</strong> Manage events</span>
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
        </TabsContent>
      </Tabs>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultRole={defaultRole}
        onUserCreated={(userId, role) => {
          console.log(`Created ${role} account with ID: ${userId}`);
          fetchUsers();
        }}
      />

      <ResetPasswordDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
        user={selectedUser}
      />
    </DashboardLayout>
  );
}
