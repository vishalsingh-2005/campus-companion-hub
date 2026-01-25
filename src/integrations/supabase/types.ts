export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          attendance_date: string
          course_id: string
          created_at: string
          id: string
          notes: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          course_id: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          course_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          course_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          notes: string | null
          room: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          notes?: string | null
          room?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          notes?: string | null
          room?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_locations: {
        Row: {
          building: string | null
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          radius_meters: number
          room_number: string | null
          updated_at: string
        }
        Insert: {
          building?: string | null
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          radius_meters?: number
          room_number?: string | null
          updated_at?: string
        }
        Update: {
          building?: string | null
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          radius_meters?: number
          room_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coding_lab_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          lab_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          lab_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          lab_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_lab_activity_logs_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "coding_labs"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_lab_plagiarism: {
        Row: {
          detected_at: string
          flagged: boolean
          id: string
          lab_id: string
          matching_lines: number | null
          review_notes: string | null
          reviewed_by: string | null
          similarity_score: number
          submission_1_id: string
          submission_2_id: string
        }
        Insert: {
          detected_at?: string
          flagged?: boolean
          id?: string
          lab_id: string
          matching_lines?: number | null
          review_notes?: string | null
          reviewed_by?: string | null
          similarity_score: number
          submission_1_id: string
          submission_2_id: string
        }
        Update: {
          detected_at?: string
          flagged?: boolean
          id?: string
          lab_id?: string
          matching_lines?: number | null
          review_notes?: string | null
          reviewed_by?: string | null
          similarity_score?: number
          submission_1_id?: string
          submission_2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_lab_plagiarism_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "coding_labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coding_lab_plagiarism_submission_1_id_fkey"
            columns: ["submission_1_id"]
            isOneToOne: false
            referencedRelation: "coding_lab_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coding_lab_plagiarism_submission_2_id_fkey"
            columns: ["submission_2_id"]
            isOneToOne: false
            referencedRelation: "coding_lab_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_lab_submissions: {
        Row: {
          compile_output: string | null
          created_at: string
          evaluated_at: string | null
          execution_time_ms: number | null
          id: string
          judge0_token: string | null
          lab_id: string
          language: string
          max_score: number | null
          memory_used_kb: number | null
          passed_test_cases: number | null
          score: number | null
          source_code: string
          status: string
          stderr: string | null
          student_id: string
          submitted_at: string
          test_results: Json | null
          total_test_cases: number | null
        }
        Insert: {
          compile_output?: string | null
          created_at?: string
          evaluated_at?: string | null
          execution_time_ms?: number | null
          id?: string
          judge0_token?: string | null
          lab_id: string
          language: string
          max_score?: number | null
          memory_used_kb?: number | null
          passed_test_cases?: number | null
          score?: number | null
          source_code: string
          status?: string
          stderr?: string | null
          student_id: string
          submitted_at?: string
          test_results?: Json | null
          total_test_cases?: number | null
        }
        Update: {
          compile_output?: string | null
          created_at?: string
          evaluated_at?: string | null
          execution_time_ms?: number | null
          id?: string
          judge0_token?: string | null
          lab_id?: string
          language?: string
          max_score?: number | null
          memory_used_kb?: number | null
          passed_test_cases?: number | null
          score?: number | null
          source_code?: string
          status?: string
          stderr?: string | null
          student_id?: string
          submitted_at?: string
          test_results?: Json | null
          total_test_cases?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coding_lab_submissions_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "coding_labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coding_lab_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_lab_test_cases: {
        Row: {
          created_at: string
          description: string | null
          expected_output: string
          id: string
          input: string
          is_hidden: boolean
          is_sample: boolean
          lab_id: string
          order_index: number
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          expected_output: string
          id?: string
          input: string
          is_hidden?: boolean
          is_sample?: boolean
          lab_id: string
          order_index?: number
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          expected_output?: string
          id?: string
          input?: string
          is_hidden?: boolean
          is_sample?: boolean
          lab_id?: string
          order_index?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "coding_lab_test_cases_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "coding_labs"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_labs: {
        Row: {
          allowed_languages: string[]
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string
          difficulty: string
          end_date: string | null
          id: string
          is_enabled: boolean
          memory_limit_mb: number
          start_date: string | null
          starter_code: Json | null
          status: string
          time_limit_seconds: number
          title: string
          updated_at: string
        }
        Insert: {
          allowed_languages?: string[]
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          difficulty?: string
          end_date?: string | null
          id?: string
          is_enabled?: boolean
          memory_limit_mb?: number
          start_date?: string | null
          starter_code?: Json | null
          status?: string
          time_limit_seconds?: number
          title: string
          updated_at?: string
        }
        Update: {
          allowed_languages?: string[]
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: string
          end_date?: string | null
          id?: string
          is_enabled?: boolean
          memory_limit_mb?: number
          start_date?: string | null
          starter_code?: Json | null
          status?: string
          time_limit_seconds?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_labs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          course_id: string
          created_at: string
          enrollment_date: string
          grade: string | null
          id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          enrollment_date?: string
          grade?: string | null
          id?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          enrollment_date?: string
          grade?: string | null
          id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      course_syllabus: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          file_name: string | null
          file_url: string | null
          id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_syllabus_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          course_code: string
          course_name: string
          created_at: string
          credits: number
          department: string | null
          description: string | null
          id: string
          max_students: number | null
          status: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          course_code: string
          course_name: string
          created_at?: string
          credits?: number
          department?: string | null
          description?: string | null
          id?: string
          max_students?: number | null
          status?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          course_code?: string
          course_name?: string
          created_at?: string
          credits?: number
          department?: string | null
          description?: string | null
          id?: string
          max_students?: number | null
          status?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          candidate_email: string | null
          candidate_id: string | null
          candidate_name: string | null
          created_at: string
          feedback: string | null
          id: string
          interview_notes: string | null
          interview_type: string | null
          link_expires_at: string | null
          live_session_id: string
          rating: number | null
          secure_link: string | null
          updated_at: string
        }
        Insert: {
          candidate_email?: string | null
          candidate_id?: string | null
          candidate_name?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          interview_notes?: string | null
          interview_type?: string | null
          link_expires_at?: string | null
          live_session_id: string
          rating?: number | null
          secure_link?: string | null
          updated_at?: string
        }
        Update: {
          candidate_email?: string | null
          candidate_id?: string | null
          candidate_name?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          interview_notes?: string | null
          interview_type?: string | null
          link_expires_at?: string | null
          live_session_id?: string
          rating?: number | null
          secure_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          course_id: string | null
          created_at: string
          description: string | null
          enable_chat: boolean | null
          enable_recording: boolean | null
          enable_screen_share: boolean | null
          enable_waiting_room: boolean | null
          host_id: string | null
          id: string
          join_token: string | null
          max_participants: number | null
          room_name: string | null
          scheduled_end: string | null
          scheduled_start: string
          session_type: Database["public"]["Enums"]["session_type"]
          status: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          enable_chat?: boolean | null
          enable_recording?: boolean | null
          enable_screen_share?: boolean | null
          enable_waiting_room?: boolean | null
          host_id?: string | null
          id?: string
          join_token?: string | null
          max_participants?: number | null
          room_name?: string | null
          scheduled_end?: string | null
          scheduled_start: string
          session_type?: Database["public"]["Enums"]["session_type"]
          status?: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          enable_chat?: boolean | null
          enable_recording?: boolean | null
          enable_screen_share?: boolean | null
          enable_waiting_room?: boolean | null
          host_id?: string | null
          id?: string
          join_token?: string | null
          max_participants?: number | null
          room_name?: string | null
          scheduled_end?: string | null
          scheduled_start?: string
          session_type?: Database["public"]["Enums"]["session_type"]
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proxy_attempt_logs: {
        Row: {
          attempt_type: string
          created_at: string
          device_fingerprint: string | null
          failure_reason: string
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          qr_token_attempted: string | null
          session_id: string | null
          student_id: string | null
          user_agent: string | null
        }
        Insert: {
          attempt_type: string
          created_at?: string
          device_fingerprint?: string | null
          failure_reason: string
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          qr_token_attempted?: string | null
          session_id?: string | null
          student_id?: string | null
          user_agent?: string | null
        }
        Update: {
          attempt_type?: string
          created_at?: string
          device_fingerprint?: string | null
          failure_reason?: string
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          qr_token_attempted?: string | null
          session_id?: string | null
          student_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proxy_attempt_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "secure_attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proxy_attempt_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_attendance_records: {
        Row: {
          created_at: string
          device_id: string | null
          distance_from_classroom_meters: number | null
          gps_accuracy_meters: number | null
          id: string
          latitude: number | null
          longitude: number | null
          marked_at: string
          qr_token_used: string
          selfie_url: string | null
          session_id: string
          student_id: string
          verification_notes: string | null
          verification_status: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          distance_from_classroom_meters?: number | null
          gps_accuracy_meters?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          marked_at?: string
          qr_token_used: string
          selfie_url?: string | null
          session_id: string
          student_id: string
          verification_notes?: string | null
          verification_status?: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          distance_from_classroom_meters?: number | null
          gps_accuracy_meters?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          marked_at?: string
          qr_token_used?: string
          selfie_url?: string | null
          session_id?: string
          student_id?: string
          verification_notes?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "secure_attendance_records_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "student_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "secure_attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_attendance_sessions: {
        Row: {
          attendance_count: number
          classroom_location_id: string | null
          course_id: string
          created_at: string
          current_qr_expires_at: string | null
          current_qr_token: string | null
          end_time: string | null
          id: string
          qr_rotation_interval_seconds: number
          qr_secret: string
          require_gps: boolean
          require_selfie: boolean
          session_date: string
          start_time: string
          status: string
          teacher_id: string
          time_window_minutes: number
          updated_at: string
        }
        Insert: {
          attendance_count?: number
          classroom_location_id?: string | null
          course_id: string
          created_at?: string
          current_qr_expires_at?: string | null
          current_qr_token?: string | null
          end_time?: string | null
          id?: string
          qr_rotation_interval_seconds?: number
          qr_secret: string
          require_gps?: boolean
          require_selfie?: boolean
          session_date?: string
          start_time?: string
          status?: string
          teacher_id: string
          time_window_minutes?: number
          updated_at?: string
        }
        Update: {
          attendance_count?: number
          classroom_location_id?: string | null
          course_id?: string
          created_at?: string
          current_qr_expires_at?: string | null
          current_qr_token?: string | null
          end_time?: string | null
          id?: string
          qr_rotation_interval_seconds?: number
          qr_secret?: string
          require_gps?: boolean
          require_selfie?: boolean
          session_date?: string
          start_time?: string
          status?: string
          teacher_id?: string
          time_window_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secure_attendance_sessions_classroom_location_id_fkey"
            columns: ["classroom_location_id"]
            isOneToOne: false
            referencedRelation: "classroom_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_attendance_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_attendance_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      session_chat: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string | null
          sender_id: string | null
          sender_name: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string | null
          sender_id?: string | null
          sender_name?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string | null
          sender_id?: string | null
          sender_name?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_chat_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          attendance_marked: boolean | null
          created_at: string
          hand_raised: boolean | null
          id: string
          is_approved: boolean | null
          is_muted: boolean | null
          is_video_off: boolean | null
          joined_at: string | null
          left_at: string | null
          participant_email: string | null
          participant_name: string | null
          role: Database["public"]["Enums"]["participant_role"]
          session_id: string
          student_id: string | null
          user_id: string | null
        }
        Insert: {
          attendance_marked?: boolean | null
          created_at?: string
          hand_raised?: boolean | null
          id?: string
          is_approved?: boolean | null
          is_muted?: boolean | null
          is_video_off?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          participant_email?: string | null
          participant_name?: string | null
          role?: Database["public"]["Enums"]["participant_role"]
          session_id: string
          student_id?: string | null
          user_id?: string | null
        }
        Update: {
          attendance_marked?: boolean | null
          created_at?: string
          hand_raised?: boolean | null
          id?: string
          is_approved?: boolean | null
          is_muted?: boolean | null
          is_video_off?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          participant_email?: string | null
          participant_name?: string | null
          role?: Database["public"]["Enums"]["participant_role"]
          session_id?: string
          student_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_answers: {
        Row: {
          answer_text: string | null
          answered_at: string | null
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          marks_awarded: number | null
          question_id: string
        }
        Insert: {
          answer_text?: string | null
          answered_at?: string | null
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id: string
        }
        Update: {
          answer_text?: string | null
          answered_at?: string | null
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_devices: {
        Row: {
          device_fingerprint: string
          device_name: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          registered_at: string
          student_id: string
          user_agent: string | null
        }
        Insert: {
          device_fingerprint: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          registered_at?: string
          student_id: string
          user_agent?: string | null
        }
        Update: {
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          registered_at?: string
          student_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_devices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          enrollment_date: string
          first_name: string
          gender: string | null
          id: string
          last_name: string
          phone: string | null
          status: string
          student_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          enrollment_date?: string
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          phone?: string | null
          status?: string
          student_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          enrollment_date?: string
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          status?: string
          student_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      teachers: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          first_name: string
          hire_date: string
          id: string
          last_name: string
          phone: string | null
          qualification: string | null
          status: string
          teacher_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          first_name: string
          hire_date?: string
          id?: string
          last_name: string
          phone?: string | null
          qualification?: string | null
          status?: string
          teacher_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          first_name?: string
          hire_date?: string
          id?: string
          last_name?: string
          phone?: string | null
          qualification?: string | null
          status?: string
          teacher_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          created_at: string
          end_latitude: number | null
          end_longitude: number | null
          end_selfie_url: string | null
          id: string
          start_latitude: number | null
          start_longitude: number | null
          start_selfie_url: string | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          tab_switch_count: number | null
          test_id: string
          total_marks_obtained: number | null
          updated_at: string
          warning_count: number | null
          was_auto_submitted: boolean | null
        }
        Insert: {
          created_at?: string
          end_latitude?: number | null
          end_longitude?: number | null
          end_selfie_url?: string | null
          id?: string
          start_latitude?: number | null
          start_longitude?: number | null
          start_selfie_url?: string | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          tab_switch_count?: number | null
          test_id: string
          total_marks_obtained?: number | null
          updated_at?: string
          warning_count?: number | null
          was_auto_submitted?: boolean | null
        }
        Update: {
          created_at?: string
          end_latitude?: number | null
          end_longitude?: number | null
          end_selfie_url?: string | null
          id?: string
          start_latitude?: number | null
          start_longitude?: number | null
          start_selfie_url?: string | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          tab_switch_count?: number | null
          test_id?: string
          total_marks_obtained?: number | null
          updated_at?: string
          warning_count?: number | null
          was_auto_submitted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          marks: number
          options: Json | null
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          test_id: string
          updated_at: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          marks?: number
          options?: Json | null
          order_index?: number
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          test_id: string
          updated_at?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          marks?: number
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          created_at: string
          graded_at: string | null
          graded_by: string | null
          id: string
          marks_obtained: number | null
          remarks: string | null
          status: string
          student_id: string
          submitted_at: string | null
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          status?: string
          student_id: string
          submitted_at?: string | null
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          status?: string
          student_id?: string
          submitted_at?: string | null
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          passing_marks: number
          scheduled_date: string
          status: string
          test_type: string
          title: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          passing_marks?: number
          scheduled_date: string
          status?: string
          test_type?: string
          title: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          passing_marks?: number
          scheduled_date?: string
          status?: string
          test_type?: string
          title?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_session_host: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
      is_session_participant: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "teacher" | "student" | "event_organizer"
      attendance_status: "present" | "absent" | "late" | "excused"
      participant_role: "host" | "co_host" | "participant" | "viewer"
      question_type: "mcq" | "true_false" | "short_answer"
      session_status: "scheduled" | "waiting" | "live" | "ended" | "cancelled"
      session_type: "live_class" | "interview"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "teacher", "student", "event_organizer"],
      attendance_status: ["present", "absent", "late", "excused"],
      participant_role: ["host", "co_host", "participant", "viewer"],
      question_type: ["mcq", "true_false", "short_answer"],
      session_status: ["scheduled", "waiting", "live", "ended", "cancelled"],
      session_type: ["live_class", "interview"],
    },
  },
} as const
