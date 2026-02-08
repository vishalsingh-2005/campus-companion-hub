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
    role: 'admin' | 'teacher' | 'student' | 'event_organizer',
    fullName: string
  ): Promise<CreateUserResult> => {
    setIsCreating(true);

    try {
      // Use admin edge function to create user without affecting current session
      const response = await supabase.functions.invoke('admin-create-user', {
        body: {
          email,
          password,
          full_name: fullName,
          role,
        },
      });

      // Handle edge function errors - the error details are in response.data when status is non-2xx
      if (response.error) {
        // Try to extract the actual error message from the response data
        const errorMessage = response.data?.error || response.error.message || 'Failed to create user';
        throw new Error(errorMessage);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const data = response.data;

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
