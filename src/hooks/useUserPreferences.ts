import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPreferences {
  theme: string;
  accent_color: string;
  sidebar_collapsed: boolean;
  layout_density: string;
  dashboard_widgets: any[];
  font_size: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  accent_color: 'amber',
  sidebar_collapsed: false,
  layout_density: 'comfortable',
  dashboard_widgets: [],
  font_size: 'medium',
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(DEFAULT_PREFERENCES);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching preferences:', error);
        setPreferences(DEFAULT_PREFERENCES);
      } else if (data) {
        setPreferences({
          theme: data.theme || DEFAULT_PREFERENCES.theme,
          accent_color: data.accent_color || DEFAULT_PREFERENCES.accent_color,
          sidebar_collapsed: data.sidebar_collapsed ?? DEFAULT_PREFERENCES.sidebar_collapsed,
          layout_density: data.layout_density || DEFAULT_PREFERENCES.layout_density,
          dashboard_widgets: (data.dashboard_widgets as any[]) || DEFAULT_PREFERENCES.dashboard_widgets,
          font_size: data.font_size || DEFAULT_PREFERENCES.font_size,
        });
      } else {
        // No preferences yet, create with defaults
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id, ...DEFAULT_PREFERENCES });

        if (insertError) {
          console.error('Error creating default preferences:', insertError);
        }
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (err) {
      console.error('Error in fetchPreferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      if (!user) return;

      // Optimistic update
      setPreferences((prev) => ({ ...prev, [key]: value }));
      setIsSaving(true);

      try {
        const { error } = await supabase
          .from('user_preferences')
          .update({ [key]: value })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error saving preference:', error);
          // Revert on error
          fetchPreferences();
        }
      } catch (err) {
        console.error('Error updating preference:', err);
        fetchPreferences();
      } finally {
        setIsSaving(false);
      }
    },
    [user, fetchPreferences]
  );

  const updateMultiplePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!user) return;

      setPreferences((prev) => ({ ...prev, ...updates }));
      setIsSaving(true);

      try {
        const { error } = await supabase
          .from('user_preferences')
          .update(updates)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error saving preferences:', error);
          fetchPreferences();
        }
      } catch (err) {
        console.error('Error updating preferences:', err);
        fetchPreferences();
      } finally {
        setIsSaving(false);
      }
    },
    [user, fetchPreferences]
  );

  return {
    preferences,
    isLoading,
    isSaving,
    updatePreference,
    updateMultiplePreferences,
    refetch: fetchPreferences,
  };
}
