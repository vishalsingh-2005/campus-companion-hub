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
  weekend: 'bg-muted/60 text-muted-foreground border-muted',
  general: 'bg-muted text-muted-foreground border-border',
};

const TYPE_DOT: Record<string, string> = {
  national: 'bg-destructive',
  academic: 'bg-primary',
  religious: 'bg-yellow-500',
  exam: 'bg-blue-500',
  weekend: 'bg-muted-foreground/50',
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const holidayMap = useMemo(() => {
    const map: Record<string, Holiday[]> = {};
    holidays.forEach((h) => {
      const key = h.holiday_date;
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
      .slice(0, 8);
  }, [holidays]);

  // Count holidays by type for this month
  const monthStats = useMemo(() => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthHolidays = holidays.filter(h => h.holiday_date.startsWith(monthStr));
    const types: Record<string, number> = {};
    monthHolidays.forEach(h => {
      types[h.holiday_type] = (types[h.holiday_type] || 0) + 1;
    });
    return { total: monthHolidays.length, types };
  }, [holidays, year, month]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Check if a date is a weekend (Saturday=6, Sunday=0)
  const isWeekend = (dayOfMonth: number) => {
    const date = new Date(year, month, dayOfMonth);
    const dow = date.getDay();
    return dow === 0 || dow === 6;
  };

  // Get selected day holidays
  const selectedHolidays = selectedDate ? (holidayMap[selectedDate] || []) : [];
  const selectedIsWeekend = selectedDate ? (() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.getDay() === 0 || d.getDay() === 6;
  })() : false;

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
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="icon" onClick={prev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                {MONTH_NAMES[month]} {year}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {monthStats.total} holiday{monthStats.total !== 1 ? 's' : ''} this month
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={next}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_LABELS.map((d, i) => (
              <div key={d} className={cn(
                "text-center text-xs font-medium py-2",
                (i === 0 || i === 6) ? "text-destructive/70" : "text-muted-foreground"
              )}>
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
              const weekend = isWeekend(day);
              const isSelected = dateStr === selectedDate;
              const hasHoliday = dayHolidays.length > 0;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={cn(
                    'relative min-h-[3.5rem] rounded-lg p-1.5 text-sm transition-all text-left',
                    'hover:ring-1 hover:ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50',
                    isToday && 'ring-2 ring-primary bg-primary/5',
                    isSelected && !isToday && 'ring-2 ring-primary/60 bg-primary/10',
                    weekend && !isToday && !isSelected && 'bg-destructive/5',
                    hasHoliday && !isToday && !isSelected && !weekend && 'bg-accent/40',
                  )}
                >
                  <span className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    isToday && 'bg-primary text-primary-foreground',
                    weekend && !isToday && 'text-destructive/80',
                  )}>
                    {day}
                  </span>
                  {hasHoliday && (
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
                </button>
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
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-5 rounded bg-destructive/10 border border-destructive/20" />
              <span>Weekend</span>
            </div>
          </div>
        </div>

        {/* Selected Day Detail */}
        {selectedDate && (
          <div className="rounded-xl border bg-card p-4 shadow-sm animate-fade-in">
            <h4 className="font-semibold mb-3">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
              })}
            </h4>
            {selectedIsWeekend && selectedHolidays.length === 0 && (
              <p className="text-sm text-muted-foreground">Weekend day — no classes scheduled.</p>
            )}
            {selectedHolidays.length > 0 ? (
              <div className="space-y-2">
                {selectedHolidays.map(h => (
                  <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                    <span className={cn('mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0', TYPE_DOT[h.holiday_type] || TYPE_DOT.general)} />
                    <div>
                      <p className="font-medium text-sm">{h.title}</p>
                      {h.description && <p className="text-xs text-muted-foreground mt-0.5">{h.description}</p>}
                      <Badge variant="outline" className={cn('text-[10px] mt-1', TYPE_COLORS[h.holiday_type] || TYPE_COLORS.general)}>
                        {h.holiday_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : !selectedIsWeekend ? (
              <p className="text-sm text-muted-foreground">No holidays on this date.</p>
            ) : null}
          </div>
        )}
      </div>

      {/* Upcoming holidays sidebar */}
      <div className="space-y-4">
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
                  <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
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
                      {h.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{h.description}</p>
                      )}
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

        {/* Weekend Info Card */}
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
          <h4 className="font-semibold text-sm mb-2">📅 Weekly Off Days</h4>
          <p className="text-xs text-muted-foreground">
            Saturday and Sunday are marked as weekly off days. These are highlighted in the calendar with a light red background.
          </p>
        </div>
      </div>
    </div>
  );
}
