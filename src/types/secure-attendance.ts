export interface ClassroomLocation {
  id: string;
  name: string;
  building: string | null;
  room_number: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  created_at: string;
  updated_at: string;
}

export interface SecureAttendanceSession {
  id: string;
  course_id: string;
  teacher_id: string;
  classroom_location_id: string | null;
  session_date: string;
  start_time: string;
  end_time: string | null;
  time_window_minutes: number;
  qr_secret: string;
  qr_rotation_interval_seconds: number;
  current_qr_token: string | null;
  current_qr_expires_at: string | null;
  require_selfie: boolean;
  require_gps: boolean;
  status: 'active' | 'ended' | 'cancelled';
  attendance_count: number;
  created_at: string;
  updated_at: string;
  courses?: {
    id: string;
    course_name: string;
    course_code: string;
  };
  teachers?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  classroom_locations?: ClassroomLocation;
}

export interface SecureAttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  device_id: string | null;
  marked_at: string;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_meters: number | null;
  distance_from_classroom_meters: number | null;
  selfie_url: string | null;
  qr_token_used: string;
  verification_status: 'verified' | 'pending_review' | 'rejected';
  verification_notes: string | null;
  created_at: string;
  students?: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string;
  };
}

export interface StudentDevice {
  id: string;
  student_id: string;
  device_fingerprint: string;
  device_name: string | null;
  user_agent: string | null;
  registered_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

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
    first_name: string;
    last_name: string;
    student_id: string;
  };
}

export interface CreateSessionParams {
  course_id: string;
  classroom_location_id?: string;
  time_window_minutes: number;
  require_selfie: boolean;
  require_gps: boolean;
}

export interface MarkAttendanceParams {
  session_id: string;
  qr_token: string;
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
  device_fingerprint?: string;
  selfie_url?: string;
}
