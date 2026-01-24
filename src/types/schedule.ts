export interface ClassSchedule {
  id: string;
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  courses?: {
    id: string;
    course_code: string;
    course_name: string;
    teachers?: {
      id: string;
      first_name: string;
      last_name: string;
    } | null;
  };
}

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
