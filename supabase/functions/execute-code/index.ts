import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jwtVerify } from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Judge0 language IDs
const LANGUAGE_IDS: Record<string, number> = {
  c: 50,      // C (GCC 9.2.0)
  cpp: 54,    // C++ (GCC 9.2.0)
  java: 62,   // Java (OpenJDK 13.0.1)
  python: 71, // Python (3.8.1)
};

// Default template code
const TEMPLATE_CODE: Record<string, string> = {
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

interface ExecuteRequest {
  mode: 'run' | 'submit';
  labId?: string;
  language: string;
  sourceCode: string;
  customInput?: string;
  submissionId?: string;
}

async function verifyToken(token: string): Promise<string | null> {
  try {
    const JWKS_URL = `${Deno.env.get('SUPABASE_URL')}/auth/v1/.well-known/jwks.json`;
    const response = await fetch(JWKS_URL);
    const jwks = await response.json();
    
    const key = await crypto.subtle.importKey(
      'jwk',
      jwks.keys[0],
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      true,
      ['verify']
    );

    const { payload } = await jwtVerify(token, key, {
      audience: 'authenticated',
    });

    return payload.sub as string;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

async function executeWithJudge0(
  sourceCode: string,
  language: string,
  input: string,
  timeLimit: number,
  memoryLimit: number
): Promise<{
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}> {
  const JUDGE0_API_KEY = Deno.env.get('JUDGE0_API_KEY');
  const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com';
  
  const languageId = LANGUAGE_IDS[language];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // Create submission
  const createResponse = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': JUDGE0_API_KEY!,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
    },
    body: JSON.stringify({
      source_code: btoa(sourceCode),
      language_id: languageId,
      stdin: btoa(input),
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit * 1024, // Convert MB to KB
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('Judge0 error:', errorText);
    throw new Error('Failed to execute code with Judge0');
  }

  const result = await createResponse.json();

  return {
    stdout: result.stdout ? atob(result.stdout) : null,
    stderr: result.stderr ? atob(result.stderr) : null,
    compile_output: result.compile_output ? atob(result.compile_output) : null,
    status: result.status,
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
    const userId = await verifyToken(token);
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ExecuteRequest = await req.json();
    const { mode, labId, language, sourceCode, customInput, submissionId } = body;

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

    if (mode === 'run') {
      // Simple run with custom input
      const result = await executeWithJudge0(
        sourceCode,
        language,
        customInput || '',
        timeLimit,
        memoryLimit
      );

      // Log activity
      await supabase.from('coding_lab_activity_logs').insert({
        lab_id: labId || null,
        user_id: userId,
        action: 'run',
        details: { language, status: result.status.description },
      });

      return new Response(
        JSON.stringify({
          success: true,
          output: result.stdout,
          error: result.stderr || result.compile_output,
          status: result.status.description,
          executionTime: result.time,
          memoryUsed: result.memory,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mode === 'submit' && labId) {
      // Get student ID
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

      // Get all test cases for this lab
      const { data: testCases } = await supabase
        .from('coding_lab_test_cases')
        .select('*')
        .eq('lab_id', labId)
        .order('order_index');

      if (!testCases || testCases.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No test cases found' }),
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
        throw submissionError;
      }

      // Run against all test cases
      const testResults = [];
      let passedCount = 0;
      let totalWeight = 0;
      let earnedWeight = 0;
      let worstStatus = 'accepted';
      let lastTime = 0;
      let lastMemory = 0;

      for (const testCase of testCases) {
        totalWeight += testCase.weight;
        
        try {
          const result = await executeWithJudge0(
            sourceCode,
            language,
            testCase.input,
            timeLimit,
            memoryLimit
          );

          const actualOutput = (result.stdout || '').trim();
          const expectedOutput = testCase.expected_output.trim();
          const passed = actualOutput === expectedOutput && result.status.id === 3; // 3 = Accepted

          if (passed) {
            passedCount++;
            earnedWeight += testCase.weight;
          }

          if (result.time) {
            lastTime = Math.max(lastTime, parseFloat(result.time) * 1000);
          }
          if (result.memory) {
            lastMemory = Math.max(lastMemory, result.memory);
          }

          // Map status
          const statusMap: Record<number, string> = {
            1: 'pending',
            2: 'running',
            3: 'accepted',
            4: 'wrong_answer',
            5: 'time_limit',
            6: 'compile_error',
            7: 'runtime_error',
            8: 'runtime_error',
            9: 'runtime_error',
            10: 'runtime_error',
            11: 'runtime_error',
            12: 'runtime_error',
            13: 'runtime_error',
            14: 'runtime_error',
          };

          const testStatus = passed ? 'passed' : (statusMap[result.status.id] || 'wrong_answer');
          
          if (!passed && worstStatus === 'accepted') {
            worstStatus = testStatus;
          }

          testResults.push({
            testCaseId: testCase.id,
            isSample: testCase.is_sample,
            passed,
            status: testStatus,
            executionTime: result.time,
            memoryUsed: result.memory,
            // Only include output for sample test cases
            ...(testCase.is_sample ? {
              input: testCase.input,
              expectedOutput: testCase.expected_output,
              actualOutput,
            } : {}),
          });
        } catch (err) {
          testResults.push({
            testCaseId: testCase.id,
            isSample: testCase.is_sample,
            passed: false,
            status: 'runtime_error',
            error: err instanceof Error ? err.message : 'Unknown error',
          });
          
          if (worstStatus === 'accepted') {
            worstStatus = 'runtime_error';
          }
        }
      }

      // Calculate score
      const score = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
      const finalStatus = passedCount === testCases.length ? 'accepted' : worstStatus;

      // Update submission
      await supabase
        .from('coding_lab_submissions')
        .update({
          status: finalStatus,
          execution_time_ms: Math.round(lastTime),
          memory_used_kb: lastMemory,
          test_results: testResults,
          passed_test_cases: passedCount,
          score,
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      // Log activity
      await supabase.from('coding_lab_activity_logs').insert({
        lab_id: labId,
        user_id: userId,
        action: 'submit',
        details: {
          language,
          status: finalStatus,
          passed: passedCount,
          total: testCases.length,
          score,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          submissionId: submission.id,
          status: finalStatus,
          passedTestCases: passedCount,
          totalTestCases: testCases.length,
          score,
          testResults: testResults.filter(t => t.isSample), // Only return sample results
          executionTime: lastTime,
          memoryUsed: lastMemory,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
