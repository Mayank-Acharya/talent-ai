import { Router, Response } from 'express';
import { prisma } from '../services/db';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { evaluateAnswer, generateProblemHints, askDoraAI } from '../services/ai';

const router = Router();

// 1. List all question bank items
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;

  try {
    const questions = await prisma.questionBankItem.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ questions });
  } catch (error) {
    console.error('List question bank error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Create a new question bank item
router.post('/', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;
  const { title, text, category, difficulty, examples, constraints, code, optimalTime, optimalSpace, optimalApproach, guide, leetcodeId } = req.body;

  if (!title || !text || !category) {
    return res.status(400).json({ error: 'Title, text, and category are required' });
  }

  try {
    const question = await prisma.questionBankItem.create({
      data: {
        companyId,
        title,
        text,
        category,
        difficulty: difficulty || 'MEDIUM',
        examples: examples ? JSON.stringify(examples) : null,
        constraints: constraints ? JSON.stringify(constraints) : null,
        code,
        optimalTime,
        optimalSpace,
        optimalApproach,
        guide,
        leetcodeId: leetcodeId ? Number(leetcodeId) : null,
      },
    });

    return res.json({ question });
  } catch (error) {
    console.error('Create question bank item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. AI Code Evaluation for standalone practice problems — awards +5 points once on passing (score >= 70)
router.post('/evaluate', authenticateToken, async (req: AuthRequest, res: Response) => {
  const {
    title,
    text,
    code,
    language,
    isCheating,
    examples,
    constraints,
    optimalTime,
    optimalSpace,
    optimalApproach,
    titleSlug,
  } = req.body;
  const userId = req.user?.id;

  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'Code submission cannot be empty' });
  }

  const langName = language || 'cpp';

  if (isCheating) {
    return res.json({
      score: 0,
      pointsAwarded: 0,
      alreadySolved: false,
      status: 'WRONG_ANSWER',
      feedback: 'Cheating detected: Tab switched or copy-pasted. Score forced to 0.',
      strengths: 'None — integrity violation recorded.',
      weaknesses: 'Academic integrity check failed.',
      improvements: 'Write solutions directly in the code editor.',
    });
  }

  try {
    const parsedExamples = examples
      ? (typeof examples === 'string' ? JSON.parse(examples) : examples)
      : undefined;
    const parsedConstraints = constraints
      ? (typeof constraints === 'string' ? JSON.parse(constraints) : constraints)
      : undefined;

    const result = await evaluateAnswer({
      questionTitle: title || 'Coding Practice',
      questionText: text || title || '',
      questionType: 'CODING',
      codeContent: code,
      language: langName,
      optimalTime,
      optimalSpace,
      optimalApproach,
      examples: Array.isArray(parsedExamples) ? parsedExamples : undefined,
      constraints: Array.isArray(parsedConstraints) ? parsedConstraints : undefined,
    });

    const isPassing = result.score >= 70;
    let pointsAwarded = 0;
    let alreadySolved = false;

    // 10 base points awarded on passing practice submission
    const potentialPoints = 10;

    if (userId) {
      const problemKey = (titleSlug || title || 'practice').toLowerCase().trim();

      // Check if candidate previously passed this exact problem
      const previousPasses = await prisma.auditLog.findMany({
        where: {
          userId,
          action: { in: ['PRACTICE_SUBMISSION', 'QUESTION_BANK_PRACTICE'] },
        },
      });

      const wasAlreadySolved = previousPasses.some(log => {
        try {
          const det = JSON.parse(log.details || '{}');
          const matchesTitle =
            (det.problemKey && det.problemKey === problemKey) ||
            (det.questionTitle && det.questionTitle.toLowerCase().trim() === (title || '').toLowerCase().trim());
          const isPassed = det.passed === true || det.isAccepted === true || (typeof det.score === 'number' && det.score >= 70);
          return matchesTitle && isPassed;
        } catch {
          return false;
        }
      });

      if (isPassing) {
        if (wasAlreadySolved) {
          alreadySolved = true;
          pointsAwarded = 0;
        } else {
          alreadySolved = false;
          pointsAwarded = potentialPoints;

          // Award calculated points and increment totalSolved
          await prisma.studentProfile.upsert({
            where: { userId },
            update: {
              points: { increment: potentialPoints },
              totalSolved: { increment: 1 },
              lastSeen: new Date(),
            },
            create: {
              userId,
              points: potentialPoints,
              totalSolved: 1,
            },
          });
        }
      }

      // Record submission audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'QUESTION_BANK_PRACTICE',
          details: JSON.stringify({
            problemKey,
            questionTitle: title,
            language: langName,
            score: result.score,
            passed: isPassing,
            alreadySolved,
            pointsAwarded,
            submittedAt: new Date().toISOString(),
          }),
        },
      }).catch(err => console.error('AuditLog practice create error:', err));
    }

    return res.json({
      score: result.score,
      pointsAwarded,
      alreadySolved,
      status: isPassing ? 'ACCEPTED' : 'WRONG_ANSWER',
      feedback: result.feedback || `Solution evaluated for ${langName}.`,
      strengths: result.strengths || `Syntax and logic evaluated for ${langName}.`,
      weaknesses: result.weaknesses || 'Verify edge cases and time complexity.',
      improvements: result.improvements || 'Review optimal solution approach.',
      testCaseResults: result.testCaseResults || [],
      referenceSolution: result.referenceSolution || req.body.referenceSolution || null,
      comparisonSummary: result.comparisonSummary || 'Function evaluated and compared against official reference solution.',
      optimalTime: result.optimalTime || optimalTime,
      optimalSpace: result.optimalSpace || optimalSpace,
      optimalApproach: result.optimalApproach || optimalApproach,
    });
  } catch (e: any) {
    console.error('QuestionBank evaluation error:', e);
    return res.status(500).json({ error: 'Evaluation failed: ' + (e.message || 'Unknown error') });
  }
});

