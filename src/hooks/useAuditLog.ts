import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'leave_approved'
  | 'leave_rejected'
  | 'grade_updated'
  | 'grade_published'
  | 'attendance_edited'
  | 'attendance_marked'
  | 'user_created'
  | 'password_reset'
  | 'profile_approved'
  | 'profile_rejected'
  | 'course_created'
  | 'course_updated'
  | 'student_created'
  | 'teacher_created'
  | 'assignment_created'
  | 'book_issued'
  | 'book_returned';

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export function useAuditLog() {
  const { user } = useAuth();

  const log = useCallback(
    async (
      action: AuditAction,
      entityType: string,
      entityId?: string,
      details?: Record<string, unknown>
    ) => {
      if (!user) return;
      try {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action,
          entity_type: entityType,
          entity_id: entityId ?? null,
          details: details ?? {},
        } as any);
      } catch (err) {
        console.error('Audit log failed:', err);
      }
    },
    [user]
  );

  return { log };
}

export function useAuditLogs() {
  const fetchLogs = useCallback(async (limit = 50) => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit) as { data: AuditLogEntry[] | null; error: any };

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
    return data ?? [];
  }, []);

  return { fetchLogs };
}
