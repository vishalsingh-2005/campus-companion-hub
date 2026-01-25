import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  History,
  CheckCircle2,
  XCircle,
  Loader2,
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
  courses: {
    course_name: string;
  } | null;
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
  score: number;
  passed_test_cases: number;
  total_test_cases: number;
  execution_time_ms: number | null;
  submitted_at: string;
}

const DEFAULT_CODE: Record<string, string> = {
  c: `#include <stdio.h>

int main() {
    // Your code here
    return 0;
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Your code here
    return 0;
}`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Your code here
    }
}`,
  python: `# Your code here
`,
};

export default function CodingLabEditor() {
  const { labId } = useParams<{ labId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [lab, setLab] = useState<Lab | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // Editor state
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [customInput, setCustomInput] = useState('');

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runOutput, setRunOutput] = useState<string | undefined>();
  const [runError, setRunError] = useState<string | undefined>();
  const [testResults, setTestResults] = useState<any[]>([]);

  // Fetch lab data
  useEffect(() => {
    async function fetchLab() {
      if (!labId || !user) return;

      try {
        // Fetch lab
        const { data: labData, error: labError } = await supabase
          .from('coding_labs')
          .select(`
            id,
            title,
            description,
            difficulty,
            time_limit_seconds,
            memory_limit_mb,
            allowed_languages,
            starter_code,
            courses (course_name)
          `)
          .eq('id', labId)
          .single();

        if (labError) throw labError;
        setLab(labData as unknown as Lab);

        // Set initial language and code
        const defaultLang = labData.allowed_languages?.[0] || 'python';
        setLanguage(defaultLang);
        setCode(
          labData.starter_code?.[defaultLang] ||
            DEFAULT_CODE[defaultLang] ||
            ''
        );

        // Fetch sample test cases
        const { data: testCasesData } = await supabase
          .from('coding_lab_test_cases')
          .select('id, input, expected_output, description, order_index')
          .eq('lab_id', labId)
          .eq('is_sample', true)
          .order('order_index');

        setTestCases((testCasesData || []) as TestCase[]);

        // Fetch student's submissions
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (student) {
          const { data: submissionsData } = await supabase
            .from('coding_lab_submissions')
            .select('id, language, status, score, passed_test_cases, total_test_cases, execution_time_ms, submitted_at')
            .eq('lab_id', labId)
            .eq('student_id', student.id)
            .order('submitted_at', { ascending: false })
            .limit(10);

          setSubmissions((submissionsData || []) as Submission[]);
        }
      } catch (error) {
        console.error('Error fetching lab:', error);
        toast({
          title: 'Error',
          description: 'Failed to load coding lab',
          variant: 'destructive',
        });
        navigate('/student/coding-labs');
      } finally {
        setLoading(false);
      }
    }

    fetchLab();
  }, [labId, user, navigate, toast]);

  // Handle language change
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(
      lab?.starter_code?.[newLang] || DEFAULT_CODE[newLang] || ''
    );
  };

  // Reset code
  const handleReset = () => {
    setCode(lab?.starter_code?.[language] || DEFAULT_CODE[language] || '');
    setRunOutput(undefined);
    setRunError(undefined);
    setTestResults([]);
  };

  // Run code with custom input
  const handleRun = async () => {
    setIsRunning(true);
    setRunOutput(undefined);
    setRunError(undefined);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          labId,
          language,
          sourceCode: code,
          customInput,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      if (result.success) {
        setRunOutput(result.output || '(no output)');
        if (result.error) {
          setRunError(result.error);
        }
      } else {
        setRunError(result.error || 'Execution failed');
      }
    } catch (error) {
      console.error('Run error:', error);
      setRunError(error instanceof Error ? error.message : 'Failed to run code');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit code
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setTestResults([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('execute-code', {
        body: {
          mode: 'submit',
          labId,
          language,
          sourceCode: code,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      if (result.success) {
        setTestResults(result.testResults || []);

        // Refresh submissions
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (student) {
          const { data: submissionsData } = await supabase
            .from('coding_lab_submissions')
            .select('id, language, status, score, passed_test_cases, total_test_cases, execution_time_ms, submitted_at')
            .eq('lab_id', labId!)
            .eq('student_id', student.id)
            .order('submitted_at', { ascending: false })
            .limit(10);

          setSubmissions((submissionsData || []) as Submission[]);
        }

        toast({
          title: result.status === 'accepted' ? '🎉 All Tests Passed!' : 'Submission Complete',
          description: `Passed ${result.passedTestCases}/${result.totalTestCases} test cases (${result.score.toFixed(0)}%)`,
          variant: result.status === 'accepted' ? 'default' : 'destructive',
        });
      } else {
        throw new Error(result.error || 'Submission failed');
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
    const variants: Record<string, { class: string; icon: any }> = {
      accepted: { class: 'bg-success/10 text-success', icon: CheckCircle2 },
      wrong_answer: { class: 'bg-destructive/10 text-destructive', icon: XCircle },
      time_limit: { class: 'bg-warning/10 text-warning', icon: Clock },
      runtime_error: { class: 'bg-destructive/10 text-destructive', icon: XCircle },
      compile_error: { class: 'bg-destructive/10 text-destructive', icon: XCircle },
    };
    const v = variants[status] || { class: 'bg-muted text-muted-foreground', icon: Clock };
    const Icon = v.icon;
    return (
      <Badge className={v.class}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lab) {
    return null;
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <div>
            <h1 className="font-semibold">{lab.title}</h1>
            {lab.courses && (
              <span className="text-sm text-muted-foreground">
                {lab.courses.course_name}
              </span>
            )}
          </div>
          <Badge
            className={cn(
              lab.difficulty === 'easy' && 'bg-success/10 text-success',
              lab.difficulty === 'medium' && 'bg-warning/10 text-warning',
              lab.difficulty === 'hard' && 'bg-destructive/10 text-destructive'
            )}
          >
            {lab.difficulty}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {lab.time_limit_seconds}s
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Cpu className="h-4 w-4" />
            {lab.memory_limit_mb}MB
          </div>
        </div>
      </div>

      {/* Main content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Problem description panel */}
        <ResizablePanel defaultSize={35} minSize={25}>
          <Tabs defaultValue="problem" className="h-full flex flex-col">
            <div className="border-b px-4 py-2">
              <TabsList>
                <TabsTrigger value="problem">Problem</TabsTrigger>
                <TabsTrigger value="submissions">
                  History ({submissions.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="problem" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: lab.description.replace(/\n/g, '<br/>') }} />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="submissions" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                {submissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No submissions yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((sub) => (
                      <Card key={sub.id} className="p-3">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(sub.status)}
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(sub.submitted_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span>
                            {sub.passed_test_cases}/{sub.total_test_cases} passed
                          </span>
                          <span className="font-medium">
                            Score: {sub.score.toFixed(0)}%
                          </span>
                          {sub.execution_time_ms && (
                            <span className="text-muted-foreground">
                              {sub.execution_time_ms}ms
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
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
        <ResizablePanel defaultSize={65} minSize={40}>
          <ResizablePanelGroup direction="vertical">
            {/* Editor */}
            <ResizablePanel defaultSize={60} minSize={30}>
              <div className="h-full flex flex-col">
                {/* Editor toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <LanguageSelector
                      value={language}
                      onChange={handleLanguageChange}
                      allowedLanguages={lab.allowed_languages}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      title="Reset code"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRun}
                      disabled={isRunning || isSubmitting}
                    >
                      {isRunning ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Run
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isRunning || isSubmitting}
                      className="bg-success hover:bg-success/90"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Submit
                    </Button>
                  </div>
                </div>

                {/* Editor */}
                <div className="flex-1 overflow-hidden">
                  <CodeEditor
                    code={code}
                    onChange={setCode}
                    language={language}
                    height="100%"
                  />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Test cases panel */}
            <ResizablePanel defaultSize={40} minSize={20}>
              <TestCasePanel
                sampleTestCases={testCases}
                testResults={testResults}
                customInput={customInput}
                onCustomInputChange={setCustomInput}
                output={runOutput}
                error={runError}
                isRunning={isRunning}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
