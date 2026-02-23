import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LANGUAGE_IDS: Record<string, number> = {
  c: 50, cpp: 54, java: 62, python: 71,
};

interface ExecuteRequest {
  mode: 'run' | 'submit';
  labId?: string;
  language: string;
  sourceCode: string;
  customInput?: string;
}

interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

function normalizeOutput(s: string | null): string {
  if (!s) return '';
  return s.replace(/\r\n/g, '\n').trim();
}

function mapJudge0Status(statusId: number): string {
  const map: Record<number, string> = {
    1: 'pending', 2: 'running', 3: 'accepted',
    4: 'wrong_answer', 5: 'time_limit', 6: 'compile_error',
    7: 'runtime_error', 8: 'runtime_error', 9: 'runtime_error',
    10: 'runtime_error', 11: 'runtime_error', 12: 'runtime_error',
    13: 'runtime_error', 14: 'runtime_error',
  };
  return map[statusId] || 'runtime_error';
}

function jsonOk(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonErr(message: string, httpStatus = 200) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status: httpStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function executeWithJudge0(
  sourceCode: string,
  language: string,
  input: string,
  timeLimit: number,
  memoryLimit: number,
): Promise<Judge0Result> {
  const JUDGE0_API_KEY = Deno.env.get('JUDGE0_API_KEY');
  const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com';

  if (!JUDGE0_API_KEY) {
    throw new Error('Code execution service is not configured. Please contact admin.');
  }

  const languageId = LANGUAGE_IDS[language];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);

  let resp: Response;
  try {
    resp = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
      body: JSON.stringify({
        source_code: btoa(unescape(encodeURIComponent(sourceCode))),
        language_id: languageId,
        stdin: btoa(unescape(encodeURIComponent(input))),
        cpu_time_limit: timeLimit,
        memory_limit: memoryLimit * 1024,
      }),
    });
  } catch (fetchErr) {
    console.error('Judge0 fetch error:', fetchErr);
    throw new Error('Failed to connect to code execution service.');
  }

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error('Judge0 error:', resp.status, errorText);
    if (resp.status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.');
    if (resp.status === 403) throw new Error('Code execution service subscription issue. Please contact admin.');
    throw new Error('Code execution service error. Please try again.');
  }

  const result = await resp.json();
  const d = (s: string | null | undefined): string | null => {
    if (!s) return null;
    try { return decodeURIComponent(escape(atob(s))); } catch { return atob(s); }
  };

  return {
    stdout: d(result.stdout),
    stderr: d(result.stderr),
    compile_output: d(result.compile_output),
    status: result.status || { id: 0, description: 'Unknown' },
    time: result.time,
    memory: result.memory,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonErr('Unauthorized', 401);

    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('Token verification failed:', userError);
      return jsonErr('Invalid token', 401);
    }
    const userId = userData.user.id;

    let body: ExecuteRequest;
    try { body = await req.json(); } catch { return jsonErr('Invalid request body'); }

    const { mode, labId, language, sourceCode, customInput } = body;

    if (!language || !sourceCode?.trim()) return jsonErr('Language and source code are required');
    if (!LANGUAGE_IDS[language]) return jsonErr(`Unsupported language: ${language}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let timeLimit = 2;
    let memoryLimit = 256;

    if (labId) {
      const { data: lab } = await supabase
        .from('coding_labs')
        .select('time_limit_seconds, memory_limit_mb')
        .eq('id', labId)
        .single();
      if (lab) {
        timeLimit = lab.time_limit_seconds;
        memoryLimit = lab.memory_limit_mb;
      }
    }

    // ========== RUN MODE ==========
    if (mode === 'run') {
      try {
        const result = await executeWithJudge0(sourceCode, language, customInput || '', timeLimit, memoryLimit);

        // Non-blocking log
        supabase.from('coding_lab_activity_logs').insert({
          lab_id: labId || null, user_id: userId, action: 'run',
          details: { language, status: result.status.description },
        }).then(() => {});

        const statusName = mapJudge0Status(result.status.id);
        return jsonOk({
          success: true,
          output: result.stdout || '',
          error: result.compile_output || result.stderr || null,
          status: statusName,
          statusDescription: result.status.description,
          executionTime: result.time,
          memoryUsed: result.memory,
        });
      } catch (execErr) {
        return jsonOk({
          success: false,
          output: '',
          error: execErr instanceof Error ? execErr.message : 'Execution failed',
          status: 'runtime_error',
          statusDescription: 'Error',
        });
      }
    }

    // ========== SUBMIT MODE ==========
    if (mode === 'submit' && labId) {
      const { data: student } = await supabase
        .from('students').select('id').eq('user_id', userId).single();
      if (!student) return jsonErr('Student not found');

      const { data: testCases } = await supabase
        .from('coding_lab_test_cases').select('*').eq('lab_id', labId).order('order_index');

      if (!testCases || testCases.length === 0) return jsonErr('No test cases found for this lab');

      const { data: submission, error: submissionError } = await supabase
        .from('coding_lab_submissions')
        .insert({
          lab_id: labId, student_id: student.id, language, source_code: sourceCode,
          status: 'running', total_test_cases: testCases.length,
        })
        .select().single();

      if (submissionError) {
        console.error('Submission insert error:', submissionError);
        return jsonErr('Failed to create submission record');
      }

      const testResults: Record<string, unknown>[] = [];
      let passedCount = 0, totalWeight = 0, earnedWeight = 0;
      let worstStatus = 'accepted';
      let maxTime = 0, maxMemory = 0;

      for (const testCase of testCases) {
        totalWeight += testCase.weight;
        try {
          const result = await executeWithJudge0(sourceCode, language, testCase.input, timeLimit, memoryLimit);

          const actualOutput = normalizeOutput(result.stdout);
          const expectedOutput = normalizeOutput(testCase.expected_output);

          let passed = false;
          if (result.status.id === 3) {
            const actualLines = actualOutput.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
            const expectedLines = expectedOutput.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
            if (actualLines.length === expectedLines.length) {
              passed = actualLines.every((line: string, i: number) => line === expectedLines[i]);
            }
          }

          if (passed) { passedCount++; earnedWeight += testCase.weight; }
          if (result.time) maxTime = Math.max(maxTime, parseFloat(result.time) * 1000);
          if (result.memory) maxMemory = Math.max(maxMemory, result.memory);

          const testStatus = passed ? 'passed' : mapJudge0Status(result.status.id);
          const finalTestStatus = !passed && result.status.id === 3 ? 'wrong_answer' : testStatus;
          if (!passed && worstStatus === 'accepted') worstStatus = finalTestStatus === 'passed' ? 'wrong_answer' : finalTestStatus;

          testResults.push({
            testCaseId: testCase.id, isSample: testCase.is_sample, passed,
            status: passed ? 'passed' : finalTestStatus,
            executionTime: result.time, memoryUsed: result.memory,
            ...(testCase.is_sample ? {
              input: testCase.input, expectedOutput: testCase.expected_output,
              actualOutput: result.stdout || '',
            } : {}),
            ...((result.compile_output || result.stderr) && testCase.is_sample ? {
              error: result.compile_output || result.stderr,
            } : {}),
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Execution error';
          testResults.push({
            testCaseId: testCase.id, isSample: testCase.is_sample, passed: false,
            status: 'runtime_error', error: testCase.is_sample ? errMsg : undefined,
          });
          if (worstStatus === 'accepted') worstStatus = 'runtime_error';
        }
      }

      const score = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
      const finalStatus = passedCount === testCases.length ? 'accepted' : worstStatus;

      await supabase.from('coding_lab_submissions').update({
        status: finalStatus, execution_time_ms: Math.round(maxTime),
        memory_used_kb: maxMemory, test_results: testResults,
        passed_test_cases: passedCount, score,
        evaluated_at: new Date().toISOString(),
      }).eq('id', submission.id);

      supabase.from('coding_lab_activity_logs').insert({
        lab_id: labId, user_id: userId, action: 'submit',
        details: { language, status: finalStatus, passed: passedCount, total: testCases.length, score },
      }).then(() => {});

      return jsonOk({
        success: true, submissionId: submission.id, status: finalStatus,
        passedTestCases: passedCount, totalTestCases: testCases.length, score,
        testResults: testResults.filter((t) => t.isSample),
        executionTime: maxTime, memoryUsed: maxMemory,
      });
    }

    return jsonErr('Invalid request mode');
  } catch (error) {
    console.error('Unhandled error:', error);
    return jsonOk({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      status: 'runtime_error',
    });
  }
});
