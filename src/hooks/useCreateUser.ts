import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CreateUserResult {
  userId: string | null;
  error: string | null;
}

export function useCreateUser() {
  const [isCreating, setIsCreating] = useState(false);

  const createUserAccount = async (
    email: string,
    password: string,
    role: 'teacher' | 'student' | 'event_organizer',
    fullName: string
  ): Promise<CreateUserResult> => {
    setIsCreating(true);

    try {
      // Use admin edge function to create user without affecting current session
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email,
          password,
          full_name: fullName,
          role,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create user');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.user_id) {
        throw new Error('Failed to create user account');
      }

      return { userId: data.user_id, error: null };
    } catch (error: any) {
      console.error('Error creating user:', error);
      return { userId: null, error: error.message };
    } finally {
      setIsCreating(false);
    }
  };

  return { createUserAccount, isCreating };
}
