export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Attendance {
  id: string;
  student_id: string;
  course_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  students?: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string;
  };
  courses?: {
    id: string;
    course_code: string;
    course_name: string;
  };
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  studentCode: string;
  status: AttendanceStatus;
  notes: string;
}
