import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [errorExpanded, setErrorExpanded] = useState(true);

  const getStatusIcon = (result: TestResult) => {
    if (result.passed) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    switch (result.status) {
      case 'time_limit':
        return <Clock className="h-3.5 w-3.5 text-amber-400" />;
      case 'compile_error':
      case 'runtime_error':
        return <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />;
      default:
        return <XCircle className="h-3.5 w-3.5 text-red-400" />;
    }
  };

  const getRunStatusBadge = () => {
    if (!status) return null;
    const map: Record<string, { cls: string; label: string }> = {
      accepted: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: '✔ Executed Successfully' },
      wrong_answer: { cls: 'bg-red-500/15 text-red-400 border-red-500/30', label: '✖ Wrong Answer' },
      runtime_error: { cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30', label: '⚠ Runtime Error' },
      compile_error: { cls: 'bg-red-500/15 text-red-400 border-red-500/30', label: '⚠ Compile Error' },
      time_limit: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: '⏱ Time Limit Exceeded' },
    };
    const v = map[status] || { cls: 'bg-muted text-muted-foreground', label: status };
    return <Badge className={cn('border text-xs', v.cls)}>{v.label}</Badge>;
  };

  return (
    <div className="h-full flex flex-col bg-card/50">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/20 flex-wrap gap-1">
          <TabsList className="bg-muted/50 h-8">
            <TabsTrigger value="custom" className="text-xs h-6 px-3">Custom Input</TabsTrigger>
            {sampleTestCases.map((tc, i) => {
              const result = testResults?.find((r) => r.testCaseId === tc.id);
              return (
                <TabsTrigger key={tc.id} value={tc.id} className="text-xs h-6 px-3">
                  <span className="flex items-center gap-1">
                    Case {i + 1}
                    {result && <span className="ml-0.5">{getStatusIcon(result)}</span>}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {testResults && testResults.length > 0 && (
            <Badge variant="outline" className="text-xs h-6">
              {testResults.filter((r) => r.passed).length}/{testResults.length} Passed
            </Badge>
          )}
        </div>

        <div className="p-3 flex-1 overflow-auto">
          <TabsContent value="custom" className="mt-0 space-y-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground uppercase tracking-wider">Input</label>
              <Textarea
                value={customInput}
                onChange={(e) => onCustomInputChange(e.target.value)}
                placeholder="Enter custom input here..."
                className="font-mono text-sm min-h-[60px] bg-background/50 border-border/50 focus:border-primary/50 resize-none"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Output</label>
                {!isRunning && getRunStatusBadge()}
              </div>
              <div
                className={cn(
                  'rounded-md p-3 font-mono text-sm min-h-[60px] whitespace-pre-wrap',
                  'bg-background/50 border border-border/50',
                  error && 'border-red-500/30 bg-red-500/5'
                )}
              >
                {isRunning ? (
                  <span className="text-muted-foreground animate-pulse">⏳ Running your code...</span>
                ) : error ? (
                  <div>
                    {output && <div className="mb-2">{output}</div>}
                    <button
                      onClick={() => setErrorExpanded(!errorExpanded)}
                      className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 mb-1"
                    >
                      {errorExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      Error Details
                    </button>
                    {errorExpanded && (
                      <pre className="text-red-400 text-xs whitespace-pre-wrap bg-red-500/5 rounded p-2 border border-red-500/20">
                        {error}
                      </pre>
                    )}
                  </div>
                ) : output ? (
                  <span>{output}</span>
                ) : (
                  <span className="text-muted-foreground/60">Click "Run" to execute your code</span>
                )}
              </div>
            </div>
          </TabsContent>

          {sampleTestCases.map((tc) => {
            const result = testResults?.find((r) => r.testCaseId === tc.id);
            return (
              <TabsContent key={tc.id} value={tc.id} className="mt-0 space-y-3">
                {tc.description && (
                  <p className="text-xs text-muted-foreground">{tc.description}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block text-muted-foreground uppercase tracking-wider">Input</label>
                    <div className="bg-background/50 border border-border/50 rounded-md p-2.5 font-mono text-sm whitespace-pre-wrap min-h-[50px]">
                      {tc.input || '(empty)'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block text-muted-foreground uppercase tracking-wider">Expected</label>
                    <div className="bg-background/50 border border-border/50 rounded-md p-2.5 font-mono text-sm whitespace-pre-wrap min-h-[50px]">
                      {tc.expected_output}
                    </div>
                  </div>
                </div>
                {result && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Output</label>
                      {getStatusIcon(result)}
                      <Badge className={cn(
                        'text-xs border',
                        result.passed
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/15 text-red-400 border-red-500/30'
                      )}>
                        {result.passed ? '✔ Passed' : result.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div
                      className={cn(
                        'rounded-md p-2.5 font-mono text-sm whitespace-pre-wrap min-h-[50px]',
                        'bg-background/50 border',
                        result.passed ? 'border-emerald-500/20' : 'border-red-500/20'
                      )}
                    >
                      {result.error ? (
                        <span className="text-red-400">{result.error}</span>
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
