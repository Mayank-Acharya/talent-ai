import { Router, Response } from 'express';
import { prisma } from '../services/db';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to ensure we always have a valid existing Company ID (prevents foreign key errors if DB re-seeded)
async function getValidCompanyId(reqCompanyId?: string | null): Promise<string> {
  if (reqCompanyId) {
    const existingCompany = await prisma.company.findUnique({ where: { id: reqCompanyId } });
    if (existingCompany) return existingCompany.id;
  }

  const firstCompany = await prisma.company.findFirst();
  if (firstCompany) return firstCompany.id;

  const newCompany = await prisma.company.create({
    data: {
      name: 'TalentAI Systems',
      primaryColor: '#2563eb',
    },
  });
  return newCompany.id;
}

// Helper to format question data safely
function formatQuestionData(q: any, interviewId: string) {
  return {
    interviewId,
    title: q.title || (q.text ? q.text.slice(0, 60) : 'Question'),
    text: q.text || q.title || 'Please complete the question instructions.',
    type: q.type || 'HR',
    difficulty: (q.difficulty || 'MEDIUM').toUpperCase(),
    timeLimitSeconds: Number(q.timeLimitSeconds) || 120,
    codeSnippet: q.codeSnippet || null,
    testCases: q.testCases ? (typeof q.testCases === 'string' ? q.testCases : JSON.stringify(q.testCases)) : null,
    expectedGuide: q.expectedGuide || null,
    examples: q.examples ? (typeof q.examples === 'string' ? q.examples : JSON.stringify(q.examples)) : null,
    constraints: q.constraints ? (typeof q.constraints === 'string' ? q.constraints : JSON.stringify(q.constraints)) : null,
    optimalTime: q.optimalTime || null,
    optimalSpace: q.optimalSpace || null,
    optimalApproach: q.optimalApproach || null,
    leetcodeId: q.leetcodeId ? Number(q.leetcodeId) : null,
    leetcodeSlug: q.leetcodeSlug || null,
  };
}

// 1. List all interviews
router.get('/', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'INTERVIEWER', 'STUDENT']), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = await getValidCompanyId(req.user?.companyId);

    const interviews = await prisma.interview.findMany({
      where: { companyId },
      include: {
        questions: true,
        _count: {
          select: { questions: true, sessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ interviews });
  } catch (error) {
    console.error('List interviews error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Create interview with questions
router.post('/', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'STUDENT']), async (req: AuthRequest, res: Response) => {
  const { title, description, durationMinutes, isTemplate, questions } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Interview title is required' });
  }

  try {
    const companyId = await getValidCompanyId(req.user?.companyId);

    const interview = await prisma.$transaction(async (tx) => {
      // Create parent interview
      const newInterview = await tx.interview.create({
        data: {
          title: title.trim(),
          description: description ? description.trim() : null,
          durationMinutes: Number(durationMinutes) || 30,
          isTemplate: isTemplate !== undefined ? Boolean(isTemplate) : true,
          companyId,
        },
      });

      // Create associated questions if provided
      if (Array.isArray(questions) && questions.length > 0) {
        await tx.question.createMany({
          data: questions.map((q: any) => formatQuestionData(q, newInterview.id)),
        });
      }

      return newInterview;
    });

    // Fetch complete object with questions
    const completeInterview = await prisma.interview.findUnique({
      where: { id: interview.id },
      include: { questions: true },
    });

    return res.status(201).json({ interview: completeInterview });
  } catch (error: any) {
    console.error('Create interview error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create interview template' });
  }
});

// 3. Get single interview details
router.get('/:id', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'INTERVIEWER', 'STUDENT']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const companyId = await getValidCompanyId(req.user?.companyId);

    const interview = await prisma.interview.findFirst({
      where: { id, companyId },
      include: {
        questions: true,
        sessions: {
          include: {
            candidate: true,
          },
        },
      },
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    return res.json({ interview });
  } catch (error) {
    console.error('Get interview error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Update interview and recreate its questions
router.put('/:id', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'STUDENT']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, durationMinutes, isTemplate, questions } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Interview title is required' });
  }

  try {
    const companyId = await getValidCompanyId(req.user?.companyId);

    // Check ownership
    const existing = await prisma.interview.findFirst({ where: { id, companyId } });
    if (!existing) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update basic fields
      const interview = await tx.interview.update({
        where: { id },
        data: {
          title: title.trim(),
          description: description ? description.trim() : null,
          durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
          isTemplate: isTemplate !== undefined ? Boolean(isTemplate) : undefined,
        },
      });

      // If questions are provided, delete previous questions and write new ones
      if (Array.isArray(questions)) {
        await tx.question.deleteMany({ where: { interviewId: id } });

        if (questions.length > 0) {
          await tx.question.createMany({
            data: questions.map((q: any) => formatQuestionData(q, id)),
          });
        }
      }

      return interview;
    });

    const completeUpdated = await prisma.interview.findUnique({
      where: { id: updated.id },
      include: { questions: true },
    });

    return res.json({ interview: completeUpdated });
  } catch (error: any) {
    console.error('Update interview error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update interview' });
  }
});

