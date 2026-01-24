import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, GraduationCap, Award, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface EnrollmentData {
  id: string;
  grade: string | null;
  status: string;
  enrollment_date: string;
  courses: {
    id: string;
    course_name: string;
    course_code: string;
    credits: number;
    description: string | null;
    department: string | null;
    teachers: {
      first_name: string;
      last_name: string;
    } | null;
  } | null;
}

export default function StudentCourses() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        // Get student ID
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!student) {
          setLoading(false);
          return;
        }

        setStudentId(student.id);

        // Fetch enrollments with course details
        const { data: enrollmentData, error } = await supabase
          .from('course_enrollments')
          .select(`
            id,
            grade,
            status,
            enrollment_date,
            courses (
              id,
              course_name,
              course_code,
              credits,
              description,
              department,
              teachers (
                first_name,
                last_name
              )
            )
          `)
          .eq('student_id', student.id)
          .order('enrollment_date', { ascending: false });

        if (error) throw error;
        setEnrollments(enrollmentData || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!studentId) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Student Profile Found</h2>
          <p className="text-muted-foreground">
            Your account is not linked to a student profile. Please contact your administrator.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const enrolledCourses = enrollments.filter(e => e.status === 'enrolled');
  const completedCourses = enrollments.filter(e => e.status === 'completed');
  const totalCredits = enrollments.reduce((acc, e) => acc + (e.courses?.credits || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="My Courses"
          description="View your enrolled courses and academic progress"
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{enrolledCourses.length}</p>
                  <p className="text-sm text-muted-foreground">Currently Enrolled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <Award className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedCourses.length}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCredits}</p>
                  <p className="text-sm text-muted-foreground">Total Credits</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course List */}
        {enrollments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Courses Yet</h3>
              <p className="text-muted-foreground">
                You are not enrolled in any courses. Please contact your administrator.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => (
              <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <Badge
                      variant={enrollment.status === 'enrolled' ? 'default' : enrollment.status === 'completed' ? 'secondary' : 'outline'}
                    >
                      {enrollment.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{enrollment.courses?.course_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{enrollment.courses?.course_code}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {enrollment.courses?.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {enrollment.courses.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      {enrollment.courses?.credits} credits
                    </span>
                    {enrollment.courses?.department && (
                      <span className="text-muted-foreground">
                        {enrollment.courses.department}
                      </span>
                    )}
                  </div>
                  {enrollment.courses?.teachers && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {enrollment.courses.teachers.first_name} {enrollment.courses.teachers.last_name}
                      </span>
                    </div>
                  )}
                  {enrollment.grade && (
                    <div className="pt-2 border-t">
                      <span className="text-sm font-medium">Grade: </span>
                      <Badge variant="outline" className="ml-1">
                        {enrollment.grade}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
