import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { 
  ClipboardCheck, 
  Calendar,
  Plus,
  Eye,
  Edit,
  Trash2,
  Users,
  BookOpen,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { TestFormDialog } from '@/components/tests/TestFormDialog';
import { QuestionFormDialog } from '@/components/tests/QuestionFormDialog';
import { ViewQuestionsDialog } from '@/components/tests/ViewQuestionsDialog';
import { ViewAttemptsDialog } from '@/components/tests/ViewAttemptsDialog';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  course_id: string;
  courses: {
    id: string;
    course_code: string;
    course_name: string;
  };
}

interface Course {
  id: string;
  course_code: string;
  course_name: string;
}

export default function TeacherTests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Test[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  
  // Dialog states
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [viewQuestionsOpen, setViewQuestionsOpen] = useState(false);
  const [viewAttemptsOpen, setViewAttemptsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  const fetchTests = async () => {
    if (!user) return;

    try {
      // Get teacher ID first
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (teacher) {
        setTeacherId(teacher.id);

        // Fetch courses taught by this teacher
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id, course_code, course_name')
          .eq('teacher_id', teacher.id);

        setCourses(coursesData || []);

        // Fetch tests
        const { data: testsData, error } = await supabase
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
            course_id,
            courses (
              id,
              course_code,
              course_name
            )
          `)
          .in('course_id', coursesData?.map(c => c.id) || [])
          .order('scheduled_date', { ascending: false });

        if (error) throw error;
        setTests((testsData as unknown as Test[]) || []);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [user]);

  const handleDeleteTest = async () => {
    if (!selectedTest) return;

    try {
      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', selectedTest.id);

      if (error) throw error;

      toast({
        title: 'Test Deleted',
        description: 'The test has been deleted successfully',
      });

      fetchTests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete test',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedTest(null);
    }
  };

  const handleActivateTest = async (test: Test) => {
    try {
      const { error } = await supabase
        .from('tests')
        .update({ status: 'active' })
        .eq('id', test.id);

      if (error) throw error;

      toast({
        title: 'Test Activated',
        description: 'Students can now take this test',
      });

      fetchTests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate test',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteTest = async (test: Test) => {
    try {
      const { error } = await supabase
        .from('tests')
        .update({ status: 'completed' })
        .eq('id', test.id);

      if (error) throw error;

      toast({
        title: 'Test Completed',
        description: 'The test has been marked as completed',
      });

      fetchTests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete test',
        variant: 'destructive',
      });
    }
  };

  // Stats
  const upcomingTests = tests.filter(t => t.status === 'scheduled');
  const activeTests = tests.filter(t => t.status === 'active');
  const completedTests = tests.filter(t => t.status === 'completed');

  const getTestTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      quiz: 'bg-blue-500/10 text-blue-500',
      midterm: 'bg-orange-500/10 text-orange-500',
      final: 'bg-red-500/10 text-red-500',
      assignment: 'bg-green-500/10 text-green-500',
    };
    return variants[type] || 'bg-muted text-muted-foreground';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; class: string }> = {
      scheduled: { label: 'Scheduled', class: 'bg-primary/10 text-primary' },
      active: { label: 'Live', class: 'bg-success/10 text-success' },
      completed: { label: 'Completed', class: 'bg-muted text-muted-foreground' },
      cancelled: { label: 'Cancelled', class: 'bg-destructive/10 text-destructive' },
    };
    return variants[status] || { label: status, class: 'bg-muted text-muted-foreground' };
  };

  const renderActions = (test: Test) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setSelectedTest(test);
          setViewQuestionsOpen(true);
        }}
        title="View Questions"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setSelectedTest(test);
          setQuestionDialogOpen(true);
        }}
        title="Add Question"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setSelectedTest(test);
          setViewAttemptsOpen(true);
        }}
        title="View Attempts"
      >
        <Users className="h-4 w-4" />
      </Button>
      {test.status === 'scheduled' && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedTest(test);
              setTestDialogOpen(true);
            }}
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-success hover:text-success"
            onClick={() => handleActivateTest(test)}
            title="Activate Test"
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </>
      )}
      {test.status === 'active' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCompleteTest(test)}
        >
          End Test
        </Button>
      )}
      {test.status === 'scheduled' && (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            setSelectedTest(test);
            setDeleteDialogOpen(true);
          }}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
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
        title="Test Management"
        description="Create and manage tests for your courses"
        actions={
          <Button onClick={() => {
            setSelectedTest(null);
            setTestDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Test
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Scheduled"
          value={upcomingTests.length}
          icon={Calendar}
          description="Upcoming tests"
        />
        <StatCard
          title="Active"
          value={activeTests.length}
          icon={ClipboardCheck}
          description="Currently running"
        />
        <StatCard
          title="Completed"
          value={completedTests.length}
          icon={CheckCircle2}
          description="Finished tests"
        />
      </div>

      {/* Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            All Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No tests created yet. Click "Create Test" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  tests.map((test) => {
                    const status = getStatusBadge(test.status);
                    return (
                      <TableRow key={test.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{test.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {test.courses?.course_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTestTypeBadge(test.test_type)}>
                            {test.test_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{format(new Date(test.scheduled_date), 'MMM d, yyyy')}</div>
                          <div className="text-muted-foreground">
                            {format(new Date(test.scheduled_date), 'h:mm a')}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {test.total_marks} (Pass: {test.passing_marks})
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-4 w-4" />
                            {test.duration_minutes} min
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.class}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {renderActions(test)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TestFormDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        test={selectedTest}
        courses={courses}
        onSuccess={() => {
          fetchTests();
          setTestDialogOpen(false);
          setSelectedTest(null);
        }}
      />

      <QuestionFormDialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
        testId={selectedTest?.id || ''}
        onSuccess={() => {
          setQuestionDialogOpen(false);
        }}
      />

      <ViewQuestionsDialog
        open={viewQuestionsOpen}
        onOpenChange={setViewQuestionsOpen}
        testId={selectedTest?.id || ''}
        testTitle={selectedTest?.title || ''}
      />

      <ViewAttemptsDialog
        open={viewAttemptsOpen}
        onOpenChange={setViewAttemptsOpen}
        testId={selectedTest?.id || ''}
        testTitle={selectedTest?.title || ''}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Test"
        description={`Are you sure you want to delete "${selectedTest?.title}"? This will also delete all questions and attempts.`}
        onConfirm={handleDeleteTest}
      />
    </div>
  );
}