// 5. Delete interview
router.delete('/:id', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'STUDENT']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const companyId = await getValidCompanyId(req.user?.companyId);

    const existing = await prisma.interview.findFirst({ where: { id, companyId } });
    if (!existing) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    await prisma.interview.delete({ where: { id } });
    return res.json({ success: true, message: 'Interview deleted successfully' });
  } catch (error) {
    console.error('Delete interview error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Send Candidate Interview Invitation via Mail, Phone/SMS, or WhatsApp & Create Session Link
router.post('/:id/send-invite', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'INTERVIEWER', 'STUDENT']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { candidateName, candidateEmail, candidatePhone, subject, message, expiresDays, dispatchMethod } = req.body;

  if (!candidateName || !candidateName.trim()) {
    return res.status(400).json({ error: 'Candidate name is required' });
  }

  const cleanEmail = candidateEmail ? candidateEmail.trim().toLowerCase() : '';
  const cleanPhone = candidatePhone ? candidatePhone.trim() : '';

  if (!cleanEmail && !cleanPhone) {
    return res.status(400).json({ error: 'Please provide either a Candidate Email address or Phone number to send the invitation.' });
  }

  try {
    const crypto = require('crypto');
    const { sendInterviewInviteEmail } = require('../services/mailer');
    const { sendInterviewInviteSMS } = require('../services/sms');
    const companyId = await getValidCompanyId(req.user?.companyId);

    const interview = await prisma.interview.findFirst({
      where: { id, companyId },
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview template not found' });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const orgName = company?.name || 'TalentAI Systems';
    const cleanName = candidateName.trim();

    // Fallback email identifier if candidate only has a phone number
    const effectiveEmail = cleanEmail || `${cleanPhone.replace(/[^\d]/g, '') || Date.now()}@candidate.talentai.internal`;

    // Find or create candidate record
    let candidate = await prisma.candidate.findFirst({
      where: {
        companyId,
        OR: [
          { email: effectiveEmail },
          ...(cleanPhone ? [{ phone: cleanPhone }] : []),
          ...(cleanEmail ? [{ email: cleanEmail }] : [])
        ]
      },
    });

    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: {
          name: cleanName,
          email: effectiveEmail,
          phone: cleanPhone || null,
          companyId,
          status: 'INVITED',
        },
      });
    } else {
      candidate = await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          name: cleanName,
          phone: cleanPhone || candidate.phone,
          status: 'INVITED',
        },
      });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const days = expiresDays ? Number(expiresDays) : 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const session = await prisma.interviewSession.create({
      data: {
        token,
        candidateId: candidate.id,
        interviewId: interview.id,
        status: 'PENDING',
        expiresAt,
      },
    });

    // Create Plagiarism Report container
    await prisma.plagiarismReport.create({
      data: {
        sessionId: session.id,
      },
    });

    const inviteUrl = `/session/${token}`;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const fullInviteUrl = `${baseUrl.replace(/\/$/, '')}${inviteUrl}`;

    let mailResult: any = null;
    let smsResult: any = null;

    // 1. Send via Email if cleanEmail is present
    if (cleanEmail) {
      const emailSubject = subject || `🎉 Invitation to Technical Assessment: ${interview.title} at ${orgName}`;
      const emailMessage = message || `Hello ${cleanName}! 🎉\n\nWe are thrilled to invite you to take the technical assessment for ${interview.title} at ${orgName}!\n\nWe are excited to evaluate your problem-solving abilities and software engineering skills. Please click the button below whenever you are ready to begin your session.\n\nBest of luck, and we can't wait to review your submission!`;

      mailResult = await sendInterviewInviteEmail({
        to: cleanEmail,
        candidateName: cleanName,
        orgName,
        interviewTitle: interview.title,
        subject: emailSubject,
        messageText: emailMessage,
        inviteUrl: fullInviteUrl,
      });
    }

    // 2. Send via Phone / SMS / WhatsApp if cleanPhone is present
    if (cleanPhone) {
      smsResult = await sendInterviewInviteSMS({
        candidatePhone: cleanPhone,
        candidateName: cleanName,
        orgName,
        interviewTitle: interview.title,
        inviteUrl: fullInviteUrl,
        customMessage: message,
      });
    }

    const finalMessage = mailResult?.sent && smsResult?.sent
      ? `Invitation sent successfully via Email to ${cleanEmail} and prepared for Phone ${cleanPhone}!`
      : mailResult?.sent
      ? mailResult.message
      : smsResult?.sent
      ? smsResult.message
      : `Invitation link generated for ${cleanName}!`;

    return res.status(201).json({
      success: true,
      message: finalMessage,
      token,
      session,
      candidate,
      inviteUrl,
      fullInviteUrl,
      emailSent: mailResult?.sent || false,
      previewUrl: mailResult?.previewUrl,
      realSmtpUsed: mailResult?.realSmtpUsed || false,
      smsResult: smsResult ? {
        sent: smsResult.sent,
        message: smsResult.message,
        whatsappUrl: smsResult.whatsappUrl,
        smsUrl: smsResult.smsUrl,
        formattedText: smsResult.formattedText,
        realTwilioUsed: smsResult.realTwilioUsed,
      } : null,
    });
  } catch (error: any) {
    console.error('Send invite error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Alias for backward compatibility
router.post('/:id/generate-link', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'INTERVIEWER', 'STUDENT']), async (req: AuthRequest, res: Response) => {
  const { candidateName, candidateEmail, candidatePhone } = req.body;
  if (!candidateName || (!candidateEmail && !candidatePhone)) {
    return res.status(400).json({ error: 'Candidate name and at least an email or phone number are required.' });
  }
  req.url = `/${req.params.id}/send-invite`;
  return (router as any).handle(req, res);
});

export default router;
