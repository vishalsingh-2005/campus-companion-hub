import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Holiday } from '@/hooks/useHolidays';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_COLORS: Record<string, string> = {
  national: 'bg-destructive/15 text-destructive border-destructive/30',
  academic: 'bg-primary/15 text-primary border-primary/30',
  religious: 'bg-warning/15 text-warning-foreground border-warning/30',
  exam: 'bg-info/15 text-info-foreground border-info/30',
  general: 'bg-muted text-muted-foreground border-border',
};

const TYPE_DOT: Record<string, string> = {
  national: 'bg-destructive',
  academic: 'bg-primary',
  religious: 'bg-yellow-500',
  exam: 'bg-blue-500',
  general: 'bg-muted-foreground',
};

interface HolidayCalendarProps {
  holidays: Holiday[];
  loading?: boolean;
}

export function HolidayCalendar({ holidays, loading }: HolidayCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const holidayMap = useMemo(() => {
    const map: Record<string, Holiday[]> = {};
    holidays.forEach((h) => {
      const key = h.holiday_date; // YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(h);
    });
    return map;
  }, [holidays]);

  const upcoming = useMemo(() => {
    const todayStr = today.toISOString().slice(0, 10);
    return holidays
      .filter((h) => h.holiday_date >= todayStr)
      .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
      .slice(0, 6);
  }, [holidays]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Calendar grid */}
      <div className="lg:col-span-2 rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="icon" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {MONTH_NAMES[month]} {year}
          </h3>
          <Button variant="outline" size="icon" onClick={next}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayHolidays = holidayMap[dateStr] || [];
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                className={cn(
                  'relative min-h-[3.5rem] rounded-lg p-1.5 text-sm transition-colors',
                  isToday && 'ring-2 ring-primary bg-primary/5',
                  dayHolidays.length > 0 && !isToday && 'bg-accent/40',
                )}
              >
                <span className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday && 'bg-primary text-primary-foreground',
                )}>
                  {day}
                </span>
                {dayHolidays.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {dayHolidays.map((h) => (
                      <span
                        key={h.id}
                        title={h.title}
                        className={cn('h-1.5 w-1.5 rounded-full', TYPE_DOT[h.holiday_type] || TYPE_DOT.general)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
          {Object.entries(TYPE_DOT).map(([type, dotClass]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('h-2.5 w-2.5 rounded-full', dotClass)} />
              <span className="capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming holidays sidebar */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Upcoming Holidays</h3>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming holidays</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((h) => {
              const d = new Date(h.holiday_date + 'T00:00:00');
              return (
                <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                  <div className="flex flex-col items-center min-w-[2.5rem] rounded-md bg-primary/10 px-2 py-1">
                    <span className="text-[10px] font-medium text-primary uppercase">
                      {d.toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold text-primary leading-tight">
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{h.title}</p>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] mt-1', TYPE_COLORS[h.holiday_type] || TYPE_COLORS.general)}
                    >
                      {h.holiday_type}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
