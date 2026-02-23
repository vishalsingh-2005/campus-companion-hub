import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { CodeEditor } from '@/components/coding-lab/CodeEditor';
import { LanguageSelector } from '@/components/coding-lab/LanguageSelector';
import { TestCasePanel } from '@/components/coding-lab/TestCasePanel';
import {
  Play,
  Send,
  RotateCcw,
  Clock,
  Cpu,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Lab {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  time_limit_seconds: number;
  memory_limit_mb: number;
  allowed_languages: string[];
  starter_code: Record<string, string>;
  courses: { course_name: string } | null;
}

interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  description: string | null;
  order_index: number;
}

interface Submission {
  id: string;
  language: string;
  status: string;
  score: number | null;
  passed_test_cases: number | null;
  total_test_cases: number | null;
  execution_time_ms: number | null;
  submitted_at: string;
}

const DEFAULT_CODE: Record<string, string> = {
  c: '#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}',
  java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Your code here\n    }\n}',
  python: '# Your code here\n',
};

const STATUS_CONFIG: Record<string, { cls: string; icon: any; label: string }> = {
  accepted: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2, label: 'Accepted' },
  passed: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2, label: 'Passed' },
  wrong_answer: { cls: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle, label: 'Wrong Answer' },
  time_limit: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock, label: 'Time Limit' },
  runtime_error: { cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: AlertTriangle, label: 'Runtime Error' },
  compile_error: { cls: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle, label: 'Compile Error' },
  running: { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Loader2, label: 'Running' },
};

