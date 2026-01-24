import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, GraduationCap, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { Student, Course } from '@/types/database';

interface TeacherData {
  id: string;
  first_name: string;
  last_name: string;
  teacher_id: string;
  email: string;
  department: string | null;
  qualification: string | null;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchTeacherData() {
      if (!user) return;

      try {
        // Fetch teacher profile linked to this user
        const { data: teacher, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (teacherError) throw teacherError;
        setTeacherData(teacher);

        if (teacher) {
          // Fetch courses assigned to this teacher
          const { data: courses, error: coursesError } = await supabase
            .from('courses')
            .select('*')
            .eq('teacher_id', teacher.id);

          if (coursesError) throw coursesError;
          setAssignedCourses(courses || []);
        }

        // Fetch all students (read-only for teachers)
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .order('last_name');

        if (studentError) throw studentError;
        setStudents(studentData || []);
      } catch (error) {
        console.error('Error fetching teacher data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTeacherData();
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

  const activeCourses = assignedCourses.filter((c) => c.status === 'active').length;
  const totalStudents = students.filter((s) => s.status === 'active').length;

  const filteredStudents = students.filter((student) =>
    `${student.first_name} ${student.last_name} ${student.email} ${student.student_id}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Welcome, ${teacherData?.first_name || 'Teacher'}!`}
        description="View your assigned courses and student information"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Courses"
          value={assignedCourses.length}
          icon={BookOpen}
        />
        <StatCard
          title="Active Courses"
          value={activeCourses}
          icon={Calendar}
          variant="success"
        />
        <StatCard
          title="Total Students"
          value={totalStudents}
          icon={Users}
          variant="info"
        />
        <StatCard
          title="Department"
          value={teacherData?.department || 'N/A'}
          icon={GraduationCap}
          variant="warning"
        />
      </div>

      {/* Profile Card */}
      {teacherData && (
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Teacher ID</p>
                <p className="font-medium">{teacherData.teacher_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{teacherData.first_name} {teacherData.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{teacherData.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Qualification</p>
                <p className="font-medium">{teacherData.qualification || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assigned Courses */}
      <Card>
        <CardHeader>
          <CardTitle>My Assigned Courses</CardTitle>
        </CardHeader>
        <CardContent>
          {assignedCourses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No courses assigned yet.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignedCourses.map((course) => (
                <div
                  key={course.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{course.course_name}</p>
                      <p className="text-sm text-muted-foreground">{course.course_code}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {course.credits} credits
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          course.status === 'active'
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {course.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students List (Read-Only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Students
            <span className="text-sm font-normal text-muted-foreground">(Read Only)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.slice(0, 10).map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>{student.first_name} {student.last_name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            student.status === 'active'
                              ? 'bg-success/10 text-success'
                              : student.status === 'inactive'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-warning/10 text-warning'
                          }`}
                        >
                          {student.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredStudents.length > 10 && (
            <p className="text-sm text-muted-foreground text-center">
              Showing 10 of {filteredStudents.length} students
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
