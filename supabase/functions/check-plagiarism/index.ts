import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Submission {
  id: string;
  student_id: string;
  source_code: string;
  language: string;
}

// Normalize code by removing comments, whitespace, and standardizing
function normalizeCode(code: string, language: string): string {
  let normalized = code;

  // Remove single-line comments
  if (['c', 'cpp', 'java'].includes(language)) {
    normalized = normalized.replace(/\/\/.*$/gm, '');
  }
  if (language === 'python') {
    normalized = normalized.replace(/#.*$/gm, '');
  }

  // Remove multi-line comments
  if (['c', 'cpp', 'java'].includes(language)) {
    normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
  }
  if (language === 'python') {
    normalized = normalized.replace(/'''[\s\S]*?'''/g, '');
    normalized = normalized.replace(/"""[\s\S]*?"""/g, '');
  }

  // Remove string literals (replace with placeholder)
  normalized = normalized.replace(/"[^"]*"/g, '"STR"');
  normalized = normalized.replace(/'[^']*'/g, "'STR'");

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Convert to lowercase
  normalized = normalized.toLowerCase();

  return normalized;
}

// Tokenize code into meaningful tokens
function tokenize(code: string): string[] {
  // Split by non-alphanumeric characters, keeping operators
  const tokens = code.split(/\s+|(?=[{}()\[\];,.])|(?<=[{}()\[\];,.])/)
    .filter(t => t.length > 0);
  return tokens;
}

// Calculate Jaccard similarity between two token sets
function jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// Calculate n-gram similarity (better for detecting reordered code)
function ngramSimilarity(tokens1: string[], tokens2: string[], n: number = 3): number {
  const getNgrams = (tokens: string[]) => {
    const ngrams = new Set<string>();
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.add(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
  };

  const ngrams1 = getNgrams(tokens1);
  const ngrams2 = getNgrams(tokens2);

  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

  const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
  const union = new Set([...ngrams1, ...ngrams2]);

  return intersection.size / union.size;
}

// Count matching lines
function countMatchingLines(code1: string, code2: string): number {
  const lines1 = code1.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const lines2 = new Set(code2.split('\n').map(l => l.trim()).filter(l => l.length > 0));
  
  return lines1.filter(line => lines2.has(line)).length;
}

// Calculate combined similarity score
function calculateSimilarity(code1: string, code2: string, language: string): {
  score: number;
  matchingLines: number;
} {
  const norm1 = normalizeCode(code1, language);
  const norm2 = normalizeCode(code2, language);

  const tokens1 = tokenize(norm1);
  const tokens2 = tokenize(norm2);

  // Combine multiple similarity measures
  const jaccard = jaccardSimilarity(tokens1, tokens2);
  const ngram3 = ngramSimilarity(tokens1, tokens2, 3);
  const ngram5 = ngramSimilarity(tokens1, tokens2, 5);

  // Weighted average (n-grams are better at detecting structural similarity)
  const score = (jaccard * 0.3 + ngram3 * 0.4 + ngram5 * 0.3) * 100;

  const matchingLines = countMatchingLines(code1, code2);

  return { score, matchingLines };
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

    const { labId, threshold = 50 } = await req.json();

    if (!labId) {
      return new Response(
        JSON.stringify({ error: 'labId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`Starting plagiarism check for lab: ${labId}`);

    // Fetch all submissions for this lab (only best/latest per student)
    const { data: allSubmissions, error: subError } = await supabase
      .from('coding_lab_submissions')
      .select('id, student_id, source_code, language, score')
      .eq('lab_id', labId)
      .order('score', { ascending: false });

    if (subError) {
      console.error('Error fetching submissions:', subError);
      throw subError;
    }

    // Get best submission per student
    const bestByStudent = new Map<string, Submission>();
    for (const sub of allSubmissions || []) {
      if (!bestByStudent.has(sub.student_id)) {
        bestByStudent.set(sub.student_id, sub);
      }
    }
    const submissions = Array.from(bestByStudent.values());

    console.log(`Analyzing ${submissions.length} submissions`);

    if (submissions.length < 2) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Not enough submissions to compare',
          comparisons: 0,
          flagged: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete old plagiarism records for this lab
    await supabase
      .from('coding_lab_plagiarism')
      .delete()
      .eq('lab_id', labId);

    // Compare all pairs
    const results: Array<{
      submission_1_id: string;
      submission_2_id: string;
      similarity_score: number;
      matching_lines: number;
      lab_id: string;
      flagged: boolean;
    }> = [];

    let comparisons = 0;
    for (let i = 0; i < submissions.length; i++) {
      for (let j = i + 1; j < submissions.length; j++) {
        const sub1 = submissions[i];
        const sub2 = submissions[j];

        // Only compare same language submissions
        if (sub1.language !== sub2.language) continue;

        comparisons++;
        const { score, matchingLines } = calculateSimilarity(
          sub1.source_code,
          sub2.source_code,
          sub1.language
        );

        // Only store if above threshold
        if (score >= threshold) {
          results.push({
            lab_id: labId,
            submission_1_id: sub1.id,
            submission_2_id: sub2.id,
            similarity_score: Math.round(score * 100) / 100,
            matching_lines: matchingLines,
            flagged: score >= 70, // Auto-flag if >= 70%
          });
        }
      }
    }

    console.log(`Completed ${comparisons} comparisons, found ${results.length} potential matches`);

    // Insert results
    if (results.length > 0) {
      const { error: insertError } = await supabase
        .from('coding_lab_plagiarism')
        .insert(results);

      if (insertError) {
        console.error('Error inserting plagiarism results:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        comparisons,
        potentialMatches: results.length,
        flagged: results.filter(r => r.flagged).length,
        results: results.map(r => ({
          similarity: r.similarity_score,
          matchingLines: r.matching_lines,
          flagged: r.flagged,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Plagiarism check error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
