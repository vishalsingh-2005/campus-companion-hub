import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/ui/stat-card';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardCheck, 
  Calendar,
  Clock,
  BookOpen,
  Trophy,
  AlertCircle,
  CheckCircle2,
  Target,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isFuture, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface Test {
  id: string;
  title: string;
  description: string | null;
  test_type: string;
  total_marks: number;
  passing_marks: number;
  scheduled_date: string;
  duration_minutes: number;
  status: string;
  courses: {
    id: string;
    course_code: string;
    course_name: string;
  };
}

interface TestResult {
  id: string;
  marks_obtained: number | null;
  status: string;
  remarks: string | null;
  graded_at: string | null;
  tests: Test;
}

export default function StudentTests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Test[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        // Get student ID first
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (student) {
          setStudentId(student.id);

          // Fetch tests for enrolled courses
          const { data: testsData, error: testsError } = await supabase
            .from('tests')
            .select(`
              id,
              title,
              description,
              test_type,
              total_marks,
              passing_marks,
              scheduled_date,
              duration_minutes,
              status,
              courses (
                id,
                course_code,
                course_name
              )
            `)
            .order('scheduled_date', { ascending: true });

          if (testsError) throw testsError;
          setTests((testsData as unknown as Test[]) || []);

          // Fetch test results
          const { data: resultsData, error: resultsError } = await supabase
            .from('test_results')
            .select(`
              id,
              marks_obtained,
              status,
              remarks,
              graded_at,
              tests (
                id,
                title,
                description,
                test_type,
                total_marks,
                passing_marks,
                scheduled_date,
                duration_minutes,
                status,
                courses (
                  id,
                  course_code,
                  course_name
                )
              )
            `)
            .eq('student_id', student.id)
            .order('graded_at', { ascending: false });

          if (resultsError) throw resultsError;
          setResults((resultsData as unknown as TestResult[]) || []);
        }
      } catch (error) {
        console.error('Error fetching tests:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // Calculate stats - show scheduled/active tests regardless of date
  const availableTests = tests.filter(t => t.status === 'scheduled' || t.status === 'active');
  const upcomingTests = availableTests.filter(t => isFuture(new Date(t.scheduled_date)));
  const activeNowTests = availableTests.filter(t => t.status === 'active' || (t.status === 'scheduled' && !isFuture(new Date(t.scheduled_date))));
  const completedTests = results.filter(r => r.status === 'graded');
  const pendingResults = results.filter(r => r.status === 'pending' || r.status === 'submitted');
  
  const averageScore = completedTests.length > 0
    ? completedTests.reduce((sum, r) => {
        const percentage = ((r.marks_obtained || 0) / r.tests.total_marks) * 100;
        return sum + percentage;
      }, 0) / completedTests.length
    : 0;

  const passedTests = completedTests.filter(r => 
    (r.marks_obtained || 0) >= r.tests.passing_marks
  ).length;

  const getTestTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      quiz: 'bg-blue-500/10 text-blue-500',
      midterm: 'bg-orange-500/10 text-orange-500',
      final: 'bg-red-500/10 text-red-500',
      assignment: 'bg-green-500/10 text-green-500',
    };
    return variants[type] || 'bg-muted text-muted-foreground';
  };

  const getStatusBadge = (test: Test) => {
    const date = new Date(test.scheduled_date);
    if (test.status === 'cancelled') return { label: 'Cancelled', class: 'bg-destructive/10 text-destructive' };
    if (test.status === 'completed') return { label: 'Completed', class: 'bg-success/10 text-success' };
    if (isToday(date)) return { label: 'Today', class: 'bg-warning/10 text-warning' };
    if (isFuture(date)) return { label: 'Upcoming', class: 'bg-primary/10 text-primary' };
    return { label: 'Past', class: 'bg-muted text-muted-foreground' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Tests & Exams"
        description="View upcoming tests, results, and your performance stats"
      />

      {/* Stats Bar */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Upcoming Tests"
          value={upcomingTests.length}
          icon={Calendar}
          description="Scheduled tests"
        />
        <StatCard
          title="Completed"
          value={completedTests.length}
          icon={CheckCircle2}
          description="Tests taken"
        />
        <StatCard
          title="Average Score"
          value={`${averageScore.toFixed(1)}%`}
          icon={TrendingUp}
          description="Overall performance"
        />
        <StatCard
          title="Pass Rate"
          value={completedTests.length > 0 ? `${((passedTests / completedTests.length) * 100).toFixed(0)}%` : 'N/A'}
          icon={Trophy}
          description={`${passedTests}/${completedTests.length} passed`}
        />
      </div>

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList>
          <TabsTrigger value="available" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Available ({availableTests.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Results ({completedTests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {availableTests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Upcoming Tests</h3>
                <p className="text-muted-foreground text-center mt-2">
                  You have no scheduled tests at the moment. Check back later!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {availableTests.map((test) => {
                const status = getStatusBadge(test);
                return (
                  <Card key={test.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ClipboardCheck className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{test.title}</h3>
                              <Badge className={getTestTypeBadge(test.test_type)}>
                                {test.test_type}
                              </Badge>
                              <Badge className={status.class}>
                                {status.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <BookOpen className="h-4 w-4" />
                              <span>{test.courses?.course_name}</span>
                              <span className="text-muted-foreground/50">•</span>
                              <span>{test.courses?.course_code}</span>
                            </div>
                            {test.description && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {test.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(test.scheduled_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="h-4 w-4" />
                            <span>{format(new Date(test.scheduled_date), 'h:mm a')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Target className="h-4 w-4" />
                            <span>{test.total_marks} marks • {test.duration_minutes} min</span>
                          </div>
                          {(test.status === 'active' || test.status === 'scheduled') && (
                            <Button
                              size="sm"
                              className="mt-3"
                              onClick={() => navigate(`/student/take-test/${test.id}`)}
                            >
                              {test.status === 'active' ? 'Take Test' : 'View Details'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {completedTests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardCheck className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Results Yet</h3>
                <p className="text-muted-foreground text-center mt-2">
                  Your test results will appear here once graded by your teachers.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {completedTests.map((result) => {
                const test = result.tests;
                const percentage = ((result.marks_obtained || 0) / test.total_marks) * 100;
                const passed = (result.marks_obtained || 0) >= test.passing_marks;
                
                return (
                  <Card key={result.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={cn(
                            "h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0",
                            passed ? "bg-success/10" : "bg-destructive/10"
                          )}>
                            {passed ? (
                              <CheckCircle2 className="h-6 w-6 text-success" />
                            ) : (
                              <AlertCircle className="h-6 w-6 text-destructive" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{test.title}</h3>
                              <Badge className={getTestTypeBadge(test.test_type)}>
                                {test.test_type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <BookOpen className="h-4 w-4" />
                              <span>{test.courses?.course_name}</span>
                            </div>
                            {result.remarks && (
                              <p className="text-sm text-muted-foreground mt-2 italic">
                                "{result.remarks}"
                              </p>
                            )}
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Score</span>
                                <span className="font-medium">
                                  {result.marks_obtained}/{test.total_marks} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <Progress 
                                value={percentage} 
                                className={cn(
                                  "h-2",
                                  passed ? "[&>div]:bg-success" : "[&>div]:bg-destructive"
                                )}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Badge className={passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}>
                            {passed ? 'Passed' : 'Failed'}
                          </Badge>
                          {result.graded_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Graded {format(new Date(result.graded_at), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
