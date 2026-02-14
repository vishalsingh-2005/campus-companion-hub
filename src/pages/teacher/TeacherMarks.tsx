import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useInternalMarks } from '@/hooks/useInternalMarks';
import { useCourses } from '@/hooks/useCourses';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useTeachers } from '@/hooks/useTeachers';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Plus, Upload, BarChart3, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';

const EXAM_TYPES = [
  { value: 'internal_1', label: 'Internal 1' },
  { value: 'internal_2', label: 'Internal 2' },
  { value: 'internal_3', label: 'Internal 3' },
  { value: 'mid_term', label: 'Mid Term' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'practical', label: 'Practical' },
  { value: 'project', label: 'Project' },
];

const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

export default function TeacherMarks() {
  const { user } = useAuth();
  const { marks, loading, addMark, deleteMark, publishResults } = useInternalMarks();
  const { courses } = useCourses();
  const { enrollments } = useEnrollments();
  const { teachers } = useTeachers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterExam, setFilterExam] = useState('all');

  const [form, setForm] = useState({
    course_id: '',
    student_id: '',
    exam_type: 'internal_1',
    marks_obtained: 0,
    max_marks: 100,
    semester: 'Semester 1',
    academic_year: '2025-2026',
    remarks: '',
  });

  const currentTeacher = teachers.find(t => t.user_id === user?.id);
  const teacherCourses = courses.filter(c => c.teacher_id === currentTeacher?.id);

  const enrolledStudents = form.course_id
    ? enrollments.filter(e => e.course_id === form.course_id && e.status === 'enrolled')
    : [];

  const filteredMarks = marks.filter(m => {
    if (filterCourse !== 'all' && m.course_id !== filterCourse) return false;
    if (filterSemester !== 'all' && m.semester !== filterSemester) return false;
    if (filterExam !== 'all' && m.exam_type !== filterExam) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const studentName = `${m.students?.first_name} ${m.students?.last_name}`.toLowerCase();
      const courseName = m.courses?.course_name?.toLowerCase() || '';
      if (!studentName.includes(q) && !courseName.includes(q)) return false;
    }
    return true;
  });

  const handleSubmit = async () => {
    if (!form.course_id || !form.student_id) {
      toast.error('Please select course and student');
      return;
    }
    if (!currentTeacher) {
      toast.error('Teacher profile not found');
      return;
    }
    const ok = await addMark({ ...form, teacher_id: currentTeacher.id });
    if (ok) {
      setDialogOpen(false);
      setForm({ course_id: '', student_id: '', exam_type: 'internal_1', marks_obtained: 0, max_marks: 100, semester: 'Semester 1', academic_year: '2025-2026', remarks: '' });
    }
  };

  const handlePublish = async () => {
    if (filterSemester === 'all') {
      toast.error('Please select a semester to publish results');
      return;
    }
    const academicYear = '2025-2026'; // Could be dynamic
    await publishResults(filterSemester, academicYear);
  };

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
      <PageHeader
        title="Internal Marks"
        description="Enter and manage student internal marks"
        actions={
          <div className="flex gap-2">
            <Button onClick={handlePublish} variant="outline" className="gap-2">
              <Upload className="h-4 w-4" /> Publish Results
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Add Marks</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Internal Marks</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Course</Label>
                    <Select value={form.course_id} onValueChange={v => setForm({ ...form, course_id: v, student_id: '' })}>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>
                        {teacherCourses.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.course_name} ({c.course_code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Student</Label>
                    <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                      <SelectContent>
                        {enrolledStudents.map(e => (
                          <SelectItem key={e.student_id} value={e.student_id}>
                            {e.students?.first_name} {e.students?.last_name} ({e.students?.student_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Exam Type</Label>
                      <Select value={form.exam_type} onValueChange={v => setForm({ ...form, exam_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EXAM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Semester</Label>
                      <Select value={form.semester} onValueChange={v => setForm({ ...form, semester: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SEMESTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Marks Obtained</Label>
                      <Input type="number" value={form.marks_obtained} onChange={e => setForm({ ...form, marks_obtained: Number(e.target.value) })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Max Marks</Label>
                      <Input type="number" value={form.max_marks} onChange={e => setForm({ ...form, max_marks: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Academic Year</Label>
                    <Input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Remarks (optional)</Label>
                    <Input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit}>Save Marks</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search student or course..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger><SelectValue placeholder="All Courses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {teacherCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.course_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger><SelectValue placeholder="All Semesters" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {SEMESTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterExam} onValueChange={setFilterExam}>
              <SelectTrigger><SelectValue placeholder="All Exam Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exam Types</SelectItem>
                {EXAM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Marks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Marks Records ({filteredMarks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="table-responsive">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Exam Type</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMarks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No marks records found. Click "Add Marks" to get started.
                    </TableCell>
                  </TableRow>
                ) : filteredMarks.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.students?.first_name} {m.students?.last_name}
                      <div className="text-xs text-muted-foreground">{m.students?.student_id}</div>
                    </TableCell>
                    <TableCell>
                      {m.courses?.course_name}
                      <div className="text-xs text-muted-foreground">{m.courses?.course_code}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {EXAM_TYPES.find(t => t.value === m.exam_type)?.label || m.exam_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{m.marks_obtained}</span>
                      <span className="text-muted-foreground">/{m.max_marks}</span>
                      <div className="text-xs text-muted-foreground">
                        {m.max_marks > 0 ? ((m.marks_obtained / m.max_marks) * 100).toFixed(1) : 0}%
                      </div>
                    </TableCell>
                    <TableCell>{m.semester}</TableCell>
                    <TableCell>{m.academic_year}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={async () => { if (deleteId) { await deleteMark(deleteId); setDeleteId(null); } }}
        title="Delete Marks"
        description="Are you sure you want to delete this marks entry?"
      />
    </DashboardLayout>
  );
}
