import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'teacher' | 'student' | 'user';

interface UserRoleData {
  role: AppRole;
  isLoading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  refetch: () => Promise<void>;
}

export function useUserRole(): UserRoleData {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>('user');
  const [isLoading, setIsLoading] = useState(true);

  const fetchRole = async () => {
    if (!user) {
      setRole('user');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole('user');
      } else if (data) {
        setRole(data.role as AppRole);
      } else {
        setRole('user');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole('user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();
  }, [user]);

  return {
    role,
    isLoading,
    isAdmin: role === 'admin',
    isTeacher: role === 'teacher',
    isStudent: role === 'student',
    refetch: fetchRole,
  };
}
