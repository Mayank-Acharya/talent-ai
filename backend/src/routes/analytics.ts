import { Router, Response } from 'express';
import { prisma } from '../services/db';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Get company dashboard analytics
router.get('/', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'INTERVIEWER']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;

  try {
    // 1. Total Candidates count
    const totalCandidates = await prisma.candidate.count({ where: { companyId } });

    // 2. Candidate Status breakdown (ATS pipeline funnel)
    const pipelineCounts = await prisma.candidate.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { _all: true },
    });

    const pipelineData = {
      NEW: 0,
      IN_REVIEW: 0,
      SHORTLISTED: 0,
      REJECTED: 0,
      INTERVIEW_SCHEDULED: 0,
      OFFERED: 0,
      HIRED: 0,
    };

    pipelineCounts.forEach(item => {
      const status = item.status as keyof typeof pipelineData;
      if (pipelineData[status] !== undefined) {
        pipelineData[status] = item._count._all;
      }
    });

    // 3. Interview session completions vs invitations
    const totalSessions = await prisma.interviewSession.count({
      where: {
        interview: { companyId },
      },
    });

    const completedSessions = await prisma.interviewSession.count({
      where: {
        interview: { companyId },
        status: 'COMPLETED',
      },
    });

    const pendingSessions = await prisma.interviewSession.count({
      where: {
        interview: { companyId },
        status: 'PENDING',
      },
    });

    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    // 4. Average AI evaluation score
    // Gather all evaluations associated with this company
    const evaluations = await prisma.evaluation.findMany({
      where: {
        answer: {
          session: {
            interview: { companyId },
          },
        },
      },
      select: { score: true },
    });

    const averageScore = evaluations.length > 0
      ? Math.round(evaluations.reduce((acc, curr) => acc + curr.score, 0) / evaluations.length)
      : 0;

    // 5. Score distribution (for charts)
    const scoreRanges = {
      '0-50': 0,
      '51-70': 0,
      '71-85': 0,
      '86-100': 0,
    };

    evaluations.forEach(ev => {
      if (ev.score <= 50) scoreRanges['0-50']++;
      else if (ev.score <= 70) scoreRanges['51-70']++;
      else if (ev.score <= 85) scoreRanges['71-85']++;
      else scoreRanges['86-100']++;
    });

    // 6. Recent interview activities
    const recentSessions = await prisma.interviewSession.findMany({
      where: {
        interview: { companyId },
      },
      include: {
        candidate: {
          select: { name: true, email: true },
        },
        interview: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 7. Recent notifications for the recruiter user
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user?.id! },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return res.json({
      metrics: {
        totalCandidates,
        totalSessions,
        completedSessions,
        pendingSessions,
        completionRate,
        averageScore,
      },
      pipeline: pipelineData,
      scoreDistribution: [
        { range: '0-50 Low Fit', count: scoreRanges['0-50'] },
        { range: '51-70 Average Fit', count: scoreRanges['51-70'] },
        { range: '71-85 High Fit', count: scoreRanges['71-85'] },
        { range: '86-100 Elite Fit', count: scoreRanges['86-100'] },
      ],
      recentSessions,
      notifications,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
