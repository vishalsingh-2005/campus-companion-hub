import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Award,
  Building2,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';

interface EnrollmentTrend {
  month: string;
  enrollments: number;
  students: number;
}

interface GradeDistribution {
  grade: string;
  count: number;
  percentage: number;
}

interface DepartmentStats {
  department: string;
  courses: number;
  teachers: number;
  students: number;
}

interface CoursePopularity {
  name: string;
  enrollments: number;
}

const COLORS = [
  'hsl(173, 58%, 39%)',
  'hsl(199, 89%, 48%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(262, 83%, 58%)',
];

const GRADE_COLORS: Record<string, string> = {
  'A+': 'hsl(142, 76%, 36%)',
  'A': 'hsl(142, 76%, 42%)',
  'A-': 'hsl(142, 76%, 48%)',
  'B+': 'hsl(173, 58%, 39%)',
  'B': 'hsl(173, 58%, 45%)',
  'B-': 'hsl(173, 58%, 51%)',
  'C+': 'hsl(38, 92%, 50%)',
  'C': 'hsl(38, 92%, 55%)',
  'C-': 'hsl(38, 92%, 60%)',
  'D': 'hsl(0, 84%, 55%)',
  'F': 'hsl(0, 84%, 60%)',
  'N/A': 'hsl(215, 16%, 47%)',
};