// 3b. AI Hint Assistant Generation — returns genuine problem-aware hints
router.post('/hints', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { title, text, category, difficulty, language, optimalTime, optimalSpace, optimalApproach, guide, codeSnippet } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Problem title is required for generating hints' });
  }

  try {
    const hints = await generateProblemHints({
      title,
      text,
      category,
      difficulty,
      language,
      optimalTime,
      optimalSpace,
      optimalApproach,
      guide,
      codeSnippet,
    });

    return res.json({ hints });
  } catch (error: any) {
    console.error('Generate problem hints error:', error);
    return res.status(500).json({ error: 'Failed to generate hints' });
  }
});

// 3c. Dora AI Floating Assistant — Screen & Code Socratic Guidance
router.post('/dora-assistant', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { problemTitle, problemText, candidateCode, language, userMessage, chatHistory, modelProvider, userApiKey } = req.body;

  if (!problemTitle || !problemTitle.trim()) {
    return res.status(400).json({ error: 'Problem title is required for Dora AI Assistant' });
  }

  try {
    const reply = await askDoraAI({
      problemTitle,
      problemText,
      candidateCode,
      language,
      userMessage: userMessage || 'Help me build intuition for this problem!',
      chatHistory,
      modelProvider: modelProvider || 'qwen',
      userApiKey,
    });

    return res.json({ reply });
  } catch (error: any) {
    console.error('Dora AI Assistant error:', error);
    return res.status(500).json({ error: 'Dora AI Assistant failed to process request' });
  }
});

// 4. Update question
router.put('/:id', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;
  const { id } = req.params;
  const { title, text, category, difficulty, examples, constraints, code, optimalTime, optimalSpace, optimalApproach, guide, leetcodeId } = req.body;

  try {
    const existing = await prisma.questionBankItem.findFirst({ where: { id, companyId } });
    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const updated = await prisma.questionBankItem.update({
      where: { id },
      data: {
        title,
        text,
        category,
        difficulty: difficulty || existing.difficulty,
        examples: examples ? JSON.stringify(examples) : existing.examples,
        constraints: constraints ? JSON.stringify(constraints) : existing.constraints,
        code,
        optimalTime,
        optimalSpace,
        optimalApproach,
        guide,
        leetcodeId: leetcodeId ? Number(leetcodeId) : existing.leetcodeId,
      },
    });

    return res.json({ question: updated });
  } catch (error) {
    console.error('Update question bank item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Delete question
router.delete('/:id', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;
  const { id } = req.params;

  try {
    const existing = await prisma.questionBankItem.findFirst({ where: { id, companyId } });
    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await prisma.questionBankItem.delete({ where: { id } });
    return res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question bank item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
