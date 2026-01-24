import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProxyAttemptLog {
  id: string;
  session_id: string | null;
  student_id: string | null;
  attempt_type: string;
  failure_reason: string;
  device_fingerprint: string | null;
  ip_address: string | null;
  user_agent: string | null;
  latitude: number | null;
  longitude: number | null;
  qr_token_attempted: string | null;
  created_at: string;
  students?: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string;
    email: string;
  } | null;
  secure_attendance_sessions?: {
    id: string;
    courses?: {
      id: string;
      course_name: string;
      course_code: string;
    } | null;
  } | null;
}

export interface ProxyAttemptStats {
  totalAttempts: number;
  uniqueStudents: number;
  uniqueIPs: number;
  uniqueDevices: number;
  attemptsByType: Record<string, number>;
  attemptsByReason: Record<string, number>;
  hourlyDistribution: Record<string, number>;
  recentTrend: { date: string; count: number }[];
}

export interface SuspiciousPattern {
  type: 'high_frequency' | 'multiple_devices' | 'location_mismatch' | 'ip_sharing' | 'device_sharing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  studentId?: string;
  studentName?: string;
  details: Record<string, any>;
}

export function useProxyAttempts(filters?: {
  dateRange?: 'day' | 'week' | 'month' | 'all';
  attemptType?: string;
  studentId?: string;
}) {
  const getDateFilter = () => {
    const now = new Date();
    switch (filters?.dateRange) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  };

  const { data: attempts, isLoading, error, refetch } = useQuery({
    queryKey: ['proxy-attempts', filters],
    queryFn: async () => {
      let query = supabase
        .from('proxy_attempt_logs')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            student_id,
            email
          ),
          secure_attendance_sessions (
            id,
            courses (
              id,
              course_name,
              course_code
            )
          )
        `)
        .order('created_at', { ascending: false });

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      if (filters?.attemptType) {
        query = query.eq('attempt_type', filters.attemptType);
      }

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data as ProxyAttemptLog[];
    },
  });

  // Calculate statistics
  const stats: ProxyAttemptStats | null = attempts ? {
    totalAttempts: attempts.length,
    uniqueStudents: new Set(attempts.filter(a => a.student_id).map(a => a.student_id)).size,
    uniqueIPs: new Set(attempts.filter(a => a.ip_address).map(a => a.ip_address)).size,
    uniqueDevices: new Set(attempts.filter(a => a.device_fingerprint).map(a => a.device_fingerprint)).size,
    attemptsByType: attempts.reduce((acc, a) => {
      acc[a.attempt_type] = (acc[a.attempt_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    attemptsByReason: attempts.reduce((acc, a) => {
      acc[a.failure_reason] = (acc[a.failure_reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    hourlyDistribution: attempts.reduce((acc, a) => {
      const hour = new Date(a.created_at).getHours().toString().padStart(2, '0');
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recentTrend: (() => {
      const last7Days: Record<string, number> = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = date.toISOString().split('T')[0];
        last7Days[key] = 0;
      }
      attempts.forEach(a => {
        const key = a.created_at.split('T')[0];
        if (last7Days[key] !== undefined) {
          last7Days[key]++;
        }
      });
      return Object.entries(last7Days).map(([date, count]) => ({ date, count }));
    })(),
  } : null;

  // Detect suspicious patterns
  const detectPatterns = (): SuspiciousPattern[] => {
    if (!attempts || attempts.length === 0) return [];

    const patterns: SuspiciousPattern[] = [];

    // Group by student
    const byStudent: Record<string, ProxyAttemptLog[]> = {};
    attempts.forEach(a => {
      if (a.student_id) {
        if (!byStudent[a.student_id]) byStudent[a.student_id] = [];
        byStudent[a.student_id].push(a);
      }
    });

    // Detect high frequency attempts per student
    Object.entries(byStudent).forEach(([studentId, studentAttempts]) => {
      const student = studentAttempts[0]?.students;
      
      // High frequency: more than 5 attempts in last 24h
      const last24h = studentAttempts.filter(a => 
        new Date(a.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
      );
      
      if (last24h.length >= 5) {
        patterns.push({
          type: 'high_frequency',
          severity: last24h.length >= 10 ? 'critical' : last24h.length >= 7 ? 'high' : 'medium',
          description: `${student?.first_name} ${student?.last_name} made ${last24h.length} failed attempts in the last 24 hours`,
          studentId,
          studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
          details: { attemptCount: last24h.length, attempts: last24h },
        });
      }

      // Multiple devices: same student using more than 2 devices
      const devices = new Set(studentAttempts.filter(a => a.device_fingerprint).map(a => a.device_fingerprint));
      if (devices.size >= 3) {
        patterns.push({
          type: 'multiple_devices',
          severity: devices.size >= 5 ? 'high' : 'medium',
          description: `${student?.first_name} ${student?.last_name} attempted from ${devices.size} different devices`,
          studentId,
          studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
          details: { deviceCount: devices.size, devices: Array.from(devices) },
        });
      }
    });

    // Detect IP sharing: multiple students from same IP
    const byIP: Record<string, Set<string>> = {};
    attempts.forEach(a => {
      if (a.ip_address && a.student_id) {
        if (!byIP[a.ip_address]) byIP[a.ip_address] = new Set();
        byIP[a.ip_address].add(a.student_id);
      }
    });

    Object.entries(byIP).forEach(([ip, students]) => {
      if (students.size >= 3) {
        const studentNames = attempts
          .filter(a => a.ip_address === ip && a.students)
          .map(a => `${a.students?.first_name} ${a.students?.last_name}`)
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 5);
          
        patterns.push({
          type: 'ip_sharing',
          severity: students.size >= 5 ? 'critical' : students.size >= 4 ? 'high' : 'medium',
          description: `${students.size} different students attempted from IP ${ip}`,
          details: { ip, studentCount: students.size, studentNames },
        });
      }
    });

    // Detect device sharing: same device fingerprint used by multiple students
    const byDevice: Record<string, Set<string>> = {};
    attempts.forEach(a => {
      if (a.device_fingerprint && a.student_id) {
        if (!byDevice[a.device_fingerprint]) byDevice[a.device_fingerprint] = new Set();
        byDevice[a.device_fingerprint].add(a.student_id);
      }
    });

    Object.entries(byDevice).forEach(([device, students]) => {
      if (students.size >= 2) {
        const studentNames = attempts
          .filter(a => a.device_fingerprint === device && a.students)
          .map(a => `${a.students?.first_name} ${a.students?.last_name}`)
          .filter((v, i, a) => a.indexOf(v) === i);
          
        patterns.push({
          type: 'device_sharing',
          severity: 'critical',
          description: `Same device used by ${students.size} different students`,
          details: { deviceFingerprint: device.slice(0, 8) + '...', studentCount: students.size, studentNames },
        });
      }
    });

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return patterns.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  };

  return {
    attempts: attempts || [],
    stats,
    patterns: detectPatterns(),
    isLoading,
    error,
    refetch,
  };
}

export function useAttemptTypes() {
  return useQuery({
    queryKey: ['attempt-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proxy_attempt_logs')
        .select('attempt_type')
        .order('attempt_type');

      if (error) throw error;
      
      const types = new Set(data.map(d => d.attempt_type));
      return Array.from(types);
    },
  });
}
