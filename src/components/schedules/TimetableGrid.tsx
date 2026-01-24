import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DAYS_OF_WEEK, DAY_ABBREVIATIONS } from '@/types/schedule';
import type { ClassSchedule } from '@/types/schedule';
import { Clock, MapPin, User } from 'lucide-react';

interface TimetableGridProps {
  schedules: ClassSchedule[];
  onScheduleClick?: (schedule: ClassSchedule) => void;
  showTeacher?: boolean;
  compact?: boolean;
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
];

const COLORS = [
  'bg-primary/10 border-primary/30 text-primary',
  'bg-success/10 border-success/30 text-success',
  'bg-warning/10 border-warning/30 text-warning',
  'bg-info/10 border-info/30 text-info',
  'bg-destructive/10 border-destructive/30 text-destructive',
  'bg-purple-500/10 border-purple-500/30 text-purple-600',
  'bg-pink-500/10 border-pink-500/30 text-pink-600',
  'bg-teal-500/10 border-teal-500/30 text-teal-600',
];

function formatTime(time: string) {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

function getTimeSlotIndex(time: string): number {
  const [hours] = time.split(':').map(Number);
  return hours - 8; // Starting from 08:00
}

function getScheduleDuration(start: string, end: string): number {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  return (endH * 60 + endM - startH * 60 - startM) / 60;
}

export function TimetableGrid({
  schedules,
  onScheduleClick,
  showTeacher = true,
  compact = false,
}: TimetableGridProps) {
  // Assign consistent colors to courses
  const courseColors = useMemo(() => {
    const colors = new Map<string, string>();
    const uniqueCourses = [...new Set(schedules.map(s => s.course_id))];
    uniqueCourses.forEach((courseId, index) => {
      colors.set(courseId, COLORS[index % COLORS.length]);
    });
    return colors;
  }, [schedules]);

  // Group schedules by day
  const schedulesByDay = useMemo(() => {
    const grouped: Record<number, ClassSchedule[]> = {};
    for (let i = 0; i < 7; i++) {
      grouped[i] = schedules.filter(s => s.day_of_week === i);
    }
    return grouped;
  }, [schedules]);

  // Working days only (Mon-Fri for compact view)
  const visibleDays = compact ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="overflow-x-auto">
      <div className={cn(
        'grid gap-1 min-w-[800px]',
        compact ? 'grid-cols-6' : 'grid-cols-8'
      )}>
        {/* Header - Time column */}
        <div className="sticky left-0 bg-background z-10">
          <div className="h-12 flex items-center justify-center text-sm font-medium text-muted-foreground border-b">
            Time
          </div>
          {TIME_SLOTS.map((time) => (
            <div
              key={time}
              className="h-16 flex items-start justify-center pt-1 text-xs text-muted-foreground border-b"
            >
              {formatTime(time)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {visibleDays.map((dayIndex) => (
          <div key={dayIndex} className="relative">
            {/* Day header */}
            <div className="h-12 flex items-center justify-center text-sm font-medium border-b bg-muted/30">
              {compact ? DAY_ABBREVIATIONS[dayIndex] : DAYS_OF_WEEK[dayIndex]}
            </div>

            {/* Time slots background */}
            {TIME_SLOTS.map((time) => (
              <div
                key={time}
                className="h-16 border-b border-dashed border-muted"
              />
            ))}

            {/* Scheduled classes */}
            {schedulesByDay[dayIndex]?.map((schedule) => {
              const startSlot = getTimeSlotIndex(schedule.start_time.slice(0, 5));
              const duration = getScheduleDuration(
                schedule.start_time.slice(0, 5),
                schedule.end_time.slice(0, 5)
              );
              const colorClass = courseColors.get(schedule.course_id) || COLORS[0];

              // Only show if within visible time range
              if (startSlot < 0 || startSlot >= TIME_SLOTS.length) return null;

              return (
                <Card
                  key={schedule.id}
                  className={cn(
                    'absolute left-1 right-1 border-l-4 cursor-pointer hover:shadow-md transition-shadow overflow-hidden',
                    colorClass,
                    onScheduleClick && 'hover:scale-[1.02]'
                  )}
                  style={{
                    top: `${48 + startSlot * 64 + 4}px`, // 48px header + slot height + padding
                    height: `${duration * 64 - 8}px`, // slot height * duration - padding
                  }}
                  onClick={() => onScheduleClick?.(schedule)}
                >
                  <CardContent className="p-2 h-full flex flex-col">
                    <p className="font-semibold text-xs line-clamp-1">
                      {schedule.courses?.course_code}
                    </p>
                    <p className="text-xs line-clamp-1 opacity-80">
                      {schedule.courses?.course_name}
                    </p>
                    
                    {duration >= 1.5 && (
                      <div className="mt-auto space-y-0.5">
                        <div className="flex items-center gap-1 text-xs opacity-70">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(schedule.start_time.slice(0, 5))}</span>
                        </div>
                        {schedule.room && (
                          <div className="flex items-center gap-1 text-xs opacity-70">
                            <MapPin className="h-3 w-3" />
                            <span>{schedule.room}</span>
                          </div>
                        )}
                        {showTeacher && schedule.courses?.teachers && (
                          <div className="flex items-center gap-1 text-xs opacity-70">
                            <User className="h-3 w-3" />
                            <span>{schedule.courses.teachers.first_name} {schedule.courses.teachers.last_name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
