import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  SecureAttendanceSession,
  SecureAttendanceRecord,
  ClassroomLocation,
  CreateSessionParams,
  MarkAttendanceParams,
} from '@/types/secure-attendance';

// Generate a random secret for QR codes
function generateQRSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Hook for teachers to manage attendance sessions
export function useSecureAttendanceSessions() {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ['secure-attendance-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secure_attendance_sessions')
        .select(`
          *,
          courses (id, course_name, course_code),
          teachers (id, first_name, last_name),
          classroom_locations (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SecureAttendanceSession[];
    },
  });

  const createSession = useMutation({
    mutationFn: async (params: CreateSessionParams & { teacher_id: string }) => {
      const { data, error } = await supabase
        .from('secure_attendance_sessions')
        .insert({
          course_id: params.course_id,
          teacher_id: params.teacher_id,
          classroom_location_id: params.classroom_location_id || null,
          time_window_minutes: params.time_window_minutes,
          require_selfie: params.require_selfie,
          require_gps: params.require_gps,
          qr_secret: generateQRSecret(),
          qr_rotation_interval_seconds: 30,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secure-attendance-sessions'] });
      toast.success('Attendance session started!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to start session: ${error.message}`);
    },
  });

  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('secure_attendance_sessions')
        .update({
          status: 'ended',
          end_time: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secure-attendance-sessions'] });
      toast.success('Session ended');
    },
    onError: (error: Error) => {
      toast.error(`Failed to end session: ${error.message}`);
    },
  });

  return {
    sessions: sessionsQuery.data || [],
    isLoading: sessionsQuery.isLoading,
    error: sessionsQuery.error,
    createSession,
    endSession,
    refetch: sessionsQuery.refetch,
  };
}

// Hook for generating rotating QR tokens
export function useQRTokenGenerator(sessionId: string | null, rotationSeconds: number = 30) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateToken = useCallback(async () => {
    if (!sessionId) {
      console.log('No session ID, skipping token generation');
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      // Wait a moment for auth to be ready
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.error('No auth session found');
        setError('Not authenticated');
        return;
      }

      console.log('Generating QR token for session:', sessionId);

      const response = await supabase.functions.invoke('validate-attendance', {
        body: {
          action: 'generate_qr',
          session_id: sessionId,
        },
      });

      console.log('Edge function response:', response);

      if (response.error) {
        console.error('Edge function error:', response.error);
        setError(response.error.message || 'Edge function error');
        return;
      }
      
      const result = response.data;
      if (result.success) {
        setToken(result.token);
        setExpiresAt(new Date(result.expires_at));
        setError(null);
        console.log('Token generated successfully:', result.token);
      } else {
        console.error('Token generation failed:', result);
        setError(result.error || 'Failed to generate token');
      }
    } catch (err: any) {
      console.error('Token generation error:', err);
      setError(err.message || 'Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  }, [sessionId]);

  // Auto-rotate token
  useEffect(() => {
    if (!sessionId) {
      setToken(null);
      setExpiresAt(null);
      return;
    }

    // Small delay to ensure everything is ready
    const initialTimeout = setTimeout(() => {
      generateToken();
    }, 500);

    // Set up rotation interval
    const interval = setInterval(() => {
      generateToken();
    }, rotationSeconds * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [sessionId, rotationSeconds, generateToken]);

  return {
    token,
    expiresAt,
    isGenerating,
    error,
    regenerate: generateToken,
  };
}

// Hook for session attendance records
export function useSessionAttendanceRecords(sessionId: string | null) {
  return useQuery({
    queryKey: ['secure-attendance-records', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('secure_attendance_records')
        .select(`
          *,
          students (id, first_name, last_name, student_id)
        `)
        .eq('session_id', sessionId)
        .order('marked_at', { ascending: false });

      if (error) throw error;
      return data as SecureAttendanceRecord[];
    },
    enabled: !!sessionId,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });
}

// Hook for classroom locations
export function useClassroomLocations() {
  const queryClient = useQueryClient();

  const locationsQuery = useQuery({
    queryKey: ['classroom-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classroom_locations')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as ClassroomLocation[];
    },
  });

  const createLocation = useMutation({
    mutationFn: async (location: Omit<ClassroomLocation, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('classroom_locations')
        .insert(location)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-locations'] });
      toast.success('Location added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add location: ${error.message}`);
    },
  });

  return {
    locations: locationsQuery.data || [],
    isLoading: locationsQuery.isLoading,
    createLocation,
    refetch: locationsQuery.refetch,
  };
}

// Hook for students to mark attendance
export function useMarkAttendance() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const markAttendance = async (params: MarkAttendanceParams) => {
    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('validate-attendance', {
        body: {
          action: 'mark_attendance',
          ...params,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const result = response.data;
      
      if (result.success) {
        toast.success('Attendance marked successfully!');
        return { success: true, data: result };
      } else {
        const errorMessages: Record<string, string> = {
          'NOT_STUDENT': 'Your account is not linked to a student record',
          'INVALID_SESSION': 'This attendance session is not valid',
          'SESSION_ENDED': 'This attendance session has ended',
          'TIME_EXPIRED': 'The time window for marking attendance has expired',
          'INVALID_QR': 'The QR code has expired. Please scan the latest code.',
          'GPS_REQUIRED': 'Please enable GPS location access',
          'OUTSIDE_RADIUS': `You are ${result.distance}m away. You need to be within ${result.allowed_radius}m of the classroom.`,
          'UNREGISTERED_DEVICE': 'Please use your registered device to mark attendance',
          'SELFIE_REQUIRED': 'A selfie photo is required for this session',
          'ALREADY_MARKED': 'You have already marked your attendance',
        };

        const message = errorMessages[result.code] || result.error || 'Failed to mark attendance';
        toast.error(message);
        return { success: false, error: result.code, message };
      }
    } catch (error: any) {
      console.error('Mark attendance error:', error);
      toast.error('Failed to mark attendance. Please try again.');
      return { success: false, error: 'UNKNOWN', message: error.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  return { markAttendance, isSubmitting };
}

// Hook to get device fingerprint
export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    // Generate a simple device fingerprint
    const generateFingerprint = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
      }
      
      const canvasData = canvas.toDataURL();
      const userAgent = navigator.userAgent;
      const screenData = `${screen.width}x${screen.height}x${screen.colorDepth}`;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const language = navigator.language;
      
      const combined = `${canvasData}|${userAgent}|${screenData}|${timezone}|${language}`;
      
      // Simple hash
      let hash = 0;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      return Math.abs(hash).toString(36);
    };

    setFingerprint(generateFingerprint());
  }, []);

  return { fingerprint };
}