export default function Reports() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [enrollmentTrends, setEnrollmentTrends] = useState<EnrollmentTrend[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [coursePopularity, setCoursePopularity] = useState<CoursePopularity[]>([]);
  const [totals, setTotals] = useState({
    students: 0,
    teachers: 0,
    courses: 0,
    enrollments: 0,
  });

  useEffect(() => {
    async function fetchReportData() {
      try {
        // Fetch all data in parallel
        const [
          { data: students },
          { data: teachers },
          { data: courses },
          { data: enrollments },
        ] = await Promise.all([
          supabase.from('students').select('id, created_at, status'),
          supabase.from('teachers').select('id, department, status'),
          supabase.from('courses').select('id, course_name, department, teacher_id'),
          supabase.from('course_enrollments').select('id, enrollment_date, grade, course_id, courses(course_name)'),
        ]);

        // Set totals
        setTotals({
          students: students?.length || 0,
          teachers: teachers?.length || 0,
          courses: courses?.length || 0,
          enrollments: enrollments?.length || 0,
        });

        // Calculate enrollment trends (last 6 months)
        const trends: EnrollmentTrend[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });

          const monthEnrollments = enrollments?.filter((e) => {
            const date = new Date(e.enrollment_date);
            return date >= monthDate && date <= monthEnd;
          }).length || 0;

          const monthStudents = students?.filter((s) => {
            const date = new Date(s.created_at);
            return date >= monthDate && date <= monthEnd;
          }).length || 0;

          trends.push({
            month: monthName,
            enrollments: monthEnrollments,
            students: monthStudents,
          });
        }
        setEnrollmentTrends(trends);

        // Calculate grade distribution
        const gradeCounts: Record<string, number> = {};
        enrollments?.forEach((e) => {
          const grade = e.grade || 'N/A';
          gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        });

        const totalWithGrades = Object.values(gradeCounts).reduce((a, b) => a + b, 0);
        const grades: GradeDistribution[] = Object.entries(gradeCounts)
          .map(([grade, count]) => ({
            grade,
            count,
            percentage: totalWithGrades > 0 ? Math.round((count / totalWithGrades) * 100) : 0,
          }))
          .sort((a, b) => {
            const order = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F', 'N/A'];
            return order.indexOf(a.grade) - order.indexOf(b.grade);
          });
        setGradeDistribution(grades);

        // Calculate department statistics
        const deptMap: Record<string, DepartmentStats> = {};
        courses?.forEach((c) => {
          const dept = c.department || 'Unassigned';
          if (!deptMap[dept]) {
            deptMap[dept] = { department: dept, courses: 0, teachers: 0, students: 0 };
          }
          deptMap[dept].courses++;
        });

        teachers?.forEach((t) => {
          const dept = t.department || 'Unassigned';
          if (!deptMap[dept]) {
            deptMap[dept] = { department: dept, courses: 0, teachers: 0, students: 0 };
          }
          deptMap[dept].teachers++;
        });

        // Count students per department based on enrollments
        const courseEnrollmentCounts: Record<string, number> = {};
        enrollments?.forEach((e) => {
          const course = courses?.find((c) => c.id === e.course_id);
          if (course) {
            const dept = course.department || 'Unassigned';
            courseEnrollmentCounts[dept] = (courseEnrollmentCounts[dept] || 0) + 1;
          }
        });

        Object.entries(courseEnrollmentCounts).forEach(([dept, count]) => {
          if (deptMap[dept]) {
            deptMap[dept].students = count;
          }
        });

        setDepartmentStats(Object.values(deptMap).filter((d) => d.courses > 0 || d.teachers > 0));

        // Calculate course popularity
        const courseEnrollments: Record<string, { name: string; count: number }> = {};
        enrollments?.forEach((e: any) => {
          const courseName = e.courses?.course_name || 'Unknown';
          if (!courseEnrollments[e.course_id]) {
            courseEnrollments[e.course_id] = { name: courseName, count: 0 };
          }
          courseEnrollments[e.course_id].count++;
        });

        const popularCourses = Object.values(courseEnrollments)
          .map((c) => ({ name: c.name, enrollments: c.count }))
          .sort((a, b) => b.enrollments - a.enrollments)
          .slice(0, 5);
        setCoursePopularity(popularCourses);

      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!roleLoading && isAdmin) {
      fetchReportData();
    }
  }, [roleLoading, isAdmin]);

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/access-denied" replace />;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader title="Reports & Analytics" description="Loading analytics data..." />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive insights into your college management data"
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Students"
          value={totals.students}
          icon={GraduationCap}
          variant="info"
        />
        <StatCard
          title="Total Teachers"
          value={totals.teachers}
          icon={Users}
          variant="success"
        />
        <StatCard
          title="Total Courses"
          value={totals.courses}
          icon={BookOpen}
          variant="warning"
        />
        <StatCard
          title="Total Enrollments"
          value={totals.enrollments}
          icon={TrendingUp}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Enrollment Trends */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Enrollment Trends
            </CardTitle>
            <CardDescription>Monthly enrollments and new students over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={enrollmentTrends}>
                  <defs>
                    <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="enrollments"
                    stroke="hsl(173, 58%, 39%)"
                    fillOpacity={1}
                    fill="url(#colorEnrollments)"
                    name="Enrollments"
                  />
                  <Area
                    type="monotone"
                    dataKey="students"
                    stroke="hsl(199, 89%, 48%)"
                    fillOpacity={1}
                    fill="url(#colorStudents)"
                    name="New Students"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Grade Distribution
            </CardTitle>
            <CardDescription>Distribution of grades across all enrollments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="grade"
                    label={({ grade, percentage }) => `${grade}: ${percentage}%`}
                    labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={GRADE_COLORS[entry.grade] || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [`${value} students`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Statistics */}
        <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Department Statistics
            </CardTitle>
            <CardDescription>Courses, teachers, and enrollment by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {departmentStats.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No department data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      dataKey="department"
                      type="category"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      width={100}
                      tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="courses" fill="hsl(173, 58%, 39%)" name="Courses" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="teachers" fill="hsl(199, 89%, 48%)" name="Teachers" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="students" fill="hsl(142, 76%, 36%)" name="Enrollments" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Course Popularity */}
        <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Most Popular Courses
            </CardTitle>
            <CardDescription>Top 5 courses by enrollment count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {coursePopularity.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No enrollment data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coursePopularity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => value.length > 10 ? `${value.slice(0, 10)}...` : value}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value} students`, 'Enrollments']}
                    />
                    <Bar dataKey="enrollments" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]}>
                      {coursePopularity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Summary Table */}
      <Card className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle>Grade Summary</CardTitle>
          <CardDescription>Detailed breakdown of grade distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Count</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Percentage</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {gradeDistribution.map((grade) => (
                  <tr key={grade.grade} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${GRADE_COLORS[grade.grade]}20`,
                          color: GRADE_COLORS[grade.grade],
                        }}
                      >
                        {grade.grade}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{grade.count}</td>
                    <td className="py-3 px-4 text-muted-foreground">{grade.percentage}%</td>
                    <td className="py-3 px-4 w-48">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${grade.percentage}%`,
                              backgroundColor: GRADE_COLORS[grade.grade],
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
