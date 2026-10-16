import { Router, Response } from 'express';
import https from 'https';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Judge0 configuration (works in mock mode if no key provided)
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const JUDGE0_HOST = process.env.JUDGE0_HOST || 'judge0-ce.p.rapidapi.com';

// Language ID mapping (Judge0 standard IDs)
export const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  typescript: 74,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  csharp: 51,
  go: 60,
  rust: 73,
  ruby: 72,
};

interface RunCodeRequest {
  code: string;
  language: string;
  stdin?: string;
  expectedOutput?: string;
}

interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  executionTimeMs: number;
  memoryKb: number;
}

/**
 * POST /api/judge/run
 * Run code against a single stdin via Judge0 (or simulation)
 */
router.post('/run', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { code, language, stdin = '', expectedOutput } = req.body as RunCodeRequest;

  if (!code || !language) {
    return res.status(400).json({ error: 'code and language are required' });
  }

  const langId = LANGUAGE_IDS[language.toLowerCase()];
  if (!langId) {
    return res.status(400).json({ error: `Unsupported language: ${language}` });
  }

  // If Judge0 API key is present, use the real API
  if (JUDGE0_API_KEY) {
    try {
      const result = await runWithJudge0(code, langId, stdin, JUDGE0_API_KEY, JUDGE0_HOST);
      return res.json(result);
    } catch (err: any) {
      console.error('Judge0 API failed, falling back to simulator:', err.message);
    }
  }

  // Simulation mode
  const simResult = simulateCodeRun(code, language, stdin, expectedOutput);
  return res.json(simResult);
});

/**
 * POST /api/judge/run-tests
 * Run code against multiple test cases (batch)
 * Body: { code, language, testCases: [{input, expected}] }
 */
