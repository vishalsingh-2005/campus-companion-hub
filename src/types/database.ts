export interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  enrollment_date: string;
  status: string;
  user_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  teacher_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  qualification: string | null;
  hire_date: string;
  status: string;
  user_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  course_code: string;
  course_name: string;
  description: string | null;
  credits: number;
  department: string | null;
  teacher_id: string | null;
  max_students: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  teachers?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface CourseEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_date: string;
  grade: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  students?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    student_id: string;
  };
  courses?: {
    id: string;
    course_code: string;
    course_name: string;
  };
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type StudentFormData = Omit<Student, 'id' | 'created_at' | 'updated_at'>;
export type TeacherFormData = Omit<Teacher, 'id' | 'created_at' | 'updated_at'>;
export type CourseFormData = Omit<Course, 'id' | 'created_at' | 'updated_at' | 'teachers'>;
