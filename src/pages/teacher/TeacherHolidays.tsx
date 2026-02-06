import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { HolidayCalendar } from '@/components/holidays/HolidayCalendar';
import { useHolidays } from '@/hooks/useHolidays';

export default function TeacherHolidays() {
  const { holidays, isLoading } = useHolidays();

  return (
    <DashboardLayout>
      <PageHeader
        title="Academic Calendar"
        description="View upcoming holidays and important academic dates"
      />
      <HolidayCalendar holidays={holidays} loading={isLoading} />
    </DashboardLayout>
  );
}