export default function CodingLabEditor() {
  const { labId } = useParams<{ labId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [lab, setLab] = useState<Lab | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [customInput, setCustomInput] = useState('');

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runOutput, setRunOutput] = useState<string | undefined>();
  const [runError, setRunError] = useState<string | undefined>();
  const [runStatus, setRunStatus] = useState<string | undefined>();
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLab() {
      if (!labId || !user) return;
      try {
        const { data: labData, error: labError } = await supabase
          .from('coding_labs')
          .select('id, title, description, difficulty, time_limit_seconds, memory_limit_mb, allowed_languages, starter_code, courses (course_name)')
          .eq('id', labId)
          .single();

        if (labError) throw labError;
        setLab(labData as unknown as Lab);

        const defaultLang = labData.allowed_languages?.[0] || 'python';
        setLanguage(defaultLang);
        setCode(labData.starter_code?.[defaultLang] || DEFAULT_CODE[defaultLang] || '');

        const { data: testCasesData } = await supabase
          .from('coding_lab_test_cases')
          .select('id, input, expected_output, description, order_index')
          .eq('lab_id', labId)
          .eq('is_sample', true)
          .order('order_index');

        setTestCases((testCasesData || []) as TestCase[]);

        const { data: student } = await supabase
          .from('students').select('id').eq('user_id', user.id).maybeSingle();

        if (student) {
          const { data: submissionsData } = await supabase
            .from('coding_lab_submissions')
            .select('id, language, status, score, passed_test_cases, total_test_cases, execution_time_ms, submitted_at')
            .eq('lab_id', labId).eq('student_id', student.id)
            .order('submitted_at', { ascending: false }).limit(10);

          setSubmissions((submissionsData || []) as Submission[]);
        }
      } catch (error) {
        console.error('Error fetching lab:', error);
        toast({ title: 'Error', description: 'Failed to load coding lab', variant: 'destructive' });
        navigate('/student/coding-labs');
      } finally {
        setLoading(false);
      }
    }
    fetchLab();
  }, [labId, user, navigate, toast]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(lab?.starter_code?.[newLang] || DEFAULT_CODE[newLang] || '');
  };

  const handleReset = () => {
    setCode(lab?.starter_code?.[language] || DEFAULT_CODE[language] || '');
    setRunOutput(undefined);
    setRunError(undefined);
    setRunStatus(undefined);
    setTestResults([]);
  };

  // ============ RUN ============
  const handleRun = async () => {
    if (!code.trim()) {
      toast({ title: 'Empty Code', description: 'Please write some code before running.', variant: 'destructive' });
      return;
    }

    setIsRunning(true);
    setRunOutput(undefined);
    setRunError(undefined);
    setRunStatus(undefined);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Session Expired', description: 'Please log in again.', variant: 'destructive' });
        setIsRunning(false);
        return;
      }

      const response = await supabase.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          labId: labId || undefined,
          language,
          sourceCode: code,
          customInput: customInput || '',
        },
      });

      const result = response.data;

      if (response.error && !result) {
        throw new Error(response.error.message || 'Failed to execute code');
      }

      if (result) {
        setRunStatus(result.status || undefined);
        setRunOutput(result.output || '');
        if (result.error) setRunError(result.error);
        if (!result.output && !result.error) setRunOutput('(no output)');
      }
    } catch (error) {
      console.error('Run error:', error);
      setRunError(error instanceof Error ? error.message : 'Failed to run code. Please try again.');
      setRunStatus('runtime_error');
    } finally {
      setIsRunning(false);
    }
  };

  // ============ SUBMIT ============
  const handleSubmit = async () => {
    if (!code.trim()) {
      toast({ title: 'Empty Code', description: 'Please write some code before submitting.', variant: 'destructive' });
      return;
    }
    if (!labId) {
      toast({ title: 'Error', description: 'Lab ID is missing.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    setTestResults([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Session Expired', description: 'Please log in again.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const response = await supabase.functions.invoke('execute-code', {
        body: { mode: 'submit', labId, language, sourceCode: code },
      });

      const result = response.data;

      if (response.error && !result) {
        throw new Error(response.error.message || 'Submission failed');
      }

      if (result?.error && !result?.success) {
        throw new Error(result.error);
      }

      if (result?.success) {
        setTestResults(result.testResults || []);

        // Refresh submissions
        const { data: student } = await supabase
          .from('students').select('id').eq('user_id', user!.id).maybeSingle();

        if (student) {
          const { data: submissionsData } = await supabase
            .from('coding_lab_submissions')
            .select('id, language, status, score, passed_test_cases, total_test_cases, execution_time_ms, submitted_at')
            .eq('lab_id', labId).eq('student_id', student.id)
            .order('submitted_at', { ascending: false }).limit(10);

          setSubmissions((submissionsData || []) as Submission[]);
        }

        const passed = result.passedTestCases ?? 0;
        const total = result.totalTestCases ?? 0;
        const score = result.score ?? 0;

        toast({
          title: result.status === 'accepted' ? '🎉 All Tests Passed!' : 'Submission Complete',
          description: `Passed ${passed}/${total} test cases (${score.toFixed(0)}%)`,
          variant: result.status === 'accepted' ? 'default' : 'destructive',
        });
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Failed to submit code',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const v = STATUS_CONFIG[status] || { cls: 'bg-muted text-muted-foreground', icon: Clock, label: status };
    const Icon = v.icon;
    return (
      <Badge className={cn('border', v.cls)}>
        <Icon className={cn('h-3 w-3 mr-1', status === 'running' && 'animate-spin')} />
        {v.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading lab...</span>
        </div>
      </div>
    );
  }

  if (!lab) return null;

  const difficultyColor = {
    easy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    hard: 'bg-red-500/15 text-red-400 border-red-500/30',
  }[lab.difficulty] || 'bg-muted text-muted-foreground';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card/80 backdrop-blur-sm flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="font-semibold text-sm">{lab.title}</h1>
            {lab.courses && (
              <span className="text-xs text-muted-foreground">{lab.courses.course_name}</span>
            )}
          </div>
          <Badge className={cn('border text-xs', difficultyColor)}>{lab.difficulty}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{lab.time_limit_seconds}s</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" />
            <span>{lab.memory_limit_mb}MB</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Problem description panel */}
        <ResizablePanel defaultSize={35} minSize={20}>
          <Tabs defaultValue="problem" className="h-full flex flex-col">
            <div className="border-b px-4 py-2">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="problem" className="text-xs">Problem</TabsTrigger>
                <TabsTrigger value="submissions" className="text-xs">History ({submissions.length})</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="problem" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                  {lab.description}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="submissions" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                {submissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Send className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No submissions yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {submissions.map((sub) => (
                      <Card key={sub.id} className="p-3 bg-muted/30 border-border/50 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(sub.status)}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(sub.submitted_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                          <span className="text-muted-foreground">
                            {sub.passed_test_cases ?? 0}/{sub.total_test_cases ?? 0} passed
                          </span>
                          <span className="font-medium text-foreground">
                            {(sub.score ?? 0).toFixed(0)}%
                          </span>
                          {sub.execution_time_ms != null && (
                            <span className="text-muted-foreground">{sub.execution_time_ms}ms</span>
                          )}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {sub.language.toUpperCase()}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Code editor panel */}
        <ResizablePanel defaultSize={65} minSize={35}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={60} minSize={30}>
              <div className="h-full flex flex-col">
                {/* Editor toolbar */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/20 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <LanguageSelector
                      value={language}
                      onChange={handleLanguageChange}
                      allowedLanguages={lab.allowed_languages}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset} title="Reset code">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRun}
                      disabled={isRunning || isSubmitting}
                      className={cn(
                        "gap-1.5 h-8 px-4 font-medium transition-all duration-300",
                        "border-emerald-500/30 text-emerald-400",
                        "hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:shadow-[0_0_12px_hsl(152_69%_40%/0.15)]",
                        isRunning && "border-emerald-500/50 bg-emerald-500/10"
                      )}
                    >
                      {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      {isRunning ? 'Running…' : 'Run'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isRunning || isSubmitting}
                      className={cn(
                        "gap-1.5 h-8 px-4 font-medium transition-all duration-300",
                        "bg-primary hover:bg-primary/90",
                        "hover:shadow-[0_0_16px_hsl(var(--primary)/0.3)]",
                        isSubmitting && "opacity-80"
                      )}
                    >
                      {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {isSubmitting ? 'Submitting…' : 'Submit'}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <CodeEditor code={code} onChange={setCode} language={language} height="100%" />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Test cases panel */}
            <ResizablePanel defaultSize={40} minSize={15}>
              <TestCasePanel
                sampleTestCases={testCases}
                testResults={testResults}
                customInput={customInput}
                onCustomInputChange={setCustomInput}
                output={runOutput}
                error={runError}
                status={runStatus}
                isRunning={isRunning}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
