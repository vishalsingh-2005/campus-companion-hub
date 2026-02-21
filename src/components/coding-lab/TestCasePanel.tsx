import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  description?: string;
  order_index: number;
}

interface TestResult {
  testCaseId: string;
  isSample: boolean;
  passed: boolean;
  status: string;
  executionTime?: string;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
}

interface TestCasePanelProps {
  sampleTestCases: TestCase[];
  testResults?: TestResult[];
  customInput: string;
  onCustomInputChange: (input: string) => void;
  output?: string;
  error?: string;
  status?: string;
  isRunning: boolean;
}

export function TestCasePanel({
  sampleTestCases,
  testResults,
  customInput,
  onCustomInputChange,
  output,
  error,
  status,
  isRunning,
}: TestCasePanelProps) {
  const [activeTab, setActiveTab] = useState('custom');

  const getStatusIcon = (result: TestResult) => {
    if (result.passed) return <CheckCircle2 className="h-4 w-4 text-success" />;
    switch (result.status) {
      case 'time_limit':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'compile_error':
      case 'runtime_error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getRunStatusBadge = () => {
    if (!status) return null;
    const map: Record<string, { class: string; label: string }> = {
      accepted: { class: 'bg-success/10 text-success', label: '✔ Executed' },
      wrong_answer: { class: 'bg-destructive/10 text-destructive', label: 'Wrong Answer' },
      runtime_error: { class: 'bg-destructive/10 text-destructive', label: '⚠ Runtime Error' },
      compile_error: { class: 'bg-destructive/10 text-destructive', label: '⚠ Compile Error' },
      time_limit: { class: 'bg-warning/10 text-warning', label: '⏱ Time Limit' },
    };
    const v = map[status] || { class: 'bg-muted text-muted-foreground', label: status };
    return <Badge className={v.class}>{v.label}</Badge>;
  };

  return (
    <div className="border rounded-lg bg-card h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b flex-wrap gap-2">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="custom">Custom Input</TabsTrigger>
            {sampleTestCases.map((tc, i) => {
              const result = testResults?.find((r) => r.testCaseId === tc.id);
              return (
                <TabsTrigger key={tc.id} value={tc.id} className="relative">
                  <span className="flex items-center gap-1">
                    Case {i + 1}
                    {result && <span className="ml-1">{getStatusIcon(result)}</span>}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {testResults && testResults.length > 0 && (
            <Badge variant="outline">
              {testResults.filter((r) => r.passed).length}/{testResults.length} Passed
            </Badge>
          )}
        </div>

        <div className="p-4 flex-1 overflow-auto">
          <TabsContent value="custom" className="mt-0 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Input</label>
              <Textarea
                value={customInput}
                onChange={(e) => onCustomInputChange(e.target.value)}
                placeholder="Enter custom input here..."
                className="font-mono min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                Your Output
                {!isRunning && getRunStatusBadge()}
              </label>
              <div
                className={cn(
                  'bg-muted/50 rounded-md p-3 font-mono text-sm min-h-[80px] whitespace-pre-wrap',
                  error && 'border border-destructive/50'
                )}
              >
                {isRunning ? (
                  <span className="text-muted-foreground animate-pulse">Running...</span>
                ) : error ? (
                  <span className="text-destructive">{error}</span>
                ) : output ? (
                  output
                ) : (
                  <span className="text-muted-foreground">Click "Run" to see output</span>
                )}
              </div>
            </div>
          </TabsContent>

          {sampleTestCases.map((tc) => {
            const result = testResults?.find((r) => r.testCaseId === tc.id);
            return (
              <TabsContent key={tc.id} value={tc.id} className="mt-0 space-y-4">
                {tc.description && (
                  <p className="text-sm text-muted-foreground">{tc.description}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Input</label>
                    <div className="bg-muted/50 rounded-md p-3 font-mono text-sm whitespace-pre-wrap min-h-[60px]">
                      {tc.input || '(empty)'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Expected Output</label>
                    <div className="bg-muted/50 rounded-md p-3 font-mono text-sm whitespace-pre-wrap min-h-[60px]">
                      {tc.expected_output}
                    </div>
                  </div>
                </div>
                {result && (
                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      Your Output
                      {getStatusIcon(result)}
                      <Badge variant={result.passed ? 'default' : 'destructive'}>
                        {result.passed ? '✔ Passed' : result.status.replace('_', ' ')}
                      </Badge>
                    </label>
                    <div
                      className={cn(
                        'bg-muted/50 rounded-md p-3 font-mono text-sm whitespace-pre-wrap min-h-[60px]',
                        !result.passed && 'border border-destructive/50'
                      )}
                    >
                      {result.error ? (
                        <span className="text-destructive">{result.error}</span>
                      ) : (
                        result.actualOutput || '(no output)'
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
}
