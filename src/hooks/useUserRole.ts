import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'teacher' | 'student' | 'event_organizer' | 'user';

interface UserRoleData {
  role: AppRole;
  isLoading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isEventOrganizer: boolean;
  refetch: () => Promise<void>;
}

export function useUserRole(): UserRoleData {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole>('user');
  const [isLoading, setIsLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRole('user');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole('user');
      } else if (data) {
        console.log('User role fetched:', data.role);
        setRole(data.role as AppRole);
      } else {
        console.log('No role found for user, defaulting to user');
        setRole('user');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole('user');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Don't fetch role while auth is still loading
    if (authLoading) {
      return;
    }
    
    fetchRole();
  }, [user?.id, authLoading, fetchRole]);

  return {
    role,
    isLoading: isLoading || authLoading,
    isAdmin: role === 'admin',
    isTeacher: role === 'teacher',
    isStudent: role === 'student',
    isEventOrganizer: role === 'event_organizer',
    refetch: fetchRole,
  };
}
