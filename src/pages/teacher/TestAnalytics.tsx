import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  ArrowLeft,
  Users,
  Trophy,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TestInfo {
  id: string;
  title: string;
  total_marks: number;
  passing_marks: number;
  duration_minutes: number;
  test_type: string;
  courses: { course_name: string; course_code: string } | null;
}

interface Attempt {
  id: string;
  student_id: string;
  total_marks_obtained: number | null;
  tab_switch_count: number | null;
  warning_count: number | null;
  was_auto_submitted: boolean | null;
  submitted_at: string | null;
  started_at: string;
  students: { first_name: string; last_name: string; student_id: string } | null;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  marks: number;
  order_index: number;
}

interface QuestionStats {
  question: Question;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  avgMarks: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
}

export default function TestAnalytics() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<TestInfo | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>([]);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!testId) return;

      try {
        setLoading(true);

        // Fetch test info
        const { data: testData, error: testError } = await supabase
          .from('tests')
          .select(`
            id,
            title,
            total_marks,
            passing_marks,
            duration_minutes,
            test_type,
            courses (course_name, course_code)
          `)
          .eq('id', testId)
          .single();

        if (testError) throw testError;
        setTest(testData as unknown as TestInfo);

        // Fetch attempts
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('test_attempts')
          .select(`
            id,
            student_id,
            total_marks_obtained,
            tab_switch_count,
            warning_count,
            was_auto_submitted,
            submitted_at,
            started_at,
            students (first_name, last_name, student_id)
          `)
          .eq('test_id', testId)
          .eq('status', 'submitted');

        if (attemptsError) throw attemptsError;
        setAttempts((attemptsData || []) as unknown as Attempt[]);

        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('test_questions')
          .select('id, question_text, question_type, marks, order_index')
          .eq('test_id', testId)
          .order('order_index');

        if (questionsError) throw questionsError;
        setQuestions((questionsData || []) as Question[]);

        // Fetch all student answers for this test
        const attemptIds = (attemptsData || []).map((a: any) => a.id);
        if (attemptIds.length > 0) {
          const { data: answersData, error: answersError } = await supabase
            .from('student_answers')
            .select('question_id, is_correct, marks_awarded')
            .in('attempt_id', attemptIds);

          if (answersError) throw answersError;

          // Calculate question-level stats
          const qStats: QuestionStats[] = (questionsData || []).map((q: Question) => {
            const qAnswers = (answersData || []).filter((a: any) => a.question_id === q.id);
            const correctCount = qAnswers.filter((a: any) => a.is_correct).length;
            const totalMarks = qAnswers.reduce((sum: number, a: any) => sum + (a.marks_awarded || 0), 0);
            
            return {
              question: q,
              totalAnswers: qAnswers.length,
              correctAnswers: correctCount,
              accuracy: qAnswers.length > 0 ? (correctCount / qAnswers.length) * 100 : 0,
              avgMarks: qAnswers.length > 0 ? totalMarks / qAnswers.length : 0,
            };
          });

          setQuestionStats(qStats);
        }

        // Calculate score distribution
        const scores = (attemptsData || [])
          .map((a: any) => a.total_marks_obtained)
          .filter((s: any) => s !== null) as number[];

        if (scores.length > 0 && testData) {
          const maxMarks = testData.total_marks;
          const ranges = [
            { min: 0, max: 20, label: '0-20%' },
            { min: 20, max: 40, label: '20-40%' },
            { min: 40, max: 60, label: '40-60%' },
            { min: 60, max: 80, label: '60-80%' },
            { min: 80, max: 100, label: '80-100%' },
          ];

          const distribution = ranges.map(r => ({
            range: r.label,
            count: scores.filter(s => {
              const pct = (s / maxMarks) * 100;
              return pct >= r.min && pct < (r.max === 100 ? 101 : r.max);
            }).length,
          }));

          setScoreDistribution(distribution);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast({
          title: 'Error',
          description: 'Failed to load test analytics',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [testId, toast]);

  // Calculate summary statistics
  const totalStudents = attempts.length;
  const scores = attempts.map(a => a.total_marks_obtained).filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const passedCount = test ? scores.filter(s => s >= test.passing_marks).length : 0;
  const passRate = totalStudents > 0 ? (passedCount / totalStudents) * 100 : 0;

  // Integrity issues
  const tabSwitchViolations = attempts.filter(a => (a.tab_switch_count || 0) > 2).length;
  const autoSubmitted = attempts.filter(a => a.was_auto_submitted).length;

  // Hardest and easiest questions
  const sortedByAccuracy = [...questionStats].sort((a, b) => a.accuracy - b.accuracy);
  const hardestQuestions = sortedByAccuracy.slice(0, 3);
  const easiestQuestions = sortedByAccuracy.slice(-3).reverse();

  const COLORS = ['hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--muted))', 'hsl(var(--primary))', 'hsl(var(--success))'];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Test not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title={`Analytics: ${test.title}`}
          description={test.courses ? `${test.courses.course_code} - ${test.courses.course_name}` : 'Test Performance Analytics'}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Attempts"
          value={totalStudents}
          icon={Users}
          description="Students who submitted"
        />
        <StatCard
          title="Average Score"
          value={`${avgScore.toFixed(1)}/${test.total_marks}`}
          icon={Target}
          description={`${((avgScore / test.total_marks) * 100).toFixed(1)}% average`}
        />
        <StatCard
          title="Pass Rate"
          value={`${passRate.toFixed(0)}%`}
          icon={Trophy}
          description={`${passedCount}/${totalStudents} passed`}
          variant={passRate >= 70 ? 'success' : passRate >= 50 ? 'warning' : 'destructive'}
        />
        <StatCard
          title="Score Range"
          value={`${minScore}-${maxScore}`}
          icon={TrendingUp}
          description={`Out of ${test.total_marks} marks`}
        />
      </div>

      {/* Integrity Alerts */}
      {(tabSwitchViolations > 0 || autoSubmitted > 0) && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-warning flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Integrity Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-6">
            {tabSwitchViolations > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-warning border-warning">
                  {tabSwitchViolations} students
                </Badge>
                <span className="text-sm text-muted-foreground">with excessive tab switches (&gt;2)</span>
              </div>
            )}
            {autoSubmitted > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-warning border-warning">
                  {autoSubmitted} tests
                </Badge>
                <span className="text-sm text-muted-foreground">auto-submitted (time expired)</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Score Distribution
            </CardTitle>
            <CardDescription>How students performed across score ranges</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="range" className="text-xs" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pass/Fail Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Pass/Fail Breakdown
            </CardTitle>
            <CardDescription>Passing mark: {test.passing_marks}/{test.total_marks}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Passed', value: passedCount },
                    { name: 'Failed', value: totalStudents - passedCount },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill="hsl(var(--success))" />
                  <Cell fill="hsl(var(--destructive))" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Question Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Question-Level Analysis
          </CardTitle>
          <CardDescription>Performance breakdown by question</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Max Marks</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Avg Marks</TableHead>
                  <TableHead>Difficulty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questionStats.map((qs, idx) => (
                  <TableRow key={qs.question.id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate">{qs.question.question_text}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {qs.question.question_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{qs.question.marks}</TableCell>
                    <TableCell>{qs.totalAnswers}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={qs.accuracy} 
                          className={cn(
                            "w-16 h-2",
                            qs.accuracy >= 70 ? "[&>div]:bg-success" :
                            qs.accuracy >= 40 ? "[&>div]:bg-warning" :
                            "[&>div]:bg-destructive"
                          )}
                        />
                        <span className="text-sm">{qs.accuracy.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{qs.avgMarks.toFixed(1)}</TableCell>
                    <TableCell>
                      {qs.accuracy < 40 ? (
                        <Badge className="bg-destructive/10 text-destructive">Hard</Badge>
                      ) : qs.accuracy < 70 ? (
                        <Badge className="bg-warning/10 text-warning">Medium</Badge>
                      ) : (
                        <Badge className="bg-success/10 text-success">Easy</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {questionStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No question data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Insights Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Hardest Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TrendingDown className="h-5 w-5" />
              Most Challenging Questions
            </CardTitle>
            <CardDescription>Questions with lowest accuracy rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {hardestQuestions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data available</p>
            ) : (
              hardestQuestions.map((qs, idx) => (
                <div key={qs.question.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-destructive">#{qs.question.order_index + 1}</span>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[250px]">
                        {qs.question.question_text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {qs.correctAnswers}/{qs.totalAnswers} correct
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-destructive/10 text-destructive">
                    {qs.accuracy.toFixed(0)}%
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Easiest Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <TrendingUp className="h-5 w-5" />
              Best Performing Questions
            </CardTitle>
            <CardDescription>Questions with highest accuracy rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {easiestQuestions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data available</p>
            ) : (
              easiestQuestions.map((qs, idx) => (
                <div key={qs.question.id} className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-success">#{qs.question.order_index + 1}</span>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[250px]">
                        {qs.question.question_text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {qs.correctAnswers}/{qs.totalAnswers} correct
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-success/10 text-success">
                    {qs.accuracy.toFixed(0)}%
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Top Performers
          </CardTitle>
          <CardDescription>Students with highest scores</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tab Switches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...attempts]
                  .sort((a, b) => (b.total_marks_obtained || 0) - (a.total_marks_obtained || 0))
                  .slice(0, 10)
                  .map((attempt, idx) => {
                    const score = attempt.total_marks_obtained || 0;
                    const pct = (score / test.total_marks) * 100;
                    const passed = score >= test.passing_marks;

                    return (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          {idx < 3 ? (
                            <span className="text-lg font-bold">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{idx + 1}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {attempt.students?.first_name} {attempt.students?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {attempt.students?.student_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{score}/{test.total_marks}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="w-16 h-2" />
                            <span className="text-sm">{pct.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {passed ? (
                            <Badge className="bg-success/10 text-success">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Passed
                            </Badge>
                          ) : (
                            <Badge className="bg-destructive/10 text-destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(attempt.tab_switch_count || 0) > 2 ? (
                            <Badge variant="outline" className="text-warning border-warning">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {attempt.tab_switch_count}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">{attempt.tab_switch_count || 0}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {attempts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No submissions yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
