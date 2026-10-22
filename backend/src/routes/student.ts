import { Router, Response } from 'express';
import { prisma } from '../services/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { evaluateAnswer } from '../services/ai';

const router = Router();

// 1. Submit a practice question answer with AI evaluation & submission record
router.post('/submit-practice', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { questionTitle, problemId, platform, difficulty, code, language, isAccepted, testCasesPassed, totalTestCases } = req.body;

  if (!questionTitle || !code) {
    return res.status(400).json({ error: 'Question title and code are required' });
  }

  try {
    // Run AI Evaluation
    const aiEval = await evaluateAnswer({
      questionTitle,
      questionText: questionTitle,
      questionType: 'CODING',
      codeContent: code,
      language: language || 'cpp',
    });

    const isPassed = isAccepted === true || (testCasesPassed && totalTestCases && testCasesPassed === totalTestCases);
    const score = isPassed ? Math.max(85, aiEval.score) : Math.min(60, aiEval.score);

    // Record real submission event in database with timestamp
    await prisma.auditLog.create({
      data: {
        userId: userId!,
        action: 'PRACTICE_SUBMISSION',
        details: JSON.stringify({
          problemId: problemId || `lc-${questionTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          questionTitle,
          platform: platform || (problemId?.startsWith('cp') ? 'Codeforces' : 'LeetCode'),
          difficulty: difficulty || 'MEDIUM',
          language,
          isAccepted: isPassed,
          passed: isPassed,
          testCasesPassed,
          totalTestCases,
          score,
          aiFeedback: aiEval.feedback,
        }),
      },
    });

    return res.json({
      success: true,
      score,
      status: isPassed ? 'ACCEPTED' : 'WRONG_ANSWER',
      feedback: aiEval.feedback,
      strengths: aiEval.strengths,
      weaknesses: aiEval.weaknesses,
      optimalApproach: aiEval.improvements,
    });
  } catch (error) {
    console.error('Practice submission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Dedicated Endpoint to Record Real Solved Submission Event
router.post('/record-submission', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { problemId, problemTitle, platform, difficulty, score, officialUrl } = req.body;

  if (!problemTitle) {
    return res.status(400).json({ error: 'problemTitle is required' });
  }

  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: userId!,
        action: 'PRACTICE_SUBMISSION',
        details: JSON.stringify({
          problemId: problemId || `p-${Date.now()}`,
          questionTitle: problemTitle,
          platform: platform || (problemId?.startsWith('cp') ? 'Codeforces' : 'LeetCode'),
          difficulty: difficulty || 'MEDIUM',
          score: score || 10,
          officialUrl,
          isAccepted: true,
          passed: true,
        }),
      },
    });

    return res.json({ success: true, submissionId: log.id, createdAt: log.createdAt });
  } catch (error) {
    console.error('Record submission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Dedicated Endpoint: Get Real Calendar Submissions Map & Solved Problems
router.get('/submission-calendar', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        action: {
          in: [
            'PRACTICE_SUBMISSION',
            'QUESTION_BANK_PRACTICE',
            'ARENA_CHALLENGE',
            'ARENA_MATCH',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const challenges = await prisma.challenge.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { challengerId: userId, challengerScore: { gte: 70 } },
          { challengedId: userId, challengedScore: { gte: 70 } },
          { winnerId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const submissionLog: Record<string, Array<{ id: string; title: string; platform: string; difficulty: string; score: number; officialUrl?: string; createdAt: string; solvedAt: string }>> = {};
    const solvedMap: Record<string, any> = {};

    logs.forEach((log) => {
      let details: any = {};
      try {
        details = JSON.parse(log.details || '{}');
      } catch (e) {}

      const isSolved =
        details.passed === true ||
        details.isAccepted === true ||
        (typeof details.score === 'number' && details.score >= 70);

      // Only count days on which at least 1 problem is actually solved
      if (!isSolved) return;

      const dateStr = log.createdAt.toISOString().split('T')[0]; // "YYYY-MM-DD"
      if (!submissionLog[dateStr]) {
        submissionLog[dateStr] = [];
      }

      const problemId = details.problemId || details.problemKey || log.id;
      if (submissionLog[dateStr].some((it) => it.id === problemId)) {
        return;
      }

      let platformName = details.platform;
      if (!platformName) {
        if (log.action === 'ARENA_CHALLENGE' || log.action === 'ARENA_MATCH') platformName = '1v1 Arena';
        else if (String(problemId).startsWith('cp-') || String(problemId).startsWith('cf-')) platformName = 'Codeforces';
        else platformName = 'LeetCode';
      }

      const item = {
        id: problemId,
        title: details.questionTitle || details.title || 'Coding Challenge',
        platform: platformName,
        difficulty: details.difficulty || 'MEDIUM',
        score: details.score || 10,
        officialUrl: details.officialUrl,
        createdAt: log.createdAt.toISOString(),
        solvedAt: dateStr,
      };

      submissionLog[dateStr].push(item);
      if (!solvedMap[problemId]) {
        solvedMap[problemId] = item;
      }
    });

    challenges.forEach((ch) => {
      const isChallenger = ch.challengerId === userId;
      const score = isChallenger ? (ch.challengerScore || 0) : (ch.challengedScore || 0);
      const isWinner = ch.winnerId === userId;
      const dateStr = (ch.endedAt || ch.createdAt).toISOString().split('T')[0];

      if (!submissionLog[dateStr]) {
        submissionLog[dateStr] = [];
      }

      const problemId = `arena-${ch.id}`;
      if (submissionLog[dateStr].some((it) => it.id === problemId || it.title.includes(ch.questionTitle))) {
        return;
      }

      const item = {
        id: problemId,
        title: `[Arena 1v1] ${ch.questionTitle}`,
        platform: '1v1 Arena',
        difficulty: ch.difficulty || 'MEDIUM',
        score: score >= 70 ? score : (isWinner ? 85 : 70),
        officialUrl: undefined,
        createdAt: (ch.endedAt || ch.createdAt).toISOString(),
        solvedAt: dateStr,
      };

      submissionLog[dateStr].push(item);
      if (!solvedMap[problemId]) {
        solvedMap[problemId] = item;
      }
    });

    const activeDaysCount = Object.keys(submissionLog).filter((d) => submissionLog[d].length > 0).length;

    // Calculate real consecutive days streak
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let streak = 0;
    let cursor = new Date(today);
    // If not solved today yet, check if yesterday was active
    if (!submissionLog[todayStr] || submissionLog[todayStr].length === 0) {
      if (submissionLog[yesterdayStr] && submissionLog[yesterdayStr].length > 0) {
        cursor = yesterday;
      } else {
        cursor = null as any;
      }
    }

    if (cursor) {
      while (true) {
        const dStr = cursor.toISOString().split('T')[0];
        if (submissionLog[dStr] && submissionLog[dStr].length > 0) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Month stats for current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const currentMonthPrefix = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
    const daysInCurrentMonth = new Date(currentYear, currentMonthNum, 0).getDate();

    const currentMonthMap: Record<number, number> = {};
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dStr = `${currentMonthPrefix}-${String(day).padStart(2, '0')}`;
      if (submissionLog[dStr] && submissionLog[dStr].length > 0) {
        currentMonthMap[day] = submissionLog[dStr].length;
      }
    }
    const currentMonthActiveDays = Object.keys(currentMonthMap).length;

    return res.json({
      success: true,
      submissionLog,
      solvedList: Object.values(solvedMap),
      activeDaysCount,
      totalSolved: Object.keys(solvedMap).length,
      streak,
      currentMonthMap,
      currentMonthActiveDays,
      daysInCurrentMonth,
      currentDay: now.getDate(),
      currentMonthName: now.toLocaleString('default', { month: 'short' }),
      currentYear,
    });
  } catch (error) {
    console.error('Get submission calendar error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Dedicated Endpoint: Toggle Review Bookmark
router.post('/toggle-review', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { problemId, problemTitle, platform, difficulty, officialUrl, note } = req.body;

  if (!problemId) {
    return res.status(400).json({ error: 'problemId is required' });
  }

  try {
    const existing = await prisma.auditLog.findFirst({
      where: {
        userId,
        action: 'MARK_FOR_REVIEW',
        details: { contains: problemId },
      },
    });

    if (existing) {
      // Remove bookmark
      await prisma.auditLog.delete({ where: { id: existing.id } });
      return res.json({ success: true, isBookmarked: false });
    } else {
      // Add bookmark
      await prisma.auditLog.create({
        data: {
          userId: userId!,
          action: 'MARK_FOR_REVIEW',
          details: JSON.stringify({
            problemId,
            problemTitle: problemTitle || problemId,
            platform: platform || 'LeetCode',
            difficulty: difficulty || 'MEDIUM',
            officialUrl,
            note: note || '',
            markedAt: new Date().toISOString().split('T')[0],
          }),
        },
      });
      return res.json({ success: true, isBookmarked: true });
    }
  } catch (error) {
    console.error('Toggle review error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Dedicated Endpoint: Get All Marked Review Bookmarks
router.get('/review-items', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        action: 'MARK_FOR_REVIEW',
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = logs.map((l) => {
      let details: any = {};
      try { details = JSON.parse(l.details || '{}'); } catch (e) {}
      return {
        id: details.problemId || l.id,
        title: details.problemTitle || details.title || 'Review Item',
        platform: details.platform || 'LeetCode',
        difficulty: details.difficulty || 'MEDIUM',
        officialUrl: details.officialUrl,
        note: details.note || '',
        markedAt: details.markedAt || l.createdAt.toISOString().split('T')[0],
      };
    });

    return res.json({ success: true, items });
  } catch (error) {
    console.error('Get review items error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Get Student Practice History
router.get('/practice-history', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        action: 'PRACTICE_SUBMISSION',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const history = logs.map(l => {
      let details = {};
      try { details = JSON.parse(l.details || '{}'); } catch (e) {}
      return {
        id: l.id,
        createdAt: l.createdAt,
        ...details,
      };
    });

    return res.json({ history });
  } catch (error) {
    console.error('Practice history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Get Total Points Earned for Student
router.get('/points-summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const userEmail = req.user?.email;

  try {
    // 1. Practice Submissions (auditLog)
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        action: {
          in: ['PRACTICE_SUBMISSION', 'QUESTION_BANK_PRACTICE', 'ARENA_CHALLENGE', 'ARENA_MATCH'],
        },
      },
    });

    let practicePoints = 0;
    let solvedProblemsCount = 0;
    logs.forEach(l => {
      let details: any = {};
      try { details = JSON.parse(l.details || '{}'); } catch (e) {}
      const isPassed = details.passed === true || details.isAccepted === true || (typeof details.score === 'number' && details.score >= 60);
      if (isPassed) {
        solvedProblemsCount++;
        const sc = typeof details.score === 'number' ? details.score : 20;
        practicePoints += Math.max(10, Math.round(sc / 2));
      }
    });

    // 2. Arena 1v1 challenges
    const arenaMatches = await prisma.challenge.findMany({
      where: {
        status: 'COMPLETED',
        OR: [{ challengerId: userId }, { challengedId: userId }],
      },
    });

    let arenaPoints = 0;
    arenaMatches.forEach(ch => {
      if (ch.winnerId === userId) {
        arenaPoints += 50; // Win bonus
      } else {
        arenaPoints += 20; // Participation points
      }
    });

    // 3. Completed Interview Sessions & Assessments
    let assessmentPoints = 0;
    if (userEmail) {
      const candidateRecords = await prisma.candidate.findMany({
        where: { email: userEmail },
        include: {
          sessions: {
            where: { status: 'COMPLETED' },
            include: { answers: { include: { evaluation: true } } },
          },
        },
      });

      candidateRecords.forEach(c => {
        c.sessions.forEach(s => {
          s.answers.forEach(a => {
            const sc = a.evaluation?.overrideScore ?? a.evaluation?.score ?? 0;
            if (sc >= 50) {
              assessmentPoints += Math.round(sc / 2);
            }
          });
        });
      });
    }

    // Canonical points from studentProfile (single source of truth)
    let profile = userId ? await prisma.studentProfile.findUnique({ where: { userId } }) : null;
    let totalPoints = profile?.points ?? 0;

    // If profile points is 0 but user has earned points from submissions/arena, backfill once
    const earnedPoints = practicePoints + arenaPoints + assessmentPoints;
    if (totalPoints === 0 && earnedPoints > 0 && userId) {
      totalPoints = earnedPoints;
      await prisma.studentProfile.upsert({
        where: { userId },
        update: { points: earnedPoints },
        create: { userId, points: earnedPoints },
      });
    }

    let tier = 'Bronze Explorer';
    if (totalPoints >= 1000) tier = 'Grandmaster';
    else if (totalPoints >= 500) tier = 'Diamond Elite';
    else if (totalPoints >= 250) tier = 'Gold Champion';
    else if (totalPoints >= 150) tier = 'Silver Coder';

    return res.json({
      success: true,
      totalPoints,
      tier,
      solvedProblemsCount,
      arenaMatchesCount: arenaMatches.length,
      breakdown: {
        practicePoints,
        arenaPoints,
        assessmentPoints,
      },
    });
  } catch (error) {
    console.error('Points summary error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
