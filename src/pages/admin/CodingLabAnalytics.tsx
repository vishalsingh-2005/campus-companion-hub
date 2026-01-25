import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { supabase } from '@/integrations/supabase/client';
import {
  Code2,
  Users,
  CheckCircle2,
  TrendingUp,
  Clock,
  AlertTriangle,
  BarChart3,
  Trophy,
  Target,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface LabStats {
  id: string;
  title: string;
  course_name: string;
  difficulty: string;
  total_submissions: number;
  unique_students: number;
  avg_score: number;
  completion_rate: number;
  pass_rate: number;
}

interface DailySubmission {
  date: string;
  count: number;
}

interface LanguageStats {
  language: string;
  count: number;
  avg_score: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const difficultyColors: Record<string, string> = {
  easy: 'bg-success/10 text-success',
  medium: 'bg-warning/10 text-warning',
  hard: 'bg-destructive/10 text-destructive',
};

export default function CodingLabAnalytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [labs, setLabs] = useState<LabStats[]>([]);
  const [dailySubmissions, setDailySubmissions] = useState<DailySubmission[]>([]);
  const [languageStats, setLanguageStats] = useState<LanguageStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalLabs: 0,
    totalSubmissions: 0,
    activeStudents: 0,
    avgCompletionRate: 0,
    avgScore: 0,
    plagiarismCases: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const daysAgo = parseInt(timeRange);
      const startDate = format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');

      // Fetch all labs with course info
      const { data: labsData } = await supabase
        .from('coding_labs')
        .select(`
          id,
          title,
          difficulty,
          courses (course_name)
        `);

      // Fetch all submissions in time range
      const { data: submissions } = await supabase
        .from('coding_lab_submissions')
        .select('id, lab_id, student_id, score, max_score, language, status, created_at')
        .gte('created_at', startDate);

      // Fetch plagiarism records
      const { data: plagiarismData } = await supabase
        .from('coding_lab_plagiarism')
        .select('id')
        .eq('flagged', true);

      // Fetch enrolled students count
      const { count: enrolledStudents } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      // Process lab statistics
      const labStatsMap = new Map<string, LabStats>();
      const studentsByLab = new Map<string, Set<string>>();
      const submissionsByDay = new Map<string, number>();
      const langStats = new Map<string, { count: number; totalScore: number }>();

      // Initialize labs
      for (const lab of labsData || []) {
        labStatsMap.set(lab.id, {
          id: lab.id,
          title: lab.title,
          course_name: (lab.courses as any)?.course_name || 'Unassigned',
          difficulty: lab.difficulty,
          total_submissions: 0,
          unique_students: 0,
          avg_score: 0,
          completion_rate: 0,
          pass_rate: 0,
        });
        studentsByLab.set(lab.id, new Set());
      }

      // Process submissions
      let totalScore = 0;
      let scoredSubmissions = 0;
      const uniqueStudents = new Set<string>();

      for (const sub of submissions || []) {
        // Update lab stats
        const labStats = labStatsMap.get(sub.lab_id);
        if (labStats) {
          labStats.total_submissions++;
          studentsByLab.get(sub.lab_id)?.add(sub.student_id);
          
          if (sub.score !== null && sub.max_score) {
            const percentage = (sub.score / sub.max_score) * 100;
            labStats.avg_score = (labStats.avg_score * (scoredSubmissions) + percentage) / (scoredSubmissions + 1);
            if (percentage >= 60) labStats.pass_rate++;
          }
        }

        // Track unique students
        uniqueStudents.add(sub.student_id);

        // Track daily submissions
        const day = format(new Date(sub.created_at), 'yyyy-MM-dd');
        submissionsByDay.set(day, (submissionsByDay.get(day) || 0) + 1);

        // Track language stats
        const lang = langStats.get(sub.language) || { count: 0, totalScore: 0 };
        lang.count++;
        if (sub.score !== null && sub.max_score) {
          lang.totalScore += (sub.score / sub.max_score) * 100;
          totalScore += (sub.score / sub.max_score) * 100;
          scoredSubmissions++;
        }
        langStats.set(sub.language, lang);
      }

      // Finalize lab stats
      const processedLabs: LabStats[] = [];
      for (const [labId, stats] of labStatsMap) {
        const students = studentsByLab.get(labId);
        stats.unique_students = students?.size || 0;
        stats.completion_rate = enrolledStudents 
          ? (stats.unique_students / enrolledStudents) * 100 
          : 0;
        stats.pass_rate = stats.total_submissions > 0
          ? (stats.pass_rate / stats.total_submissions) * 100
          : 0;
        processedLabs.push(stats);
      }

      // Sort by total submissions descending
      processedLabs.sort((a, b) => b.total_submissions - a.total_submissions);

      // Process daily submissions for chart
      const dailyData: DailySubmission[] = [];
      for (let i = daysAgo - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyData.push({
          date: format(subDays(new Date(), i), 'MMM dd'),
          count: submissionsByDay.get(date) || 0,
        });
      }

      // Process language stats
      const langData: LanguageStats[] = Array.from(langStats.entries()).map(([lang, data]) => ({
        language: lang.charAt(0).toUpperCase() + lang.slice(1),
        count: data.count,
        avg_score: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
      }));

      // Calculate overall stats
      const avgCompletion = processedLabs.length > 0
        ? processedLabs.reduce((sum, l) => sum + l.completion_rate, 0) / processedLabs.length
        : 0;

      setLabs(processedLabs);
      setDailySubmissions(dailyData);
      setLanguageStats(langData);
      setOverallStats({
        totalLabs: labsData?.length || 0,
        totalSubmissions: submissions?.length || 0,
        activeStudents: uniqueStudents.size,
        avgCompletionRate: avgCompletion,
        avgScore: scoredSubmissions > 0 ? totalScore / scoredSubmissions : 0,
        plagiarismCases: plagiarismData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig: ChartConfig = {
    count: {
      label: 'Submissions',
      color: 'hsl(var(--primary))',
    },
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              Coding Lab Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Overall performance metrics and completion rates
            </p>
          </div>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Total Labs"
            value={overallStats.totalLabs}
            icon={Code2}
            variant="info"
          />
          <StatCard
            title="Submissions"
            value={overallStats.totalSubmissions}
            icon={Target}
            variant="default"
          />
          <StatCard
            title="Active Students"
            value={overallStats.activeStudents}
            icon={Users}
            variant="success"
          />
          <StatCard
            title="Avg Completion"
            value={`${overallStats.avgCompletionRate.toFixed(1)}%`}
            icon={CheckCircle2}
            variant="info"
          />
          <StatCard
            title="Avg Score"
            value={`${overallStats.avgScore.toFixed(1)}%`}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Plagiarism Flags"
            value={overallStats.plagiarismCases}
            icon={AlertTriangle}
            variant={overallStats.plagiarismCases > 0 ? 'destructive' : 'default'}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submission Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Submission Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySubmissions}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Language Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                Language Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={languageStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="language"
                      label={({ language }) => language}
                    >
                      {languageStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>

              <div className="mt-4 space-y-2">
                {languageStats.map((lang, i) => (
                  <div key={lang.language} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span>{lang.language}</span>
                    </div>
                    <span className="text-muted-foreground">
                      Avg: {lang.avg_score}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lab Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Lab Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lab Title</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead className="text-center">Submissions</TableHead>
                    <TableHead className="text-center">Students</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Avg Score</TableHead>
                    <TableHead>Pass Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labs.map((lab) => (
                    <TableRow key={lab.id}>
                      <TableCell className="font-medium">{lab.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{lab.course_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={difficultyColors[lab.difficulty] || ''}>
                          {lab.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{lab.total_submissions}</TableCell>
                      <TableCell className="text-center">{lab.unique_students}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={lab.completion_rate}
                            className="w-20 h-2"
                          />
                          <span className="text-sm text-muted-foreground">
                            {lab.completion_rate.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'font-medium',
                            lab.avg_score >= 70
                              ? 'text-success'
                              : lab.avg_score >= 50
                              ? 'text-warning'
                              : 'text-destructive'
                          )}
                        >
                          {lab.avg_score.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={lab.pass_rate}
                            className={cn(
                              'w-16 h-2',
                              lab.pass_rate >= 70
                                ? '[&>div]:bg-success'
                                : lab.pass_rate >= 50
                                ? '[&>div]:bg-warning'
                                : '[&>div]:bg-destructive'
                            )}
                          />
                          <span className="text-sm">{lab.pass_rate.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {labs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No coding labs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
