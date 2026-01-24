import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, GraduationCap, ClipboardList, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  email: string;
  status: string;
}

interface EnrollmentData {
  id: string;
  grade: string | null;
  status: string;
  courses: {
    course_name: string;
    course_code: string;
    credits: number;
  } | null;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);

  useEffect(() => {
    async function fetchStudentData() {
      if (!user) return;

      try {
        // Fetch student profile linked to this user
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (studentError) throw studentError;
        setStudentData(student);

        if (student) {
          // Fetch enrollments for this student
          const { data: enrollmentData, error: enrollmentError } = await supabase
            .from('course_enrollments')
            .select(`
              id,
              grade,
              status,
              courses (
                course_name,
                course_code,
                credits
              )
            `)
            .eq('student_id', student.id);

          if (enrollmentError) throw enrollmentError;
          setEnrollments(enrollmentData || []);
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStudentData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const enrolledCourses = enrollments.filter((e) => e.status === 'enrolled').length;
  const completedCourses = enrollments.filter((e) => e.status === 'completed').length;
  const totalCredits = enrollments.reduce((acc, e) => acc + (e.courses?.credits || 0), 0);
  const averageGrade = enrollments.filter((e) => e.grade).length > 0
    ? 'A-' // Placeholder - would calculate actual GPA
    : 'N/A';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Welcome, ${studentData?.first_name || 'Student'}!`}
        description="View your academic progress and enrolled courses"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Enrolled Courses"
          value={enrolledCourses}
          icon={BookOpen}
          trend={{ value: enrolledCourses, isPositive: true }}
        />
        <StatCard
          title="Completed"
          value={completedCourses}
          icon={GraduationCap}
          variant="success"
        />
        <StatCard
          title="Total Credits"
          value={totalCredits}
          icon={ClipboardList}
          variant="warning"
        />
        <StatCard
          title="Average Grade"
          value={averageGrade}
          icon={Award}
          variant="info"
        />
      </div>

      {/* Profile Card */}
      {studentData && (
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Student ID</p>
                <p className="font-medium">{studentData.student_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{studentData.first_name} {studentData.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{studentData.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  studentData.status === 'active'
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {studentData.status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrolled Courses */}
      <Card>
        <CardHeader>
          <CardTitle>My Courses</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              You are not enrolled in any courses yet.
            </p>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{enrollment.courses?.course_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {enrollment.courses?.course_code} • {enrollment.courses?.credits} credits
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      enrollment.status === 'enrolled'
                        ? 'bg-info/10 text-info'
                        : enrollment.status === 'completed'
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {enrollment.status}
                    </span>
                    {enrollment.grade && (
                      <p className="text-sm font-medium mt-1">Grade: {enrollment.grade}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
