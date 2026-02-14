import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { useInternalMarks } from '@/hooks/useInternalMarks';
import { Loader2, GraduationCap, TrendingUp, Award, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const EXAM_TYPES_MAP: Record<string, string> = {
  internal_1: 'Internal 1',
  internal_2: 'Internal 2',
  internal_3: 'Internal 3',
  mid_term: 'Mid Term',
  assignment: 'Assignment',
  practical: 'Practical',
  project: 'Project',
};

const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))'];

export default function StudentMarks() {
  const { marks, results, loading, calculateGPA } = useInternalMarks();
  const [filterSemester, setFilterSemester] = useState('all');

  const filteredMarks = filterSemester === 'all' ? marks : marks.filter(m => m.semester === filterSemester);

  // Group marks by course for chart
  const coursePerformance = useMemo(() => {
    const groups: Record<string, { name: string; obtained: number; max: number }> = {};
    filteredMarks.forEach(m => {
      const key = m.course_id;
      if (!groups[key]) groups[key] = { name: m.courses?.course_name || 'Unknown', obtained: 0, max: 0 };
      groups[key].obtained += m.marks_obtained;
      groups[key].max += m.max_marks;
    });
    return Object.values(groups).map(g => ({
      ...g,
      percentage: g.max > 0 ? parseFloat(((g.obtained / g.max) * 100).toFixed(1)) : 0,
    }));
  }, [filteredMarks]);

  // Overall stats
  const overallStats = useMemo(() => {
    if (filteredMarks.length === 0) return { totalObtained: 0, totalMax: 0, percentage: 0, courses: 0 };
    const totalObtained = filteredMarks.reduce((s, m) => s + m.marks_obtained, 0);
    const totalMax = filteredMarks.reduce((s, m) => s + m.max_marks, 0);
    const uniqueCourses = new Set(filteredMarks.map(m => m.course_id)).size;
    return {
      totalObtained,
      totalMax,
      percentage: totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(1)) : 0,
      courses: uniqueCourses,
    };
  }, [filteredMarks]);

  const latestResult = results.length > 0 ? results[0] : null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="My Marks & Results" description="View your internal marks and semester results" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Overall %"
          value={`${overallStats.percentage}%`}
          icon={TrendingUp}
        />
        <StatCard
          title="SGPA"
          value={latestResult?.sgpa?.toFixed(2) || '—'}
          icon={Award}
        />
        <StatCard
          title="Total Marks"
          value={`${overallStats.totalObtained}/${overallStats.totalMax}`}
          icon={GraduationCap}
        />
        <StatCard
          title="Courses"
          value={overallStats.courses}
          icon={BookOpen}
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-6">
        <Select value={filterSemester} onValueChange={setFilterSemester}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Semesters" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {SEMESTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Performance Chart */}
      {coursePerformance.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Course-wise Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={coursePerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(val: number) => [`${val}%`, 'Score']}
                />
                <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Marks Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Detailed Marks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="table-responsive">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Exam Type</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Semester</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMarks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No marks available yet.
                    </TableCell>
                  </TableRow>
                ) : filteredMarks.map(m => {
                  const pct = m.max_marks > 0 ? ((m.marks_obtained / m.max_marks) * 100) : 0;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.courses?.course_name}
                        <div className="text-xs text-muted-foreground">{m.courses?.course_code}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{EXAM_TYPES_MAP[m.exam_type] || m.exam_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{m.marks_obtained}</span>
                        <span className="text-muted-foreground">/{m.max_marks}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pct >= 60 ? 'default' : pct >= 40 ? 'secondary' : 'destructive'}>
                          {pct.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{m.semester}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Semester Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Semester Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="table-responsive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semester</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>SGPA</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.semester}</TableCell>
                      <TableCell>{r.academic_year}</TableCell>
                      <TableCell className="font-semibold">{r.sgpa?.toFixed(2) || '—'}</TableCell>
                      <TableCell>{r.percentage?.toFixed(1) || '—'}%</TableCell>
                      <TableCell>{r.earned_credits}/{r.total_credits}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'published' ? 'default' : 'secondary'}>{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
