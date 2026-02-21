import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Judge0 language IDs
const LANGUAGE_IDS: Record<string, number> = {
  c: 50,
  cpp: 54,
  java: 62,
  python: 71,
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
    4: 'wrong_answer', 5: 'time_limit',
    6: 'compile_error',
    7: 'runtime_error', 8: 'runtime_error', 9: 'runtime_error',
    10: 'runtime_error', 11: 'runtime_error', 12: 'runtime_error',
    13: 'runtime_error', 14: 'runtime_error',
  };
  return map[statusId] || 'runtime_error';
}

async function executeWithJudge0(
  sourceCode: string,
  language: string,
  input: string,
  timeLimit: number,
  memoryLimit: number
): Promise<Judge0Result> {
  const JUDGE0_API_KEY = Deno.env.get('JUDGE0_API_KEY');
  const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com';

  if (!JUDGE0_API_KEY) {
    throw new Error('Code execution service is not configured.');
  }

  const languageId = LANGUAGE_IDS[language];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  let createResponse: Response;
  try {
    createResponse = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`, {
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

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('Judge0 error:', createResponse.status, errorText);
    if (createResponse.status === 429) {
      throw new Error('Too many submissions. Please wait a moment and try again.');
    }
    if (createResponse.status === 403) {
      throw new Error('Code execution service subscription issue. Please contact admin.');
    }
    throw new Error('Code execution service error. Please try again.');
  }

  const result = await createResponse.json();

  const decodeB64 = (s: string | null | undefined): string | null => {
    if (!s) return null;
    try { return decodeURIComponent(escape(atob(s))); } catch { return atob(s); }
  };

  return {
    stdout: decodeB64(result.stdout),
    stderr: decodeB64(result.stderr),
    compile_output: decodeB64(result.compile_output),
    status: result.status || { id: 0, description: 'Unknown' },
    time: result.time,
    memory: result.memory,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Token verification failed:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;

    let body: ExecuteRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { mode, labId, language, sourceCode, customInput } = body;

    // Validate required fields
    if (!language || !sourceCode?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Language and source code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LANGUAGE_IDS[language]) {
      return new Response(
        JSON.stringify({ error: `Unsupported language: ${language}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get time/memory limits from lab if provided
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

    // ============ RUN MODE ============
    if (mode === 'run') {
      let result: Judge0Result;
      try {
        result = await executeWithJudge0(
          sourceCode, language, customInput || '', timeLimit, memoryLimit
        );
      } catch (execErr) {
        return new Response(
          JSON.stringify({
            success: false,
            error: execErr instanceof Error ? execErr.message : 'Execution failed',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log activity (non-blocking)
      supabase.from('coding_lab_activity_logs').insert({
        lab_id: labId || null,
        user_id: userId,
        action: 'run',
        details: { language, status: result.status.description },
      }).then(() => {});

      const statusName = mapJudge0Status(result.status.id);
      const hasError = result.stderr || result.compile_output;

      return new Response(
        JSON.stringify({
          success: result.status.id === 3 || result.status.id <= 2 || !!result.stdout,
          output: result.stdout || '',
          error: result.compile_output || result.stderr || null,
          status: statusName,
          statusDescription: result.status.description,
          executionTime: result.time,
          memoryUsed: result.memory,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ SUBMIT MODE ============
    if (mode === 'submit' && labId) {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!student) {
        return new Response(
          JSON.stringify({ error: 'Student not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: testCases } = await supabase
        .from('coding_lab_test_cases')
        .select('*')
        .eq('lab_id', labId)
        .order('order_index');

      if (!testCases || testCases.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No test cases found for this lab' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create submission record
      const { data: submission, error: submissionError } = await supabase
        .from('coding_lab_submissions')
        .insert({
          lab_id: labId,
          student_id: student.id,
          language,
          source_code: sourceCode,
          status: 'running',
          total_test_cases: testCases.length,
        })
        .select()
        .single();

      if (submissionError) {
        console.error('Submission insert error:', submissionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create submission record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const testResults = [];
      let passedCount = 0;
      let totalWeight = 0;
      let earnedWeight = 0;
      let worstStatus = 'accepted';
      let maxTime = 0;
      let maxMemory = 0;

      for (const testCase of testCases) {
        totalWeight += testCase.weight;

        try {
          const result = await executeWithJudge0(
            sourceCode, language, testCase.input, timeLimit, memoryLimit
          );

          const actualOutput = normalizeOutput(result.stdout);
          const expectedOutput = normalizeOutput(testCase.expected_output);

          // Determine pass: status must be Accepted (3) AND outputs match
          let passed = false;
          if (result.status.id === 3) {
            // Normalize: trim each line, compare line by line
            const actualLines = actualOutput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const expectedLines = expectedOutput.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            if (actualLines.length === expectedLines.length) {
              passed = actualLines.every((line, i) => line === expectedLines[i]);
            }
          }

          if (passed) {
            passedCount++;
            earnedWeight += testCase.weight;
          }

          if (result.time) maxTime = Math.max(maxTime, parseFloat(result.time) * 1000);
          if (result.memory) maxMemory = Math.max(maxMemory, result.memory);

          const testStatus = passed ? 'passed' : mapJudge0Status(result.status.id);
          // If not passed and status was 'accepted' from Judge0, it's a wrong answer
          const finalTestStatus = !passed && result.status.id === 3 ? 'wrong_answer' : testStatus;

          if (!passed && worstStatus === 'accepted') {
            worstStatus = finalTestStatus === 'passed' ? 'wrong_answer' : finalTestStatus;
          }

          testResults.push({
            testCaseId: testCase.id,
            isSample: testCase.is_sample,
            passed,
            status: passed ? 'passed' : finalTestStatus,
            executionTime: result.time,
            memoryUsed: result.memory,
            ...(testCase.is_sample ? {
              input: testCase.input,
              expectedOutput: testCase.expected_output,
              actualOutput: result.stdout || '',
            } : {}),
            ...((result.compile_output || result.stderr) && testCase.is_sample ? {
              error: result.compile_output || result.stderr,
            } : {}),
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Execution error';
          testResults.push({
            testCaseId: testCase.id,
            isSample: testCase.is_sample,
            passed: false,
            status: 'runtime_error',
            error: testCase.is_sample ? errMsg : undefined,
          });
          if (worstStatus === 'accepted') worstStatus = 'runtime_error';
        }
      }

      const score = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
      const finalStatus = passedCount === testCases.length ? 'accepted' : worstStatus;

      // Update submission record
      await supabase
        .from('coding_lab_submissions')
        .update({
          status: finalStatus,
          execution_time_ms: Math.round(maxTime),
          memory_used_kb: maxMemory,
          test_results: testResults,
          passed_test_cases: passedCount,
          score,
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      // Log activity (non-blocking)
      supabase.from('coding_lab_activity_logs').insert({
        lab_id: labId,
        user_id: userId,
        action: 'submit',
        details: { language, status: finalStatus, passed: passedCount, total: testCases.length, score },
      }).then(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          submissionId: submission.id,
          status: finalStatus,
          passedTestCases: passedCount,
          totalTestCases: testCases.length,
          score,
          testResults: testResults.filter(t => t.isSample),
          executionTime: maxTime,
          memoryUsed: maxMemory,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request mode' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
