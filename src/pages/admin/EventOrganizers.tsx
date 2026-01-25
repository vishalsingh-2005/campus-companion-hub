import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreHorizontal,
  KeyRound,
  Trash2,
  Loader2,
  Calendar,
  Users,
  Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';

interface EventOrganizer {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  event_count: number;
}

export default function EventOrganizers() {
  const [organizers, setOrganizers] = useState<EventOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ id: string; email: string } | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const fetchOrganizers = async () => {
    try {
      setLoading(true);
      
      // Get all users with event_organizer role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'event_organizer');

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        setOrganizers([]);
        return;
      }

      const userIds = roleData.map(r => r.user_id);

      // Get profiles for these users (including email)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      // Get event counts for each organizer
      const organizersWithData: EventOrganizer[] = await Promise.all(
        userIds.map(async (userId) => {
          const profile = profiles?.find(p => p.user_id === userId);
          
          // Count events created by this user
          const { count } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', userId);

          return {
            id: userId,
            user_id: userId,
            email: profile?.email || 'Email not set',
            full_name: profile?.full_name || 'Unknown User',
            created_at: profile?.created_at || new Date().toISOString(),
            event_count: count || 0,
          };
        })
      );

      setOrganizers(organizersWithData);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch organizers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const handleUserCreated = async () => {
    await fetchOrganizers();
  };

  const handleDeleteOrganizer = async () => {
    if (!deleteUserId) return;
    
    try {
      // Delete the user role (this removes organizer access)
      const organizer = organizers.find(o => o.user_id === deleteUserId);
      if (!organizer) return;

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', organizer.user_id)
        .eq('role', 'event_organizer');

      if (error) throw error;

      toast.success('Event organizer role removed');
      await fetchOrganizers();
    } catch (error: any) {
      toast.error('Failed to remove organizer: ' + error.message);
    } finally {
      setDeleteUserId(null);
    }
  };

  const filteredOrganizers = organizers.filter(
    (org) =>
      org.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Event Organizers"
          description="Manage event organizer accounts"
          showBackButton
          actions={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Organizer
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Organizers</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                {organizers.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Events Created</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2 text-primary">
                <Calendar className="h-5 w-5" />
                {organizers.reduce((sum, o) => sum + o.event_count, 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active This Month</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2 text-success">
                <Users className="h-5 w-5" />
                {organizers.filter(o => o.event_count > 0).length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Organizers Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Event Organizers</CardTitle>
            <CardDescription>View and manage organizer accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOrganizers.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No Event Organizers</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first event organizer account
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Organizer
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Events Created</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrganizers.map((organizer) => (
                      <TableRow key={organizer.id}>
                        <TableCell className="font-medium">
                          {organizer.full_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {organizer.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {organizer.event_count} events
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(organizer.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-success/10 text-success">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  setResetPasswordUser({
                                    id: organizer.user_id,
                                    email: organizer.email,
                                  })
                                }
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteUserId(organizer.user_id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Access
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onUserCreated={handleUserCreated}
        defaultRole="event_organizer"
      />

      <ResetPasswordDialog
        open={!!resetPasswordUser}
        onOpenChange={() => setResetPasswordUser(null)}
        user={resetPasswordUser}
      />

      <DeleteConfirmDialog
        open={!!deleteUserId}
        onOpenChange={() => setDeleteUserId(null)}
        onConfirm={handleDeleteOrganizer}
        title="Remove Organizer Access"
        description="This will remove the event organizer role from this user. They will no longer be able to create or manage events. Their events will remain in the system."
      />
    </DashboardLayout>
  );
}
