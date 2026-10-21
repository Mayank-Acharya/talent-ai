import { Router, Response } from 'express';
import multer from 'multer';
import { prisma } from '../services/db';
import { evaluateAnswer } from '../services/ai';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads/';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `recording-${uniqueSuffix}.webm`);
  }
});
const upload = multer({ storage });
const router = Router();

// 1. Validate token and load session metadata (with questions)
router.get('/validate/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { token },
      include: {
        candidate: {
          select: { name: true, email: true },
        },
        interview: {
          include: {
            questions: {
              select: {
                id: true,
                title: true,
                text: true,
                type: true,
                difficulty: true,
                timeLimitSeconds: true,
                codeSnippet: true,
                testCases: true,
                expectedGuide: true,
                examples: true,
                constraints: true,
                optimalTime: true,
                optimalSpace: true,
                optimalApproach: true,
                leetcodeId: true,
                leetcodeSlug: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Invalid interview session token' });
    }

    if (session.status === 'COMPLETED') {
      return res.status(400).json({ error: 'This interview session has already been completed.' });
    }

    if (session.status === 'EXPIRED' || new Date() > session.expiresAt) {
      if (session.status !== 'EXPIRED') {
        await prisma.interviewSession.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        });
      }
      return res.status(400).json({ error: 'This interview session link has expired.' });
    }

    return res.json({ session });
  } catch (error) {
    console.error('Validate session token error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Start session
router.post('/start/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const session = await prisma.interviewSession.findUnique({ where: { token } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'COMPLETED' || session.status === 'EXPIRED') {
      return res.status(400).json({ error: 'Session cannot be started' });
    }

    const updated = await prisma.interviewSession.update({
      where: { token },
      data: {
        status: 'STARTED',
        startedAt: new Date(),
      },
    });

    return res.json({ session: updated });
  } catch (error) {
    console.error('Start session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Submit answer (supports multipart upload for webcam video recording)
router.post('/submit-answer/:token', upload.single('video'), async (req, res) => {
  const { token } = req.params;
  const { questionId, answerText, codeContent } = req.body;
  const videoFile = req.file;

  if (!questionId) {
    return res.status(400).json({ error: 'Question ID is required' });
  }

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { token },
      include: { interview: true },
    });

    if (!session || session.status !== 'STARTED') {
      return res.status(400).json({ error: 'Interview session must be in progress' });
    }

    // Find the question to get rubrics & text
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Create or update answer
    const videoPath = videoFile ? videoFile.path.replace(/\\/g, '/') : null;

    // Call AI Evaluation
    const promptText = answerText || (videoFile ? 'Simulated video transcription: Candidates explained the concept of OOP and APIs.' : '');
    const aiEvaluation = await evaluateAnswer({
      questionTitle: question.title || undefined,
      questionText: question.text,
      questionType: question.type,
      answerText: promptText,
      codeContent: codeContent || undefined,
      optimalTime: (question as any).optimalTime || undefined,
      optimalSpace: (question as any).optimalSpace || undefined,
      optimalApproach: (question as any).optimalApproach || undefined,
      examples: (question as any).examples ? (typeof (question as any).examples === 'string' ? JSON.parse((question as any).examples) : (question as any).examples) : undefined,
      constraints: (question as any).constraints ? (typeof (question as any).constraints === 'string' ? JSON.parse((question as any).constraints) : (question as any).constraints) : undefined,
    });

    // Write to DB inside transaction
    const answer = await prisma.$transaction(async (tx) => {
      // Delete old answer for this question and session if candidate retried
      const existing = await tx.answer.findFirst({
        where: { sessionId: session.id, questionId },
      });

      if (existing) {
        await tx.answer.delete({ where: { id: existing.id } });
      }

      const newAns = await tx.answer.create({
        data: {
          sessionId: session.id,
          questionId,
          videoPath,
          answerText: promptText,
          codeContent,
        },
      });

      // Write evaluation
      await tx.evaluation.create({
        data: {
          answerId: newAns.id,
          score: aiEvaluation.score,
          feedback: aiEvaluation.feedback,
          strengths: aiEvaluation.strengths,
          weaknesses: aiEvaluation.weaknesses,
          improvements: aiEvaluation.improvements,
        },
      });

      return newAns;
    });

    return res.json({
      success: true,
      answer,
      evaluation: aiEvaluation,
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Track browser/camera plagiarism violations
router.post('/plagiarism/:token', async (req, res) => {
  const { token } = req.params;
  const { type, details } = req.body; // e.g. "TAB_SWITCH", "COPY_PASTE", "FULLSCREEN_EXIT"

  if (!type) {
    return res.status(400).json({ error: 'Violation type required' });
  }

  try {
    const session = await prisma.interviewSession.findUnique({ where: { token } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const report = await prisma.plagiarismReport.findUnique({
      where: { sessionId: session.id },
    });

    if (!report) {
      return res.status(404).json({ error: 'Plagiarism report container not found' });
    }

    let tabSwitchCount = report.tabSwitchCount;
    let copyPasteCount = report.copyPasteCount;
    let exitFullScreenCount = report.exitFullScreenCount;

    if (type === 'TAB_SWITCH') tabSwitchCount++;
    if (type === 'COPY_PASTE') copyPasteCount++;
    if (type === 'FULLSCREEN_EXIT') exitFullScreenCount++;

    const log = JSON.parse(report.violationsLog);
    log.push({
      timestamp: new Date().toISOString(),
      type,
      details: details || 'No additional details',
    });

    const updated = await prisma.plagiarismReport.update({
      where: { sessionId: session.id },
      data: {
        tabSwitchCount,
        copyPasteCount,
        exitFullScreenCount,
        violationsLog: JSON.stringify(log),
      },
    });

    return res.json({ success: true, report: updated });
  } catch (error) {
    console.error('Track plagiarism error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Complete session
router.post('/complete/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { token },
      include: {
        candidate: {
          include: {
            company: {
              include: {
                users: {
                  where: { role: { in: ['COMPANY_ADMIN', 'RECRUITER'] } },
                },
              },
            },
          },
        },
        interview: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updated = await prisma.interviewSession.update({
      where: { token },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Notify recruiters/admins in the company
    const users = session.candidate.company.users;
    if (users.length > 0) {
      await prisma.notification.createMany({
        data: users.map(user => ({
          title: 'Candidate Completed Interview',
          message: `Candidate ${session.candidate.name} has completed the "${session.interview.title}" interview. AI screening scores are now available.`,
          userId: user.id,
        })),
      });
    }

    return res.json({ success: true, session: updated });
  } catch (error) {
    console.error('Complete session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Upload Full Session Video Recording
router.post('/upload-video/:token', upload.single('video'), async (req, res) => {
  const { token } = req.params;
  const videoFile = req.file;

  if (!videoFile) {
    return res.status(400).json({ error: 'Video file is required' });
  }

  const normalizedPath = videoFile.path.replace(/\\/g, '/');

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { token },
      include: {
        answers: true,
        interview: { include: { questions: true } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Attach videoPath to all answers of this session that don't have one
    if (session.answers.length > 0) {
      await prisma.answer.updateMany({
        where: { sessionId: session.id, videoPath: null },
        data: { videoPath: normalizedPath },
      });
      // Also ensure the primary/first answer has it
      await prisma.answer.update({
        where: { id: session.answers[0].id },
        data: { videoPath: normalizedPath },
      });
    } else if (session.interview?.questions?.length > 0) {
      await prisma.answer.create({
        data: {
          sessionId: session.id,
          questionId: session.interview.questions[0].id,
          videoPath: normalizedPath,
          answerText: 'Full continuous session video recording.',
        },
      });
    }

    return res.json({ success: true, videoPath: normalizedPath });
  } catch (error) {
    console.error('Upload session video error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Delete Session
router.delete('/:id', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'STUDENT']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const companyId = req.user?.companyId;

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id },
      include: {
        candidate: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (req.user?.role !== 'STUDENT' && companyId && session.candidate.companyId && session.candidate.companyId !== companyId) {
      return res.status(403).json({ error: 'Unauthorized to delete this session' });
    }
    if (req.user?.role === 'STUDENT' && session.candidate.email !== req.user.email) {
      return res.status(403).json({ error: 'Unauthorized to delete this session' });
    }

    await prisma.interviewSession.delete({
      where: { id },
    });

    return res.json({ success: true, message: 'Interview session deleted successfully' });
  } catch (error: any) {
    console.error('Delete session error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete session' });
  }
});

// 8. Bulk Delete Sessions
router.post('/bulk-delete', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'STUDENT']), async (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No session IDs provided' });
  }

  try {
    for (const id of ids) {
      try {
        await prisma.interviewSession.delete({ where: { id } });
      } catch (err) {}
    }
    return res.json({ success: true, count: ids.length, message: `${ids.length} session(s) deleted successfully` });
  } catch (error: any) {
    console.error('Bulk delete sessions error:', error);
    return res.status(500).json({ error: error.message || 'Failed to bulk delete sessions' });
  }
});

export default router;