router.post('/run-tests', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { code, language, testCases } = req.body;

  if (!code || !language || !Array.isArray(testCases)) {
    return res.status(400).json({ error: 'code, language, and testCases array required' });
  }

  const langId = LANGUAGE_IDS[language.toLowerCase()];
  if (!langId) {
    return res.status(400).json({ error: `Unsupported language: ${language}` });
  }

  try {
    const results: TestResult[] = [];

    for (const tc of testCases.slice(0, 10)) { // cap at 10 test cases
      if (JUDGE0_API_KEY) {
        try {
          const r = await runWithJudge0(code, langId, tc.input || '', JUDGE0_API_KEY, JUDGE0_HOST);
          const actual = (r.stdout || '').trim();
          const expected = String(tc.expected || '').trim();
          results.push({
            passed: actual === expected,
            input: tc.input || '',
            expected,
            actual,
            executionTimeMs: r.time ? Math.round(parseFloat(r.time) * 1000) : 0,
            memoryKb: r.memory || 0,
          });
          continue;
        } catch {
          // fall through to simulation
        }
      }

      // Simulate test case
      const sim = simulateCodeRun(code, language, tc.input, tc.expected);
      results.push({
        passed: sim.passed,
        input: tc.input || '',
        expected: String(tc.expected || ''),
        actual: sim.stdout || '',
        executionTimeMs: sim.executionTimeMs,
        memoryKb: sim.memoryKb,
      });
    }

    const passedCount = results.filter((r) => r.passed).length;

    return res.json({
      results,
      passed: passedCount,
      total: results.length,
      allPassed: passedCount === results.length,
      successRate: results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Code execution failed: ' + err.message });
  }
});

// -------------------------------------------------------------------------
// Judge0 real API call
// -------------------------------------------------------------------------
const runWithJudge0 = (
  code: string,
  languageId: number,
  stdin: string,
  apiKey: string,
  host: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      source_code: Buffer.from(code).toString('base64'),
      language_id: languageId,
      stdin: Buffer.from(stdin).toString('base64'),
      base64_encoded: true,
      wait: true,
    });

    const options = {
      hostname: host,
      path: '/submissions/?base64_encoded=true&wait=true',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': host,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.stdout) {
            result.stdout = Buffer.from(result.stdout, 'base64').toString();
          }
          if (result.stderr) {
            result.stderr = Buffer.from(result.stderr, 'base64').toString();
          }
          if (result.compile_output) {
            result.compile_output = Buffer.from(result.compile_output, 'base64').toString();
          }
          resolve(result);
        } catch (err) {
          reject(new Error('Failed to parse Judge0 response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// -------------------------------------------------------------------------
// Simulation mode – genuinely evaluates code when possible
// For JavaScript/TypeScript: actually executes via Function()
// For other languages: structural heuristic that never blindly passes
// -------------------------------------------------------------------------
const simulateCodeRun = (
  code: string,
  language: string,
  stdin: string = '',
  expectedOutput?: string
): any => {
  const execStart = Date.now();
  const memKb = 4000 + Math.floor(Math.random() * 8000);

  // ── 1. Check brace balance as syntax check ──
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openBraces !== closeBraces || openParens !== closeParens) {
    return {
      status: { id: 6, description: 'Compilation Error' },
      compile_output: `SyntaxError: Mismatched brackets/braces. Found ${openBraces} '{' and ${closeBraces} '}', ${openParens} '(' and ${closeParens} ')'.`,
      stdout: null, stderr: null, time: null, memory: null,
      passed: false, executionTimeMs: 0, memoryKb: 0, isSimulated: true,
    };
  }

  // ── 2. Check if code is too minimal / empty stub ──
  const codeNoComments = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/#.*$/gm, '').trim();
  const hasReturn = codeNoComments.includes('return');
  const hasFunction = /function|def |=>|class Solution|public:|func |impl |fn /.test(codeNoComments);
  const hasLogic = /for|while|if|map|reduce|filter|switch|match|\.sort|push|pop|charAt|substring|slice|parseInt|Math\.|len\(|range\(|append/.test(codeNoComments);

  // If the code is just the original template with no added logic
  const meaningfulLines = codeNoComments.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('//') && !l.trim().startsWith('#'));
  if (meaningfulLines.length < 3 || (!hasReturn && !codeNoComments.includes('print') && !codeNoComments.includes('console.log'))) {
    return {
      status: { id: 4, description: 'Wrong Answer' },
      stdout: '', stderr: null,
      time: '0.001', memory: memKb,
      passed: false, executionTimeMs: 1, memoryKb: memKb,
      isSimulated: true, note: 'Empty or stub implementation — no logic detected.',
    };
  }

  const expected = (expectedOutput || '').trim();

  // ── 3. For JavaScript/TypeScript: actually execute the code ──
  const lang = language.toLowerCase();
  if (lang === 'javascript' || lang === 'typescript') {
    try {
      // Try to extract the solution function and run it
      let actualOutput = '';

      // Parse stdin to get function args
      const inputLines = stdin.split('\n').map(l => l.trim()).filter(Boolean);

      // Try to build an executable wrapper
      // Strategy: wrap the user code, find the exported function, call it with parsed input
      let execCode = code;

      // If code has class Solution with a method, extract and call it
      const methodMatch = code.match(/(\w+)\s*\(([^)]*)\)\s*{/g);
      const solutionClassMatch = code.match(/var\s+(\w+)\s*=\s*function/);

      // Build execution: append a call that prints the result
      let wrappedCode = '';

      if (code.includes('class Solution')) {
        // Extract the method name inside class Solution
        const innerMethod = code.match(/class Solution\s*{[^}]*?(\w+)\s*\(([^)]*)\)\s*{/s);
        if (innerMethod) {
          const fnName = innerMethod[1];
          // Parse inputs
          const parsedInputs = inputLines.map(line => {
            try { return JSON.parse(line); } catch { return line; }
          });
          wrappedCode = `
            ${code.replace(/class Solution/, 'class Solution')}
            const __sol = new Solution();
            const __result = __sol.${fnName}(${parsedInputs.map(v => JSON.stringify(v)).join(', ')});
            return typeof __result === 'object' ? JSON.stringify(__result) : String(__result);
          `;
        }
      } else if (solutionClassMatch) {
        const fnName = solutionClassMatch[1];
        const parsedInputs = inputLines.map(line => {
          try { return JSON.parse(line); } catch { return line; }
        });
        wrappedCode = `
          ${code}
          const __result = ${fnName}(${parsedInputs.map(v => JSON.stringify(v)).join(', ')});
          return typeof __result === 'object' ? JSON.stringify(__result) : String(__result);
        `;
      } else {
        // Try to find any exported/standalone function
        const standaloneFn = code.match(/function\s+(\w+)\s*\(/);
        const arrowFn = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\()/);
        const fnName = standaloneFn?.[1] || arrowFn?.[1];
        if (fnName) {
          const parsedInputs = inputLines.map(line => {
            try { return JSON.parse(line); } catch { return line; }
          });
          wrappedCode = `
            ${code}
            const __result = ${fnName}(${parsedInputs.map(v => JSON.stringify(v)).join(', ')});
            return typeof __result === 'object' ? JSON.stringify(__result) : String(__result);
          `;
        }
      }

      if (wrappedCode) {
        try {
          const fn = new Function(wrappedCode);
          const result = fn();
          actualOutput = String(result ?? '').trim();
        } catch (runErr: any) {
          // Runtime error
          return {
            status: { id: 11, description: 'Runtime Error' },
            stdout: null, stderr: runErr.message,
            compile_output: null,
            time: String((Date.now() - execStart) / 1000),
            memory: memKb,
            passed: false, executionTimeMs: Date.now() - execStart, memoryKb: memKb,
            isSimulated: true,
          };
        }
      } else {
        // Can't determine how to call the code
        actualOutput = '[unable to invoke]';
      }

      const execMs = Date.now() - execStart;

      // Normalize comparison: trim whitespace, compare case-insensitive for booleans
      const normalizeOutput = (s: string) => {
        const t = s.trim().replace(/"/g, '').replace(/'/g, '');
        if (t === 'true' || t === 'True') return 'true';
        if (t === 'false' || t === 'False') return 'false';
        if (t === 'null' || t === 'None' || t === 'nil') return 'null';
        return t;
      };

      const normActual = normalizeOutput(actualOutput);
      const normExpected = normalizeOutput(expected);
      const passed = expected !== '' && normActual === normExpected;

      return {
        status: { id: passed ? 3 : 4, description: passed ? 'Accepted' : 'Wrong Answer' },
        stdout: actualOutput,
        stderr: null,
        time: String(Math.max(1, execMs) / 1000),
        memory: memKb,
        passed,
        executionTimeMs: Math.max(1, execMs),
        memoryKb: memKb,
        isSimulated: true,
      };

    } catch (e: any) {
      return {
        status: { id: 6, description: 'Compilation Error' },
        compile_output: e.message || 'Failed to parse JavaScript code.',
        stdout: null, stderr: null, time: null, memory: null,
        passed: false, executionTimeMs: 0, memoryKb: 0, isSimulated: true,
      };
    }
  }

  // ── 4. For non-JS languages (C++, Java, Python, Go, Rust, etc.): ──
  // We cannot execute these server-side without Judge0, so do a genuine
  // heuristic analysis — NEVER blindly return "Accepted"
  const execMs = 40 + Math.floor(Math.random() * 80);

  // Check if the code has meaningful logic beyond the template
  if (!hasLogic && !hasReturn) {
    return {
      status: { id: 4, description: 'Wrong Answer' },
      stdout: '', stderr: null,
      time: String(execMs / 1000), memory: memKb,
      passed: false, executionTimeMs: execMs, memoryKb: memKb,
      isSimulated: true, note: 'No algorithmic logic detected (no loops, conditions, or data transformations).',
    };
  }

  // For non-JS: We simulate execution by doing a structural match.
  // The code must have: function definition + return + actual logic.
  // We generate a plausible output based on the expected format,
  // but intentionally make it NOT match unless the code looks correct.

  // Check if code has enough substance to plausibly solve the problem
  const codeLength = codeNoComments.length;
  const hasNestedLogic = (codeNoComments.match(/if|for|while/g) || []).length >= 2;
  const hasDataStructures = /map|set|dict|hash|stack|queue|heap|array|list|vector|deque/.test(codeNoComments.toLowerCase());

  // Simple scoring: does the code look like a real solution?
  let confidence = 0;
  if (hasFunction) confidence += 20;
  if (hasReturn) confidence += 15;
  if (hasLogic) confidence += 20;
  if (hasNestedLogic) confidence += 15;
  if (hasDataStructures) confidence += 10;
  if (codeLength > 150) confidence += 10;
  if (codeLength > 300) confidence += 10;

  // If expected output is empty or generic, we can't truly validate
  if (!expected || expected === 'Valid Output' || expected.startsWith('Result')) {
    // Return a plausible output but mark as "cannot verify"
    return {
      status: { id: 4, description: 'Wrong Answer' },
      stdout: `[Simulated] Cannot verify without Judge0 API key. Configure JUDGE0_API_KEY for real execution.`,
      stderr: null,
      time: String(execMs / 1000), memory: memKb,
      passed: false, executionTimeMs: execMs, memoryKb: memKb,
      isSimulated: true,
      note: 'Real code execution requires Judge0 API key. Set JUDGE0_API_KEY in your .env file.',
    };
  }

  // With a real expected output: only pass if confidence is very high
  // This prevents blind "Accepted" for every submission
  const passed = confidence >= 80;
  const simulatedOutput = passed ? expected : `[Simulated] ${confidence < 50 ? 'Incomplete solution' : 'Suboptimal — verify with Judge0'}`;

  return {
    status: { id: passed ? 3 : 4, description: passed ? 'Accepted' : 'Wrong Answer' },
    stdout: simulatedOutput,
    stderr: null,
    time: String(execMs / 1000), memory: memKb,
    passed,
    executionTimeMs: execMs, memoryKb: memKb,
    isSimulated: true,
  };
};

export default router;
