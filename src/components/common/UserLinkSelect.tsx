import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Link, UserCheck, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface UserAccount {
  id: string;
  full_name: string | null;
  role: string;
  is_linked: boolean;
}

interface UserLinkSelectProps {
  type: 'student' | 'teacher';
  value: string | null;
  onChange: (value: string | null) => void;
  currentRecordId?: string;
}

export function UserLinkSelect({
  type,
  value,
  onChange,
  currentRecordId,
}: UserLinkSelectProps) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);

        // Get all users with the specified role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .eq('role', type);

        if (roleError) throw roleError;

        if (!roleData || roleData.length === 0) {
          setUsers([]);
          return;
        }

        const userIds = roleData.map((r) => r.user_id);

        // Get profiles for these users
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        if (profileError) throw profileError;

        // Get already linked user IDs from students or teachers table
        const table = type === 'student' ? 'students' : 'teachers';
        const { data: linkedData, error: linkedError } = await supabase
          .from(table)
          .select('id, user_id')
          .not('user_id', 'is', null);

        if (linkedError) throw linkedError;

        // Create a map of linked user IDs to their record IDs
        const linkedMap = new Map(
          (linkedData || []).map((d) => [d.user_id, d.id])
        );

        // Build user list
        const usersWithDetails: UserAccount[] = roleData.map((role) => {
          const profile = profileData?.find((p) => p.user_id === role.user_id);
          const linkedToRecordId = linkedMap.get(role.user_id);
          // A user is considered "linked" if they're linked to a DIFFERENT record
          const isLinkedToOther =
            linkedToRecordId && linkedToRecordId !== currentRecordId;

          return {
            id: role.user_id,
            full_name: profile?.full_name || null,
            role: role.role,
            is_linked: !!isLinkedToOther,
          };
        });

        setUsers(usersWithDetails);
      } catch (error) {
        console.error('Error fetching users for linking:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [type, currentRecordId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Link to User Account</Label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const availableUsers = users.filter((u) => !u.is_linked || u.id === value);
  const linkedUsers = users.filter((u) => u.is_linked && u.id !== value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Link className="h-4 w-4" />
          Link to User Account
        </Label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <UserX className="h-3 w-3 mr-1" />
            Unlink
          </Button>
        )}
      </div>

      {users.length === 0 ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed bg-muted/50">
          <UserX className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            No {type} accounts available. Create a {type} account in User
            Management first.
          </span>
        </div>
      ) : (
        <Select
          value={value || 'none'}
          onValueChange={(v) => onChange(v === 'none' ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a user account to link" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">No account linked</span>
            </SelectItem>
            {availableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-success" />
                  <span>{user.full_name || 'Unnamed User'}</span>
                  {user.id === value && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
            {linkedUsers.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                  Already Linked
                </div>
                {linkedUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id} disabled>
                    <div className="flex items-center gap-2 opacity-50">
                      <UserX className="h-4 w-4" />
                      <span>{user.full_name || 'Unnamed User'}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        Linked
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      )}

      {value && (
        <p className="text-xs text-muted-foreground">
          This {type} will be able to log in and view their own data.
        </p>
      )}
    </div>
  );
}
