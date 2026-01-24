import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateUserResult {
  userId: string | null;
  error: string | null;
}

export function useCreateUser() {
  const [isCreating, setIsCreating] = useState(false);

  const createUserAccount = async (
    email: string,
    password: string,
    role: 'teacher' | 'student',
    fullName: string
  ): Promise<CreateUserResult> => {
    setIsCreating(true);

    try {
      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Insert the role into user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: role,
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
        // Don't throw - the user was created, role assignment is secondary
        toast.warning('User created but role assignment failed. Please contact support.');
      }

      return { userId: authData.user.id, error: null };
    } catch (error: any) {
      console.error('Error creating user:', error);
      return { userId: null, error: error.message };
    } finally {
      setIsCreating(false);
    }
  };

  return { createUserAccount, isCreating };
}
