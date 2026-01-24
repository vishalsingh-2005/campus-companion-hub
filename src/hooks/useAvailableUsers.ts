import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AvailableUser {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  is_linked: boolean;
}

export function useAvailableUsers(type: 'student' | 'teacher') {
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAvailableUsers = async () => {
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
        .select('user_id')
        .not('user_id', 'is', null);

      if (linkedError) throw linkedError;

      const linkedUserIds = new Set((linkedData || []).map((d) => d.user_id));

      // Get emails from auth metadata via profiles or user_roles
      // Since we can't directly query auth.users, we'll construct the list
      const usersWithDetails: AvailableUser[] = roleData.map((role) => {
        const profile = profileData?.find((p) => p.user_id === role.user_id);
        return {
          id: role.user_id,
          email: '', // Will be populated from profiles or shown as ID
          role: role.role,
          full_name: profile?.full_name || null,
          is_linked: linkedUserIds.has(role.user_id),
        };
      });

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching available users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableUsers();
  }, [type]);

  return {
    users,
    loading,
    refetch: fetchAvailableUsers,
  };
}
