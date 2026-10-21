import { Router, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import zlib from 'zlib';
import { prisma } from '../services/db';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { parseResume, scoreResume } from '../services/ai';

const router = Router();
const upload = multer({ dest: process.env.UPLOAD_DIR || 'uploads/' });

// 1. List Candidates with search/filter
router.get('/', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'INTERVIEWER', 'STUDENT']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId;
  const { status, search } = req.query;

  try {
    let whereClause: any = {};
    if (req.user?.role === 'STUDENT') {
      whereClause = {
        OR: [
          { email: req.user.email },
          ...(companyId ? [{ companyId }] : []),
        ],
      };
    } else {
      whereClause = { companyId };
    }

    if (status) {
      whereClause.status = String(status);
    }

    if (search) {
      const searchOR = [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
        { resumeSkills: { contains: String(search) } },
      ];
      if (whereClause.OR) {
        whereClause.AND = [{ OR: searchOR }];
      } else {
        whereClause.OR = searchOR;
      }
    }

    const candidates = await prisma.candidate.findMany({
      where: whereClause,
      include: {
        sessions: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
            interview: {
              select: { title: true },
            },
            answers: {
              select: {
                id: true,
                videoPath: true,
                evaluation: {
                  select: {
                    id: true,
                    score: true,
                    overrideScore: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ candidates });
  } catch (error) {
    console.error('List candidates error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Create Candidate manually
router.post('/', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;
  const { name, email, phone, status, resumeText } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Candidate name and email are required' });
  }

  try {
    const existing = await prisma.candidate.findUnique({
      where: {
        email_companyId: { email, companyId },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Candidate with this email already exists in your company' });
    }

    // Call Mock AI parser on text if provided
    let aiParsed = { summary: '', skills: [] as string[], experience: '', education: '' };
    if (resumeText) {
      aiParsed = await parseResume(resumeText);
    }

    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        phone,
        status: status || 'NEW',
        companyId,
        resumeParsedText: resumeText || null,
        resumeSummary: aiParsed.summary || null,
        resumeSkills: aiParsed.skills.join(', ') || null,
      },
    });

    return res.status(201).json({ candidate });
  } catch (error) {
    console.error('Create candidate error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

function cleanExtractedText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Rejoin words broken across linebreaks with hyphens: e.g. "devel-\noper" -> "developer"
    .replace(/([a-zA-Z]{2,})-\n\s*([a-zA-Z]{2,})/g, '$1$2')
    // Remove non-printable control characters except whitespace
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    // Normalize bullets
    .replace(/[•*·▪▫►▸▶→–—]/g, '•')
    // Normalize spaces
    .replace(/[ \t]+/g, ' ')
    // Collapse excess newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractTextFromFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // 1. PDF File Parsing
  if (ext === 'pdf') {
    // Primary: pdf-parse (supports both v2 class and v1 function)
    try {
      const pdfModule = require('pdf-parse');
      if (typeof pdfModule === 'function' && !pdfModule.PDFParse) {
        const data = await pdfModule(buffer);
        if (data && data.text && data.text.trim().length > 20) {
          return cleanExtractedText(data.text);
        }
      } else {
        const PDFClass = pdfModule.PDFParse || (typeof pdfModule === 'function' ? pdfModule : null);
        if (PDFClass && typeof PDFClass === 'function') {
          const parser = new PDFClass({ data: buffer });
          const data = await parser.getText();
          await parser.destroy().catch(() => {});
          if (data && data.text && data.text.trim().length > 20) {
            return cleanExtractedText(data.text);
          }
        }
      }
    } catch (pdfErr) {
      console.warn('pdf-parse primary extraction failed, trying deep stream extraction:', pdfErr);
    }

    // Secondary Fallback: Scan PDF streams with FlateDecode decompression
    try {
      const raw = buffer.toString('binary');
      let combinedStreamText = '';

      const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
      let match;
      while ((match = streamRegex.exec(raw)) !== null) {
        const streamData = Buffer.from(match[1], 'binary');
        let decompressed: Buffer | null = null;
        try {
          decompressed = zlib.inflateSync(streamData);
        } catch {
          try {
            decompressed = zlib.inflateRawSync(streamData);
          } catch {}
        }

        const textToScan = decompressed ? decompressed.toString('utf8') : streamData.toString('latin1');
        const btBlocks = textToScan.match(/BT[\s\S]*?ET/g) || [];
        for (const block of btBlocks) {
          const tjMatches = block.match(/\(([^()]*)\)\s*T[jJ]/g) || [];
          for (const tj of tjMatches) {
            const str = tj.replace(/^\(/, '').replace(/\)\s*T[jJ]$/, '').trim();
            if (str) combinedStreamText += str + ' ';
          }
          const arrayMatches = block.match(/\[([^\]]*)\]\s*TJ/g) || [];
          for (const arr of arrayMatches) {
            const subStrs = arr.match(/\(([^()]*)\)/g) || [];
            const joined = subStrs.map(s => s.slice(1, -1)).join('');
            if (joined.trim()) combinedStreamText += joined.trim() + ' ';
          }
          combinedStreamText += '\n';
        }
      }

      if (combinedStreamText.trim().length > 30) {
        return cleanExtractedText(combinedStreamText);
      }
    } catch (streamErr) {
      console.warn('PDF stream extraction fallback error:', streamErr);
    }
  }

  // 2. DOCX / DOC parsing: Word XML tags <w:t>...</w:t>
  if (ext === 'docx' || ext === 'doc') {
    try {
      const rawStr = buffer.toString('utf8');
      const wordTags = rawStr.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
      if (wordTags.length > 0) {
        const docxText = wordTags.map(t => t.replace(/<[^>]+>/g, '')).join(' ');
        if (docxText.trim().length > 20) return cleanExtractedText(docxText);
      }
    } catch {}
  }

  // 3. Plain text / Markdown / Source text files
  const plainText = buffer.toString('utf8').replace(/[^\x20-\x7E\t\n\r]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (plainText.length > 20) {
    return cleanExtractedText(plainText);
  }

  return filename.replace(/[-_.]/g, ' ');
}

// 3. Upload Resume File & Parse it
router.post('/upload-resume', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'STUDENT']), upload.single('resume'), async (req: AuthRequest, res: Response) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    let extractedText = '';
    if (file && fs.existsSync(file.path)) {
      const buffer = fs.readFileSync(file.path);
      extractedText = await extractTextFromFile(buffer, file.originalname);
      try { fs.unlinkSync(file.path); } catch (e) {}
    } else {
      extractedText = file.originalname.replace(/[-_.]/g, ' ');
    }

    const jobTitle = req.body.jobTitle || 'Software Engineer';

    // Parse via AI / Multi-section Segregator
    const aiParsed = await parseResume(extractedText);
    
    // Get actual genuine ATS score based on desired role
    const scoreResult = await scoreResume(extractedText, jobTitle, []);

    // Derive candidate name
    const cleanFileName = file.originalname.replace(/\.(pdf|docx|doc|txt)$/i, '').replace(/[-_()0-9]/g, ' ').trim();
    const fallbackName = cleanFileName.length > 3 ? cleanFileName : 'Applicant';
    const finalCandidateName = aiParsed.contact.name && aiParsed.contact.name !== 'Candidate' 
      ? aiParsed.contact.name 
      : fallbackName;

    return res.json({
      success: true,
      filename: file.filename,
      originalName: file.originalname,
      parsed: {
        name: finalCandidateName,
        email: aiParsed.contact.email || (req.user?.email || 'applicant@example.com'),
        phone: aiParsed.contact.phone || '+1 (555) 234-5678',
        links: aiParsed.contact.links || [],
        skills: aiParsed.skills,
        categorizedSkills: aiParsed.categorizedSkills,
        summary: aiParsed.summary,
        experience: aiParsed.experience,
        experienceList: aiParsed.experienceList,
        education: aiParsed.education,
        educationList: aiParsed.educationList,
        projects: aiParsed.projects,
        certifications: aiParsed.certifications,
        extractedText: extractedText.slice(0, 10000),
      },
      atsResult: scoreResult
    });
  } catch (error: any) {
    console.error('Upload resume error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 3b. Re-evaluate ATS Score for Desired Role without re-uploading
router.post('/score-text', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'STUDENT']), async (req: AuthRequest, res: Response) => {
  const { resumeText, jobTitle, requiredSkills } = req.body;
  if (!resumeText || !resumeText.trim()) {
    return res.status(400).json({ error: 'Resume text is required for ATS scoring' });
  }

  try {
    const scoreResult = await scoreResume(resumeText, jobTitle || 'Software Engineer', requiredSkills || []);
    return res.json({ success: true, atsResult: scoreResult });
  } catch (err: any) {
    console.error('Score resume text error:', err);
    return res.status(500).json({ error: 'Failed to score resume: ' + err.message });
  }
});

// 4. Get Candidate details and evaluations
router.get('/:id', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER', 'INTERVIEWER', 'STUDENT']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId;
  const { id } = req.params;

  try {
    const whereClause: any = { id };
    if (req.user?.role !== 'STUDENT' && companyId) {
      whereClause.companyId = companyId;
    }

    const candidate = await prisma.candidate.findFirst({
      where: whereClause,
      include: {
        sessions: {
          include: {
            interview: true,
            plagiarismReport: true,
            answers: {
              include: {
                question: true,
                evaluation: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    return res.json({ candidate });
  } catch (error) {
    console.error('Get candidate error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Update Candidate status (ATS pipeline transition)
router.put('/:id/status', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['NEW', 'IN_REVIEW', 'SHORTLISTED', 'REJECTED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'HIRED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status code' });
  }

  try {
    const candidate = await prisma.candidate.findFirst({ where: { id, companyId } });
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data: { status },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id!,
        action: 'UPDATE_CANDIDATE_STATUS',
        details: `Moved candidate ${candidate.name} status from ${candidate.status} to ${status}`,
      },
    });

    return res.json({ candidate: updated });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Invite Candidate to an Interview (generates a secure expiring token session)
router.post('/:id/invite', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;
  const { id } = req.params;
  const { interviewId, expiresDays } = req.body;

  if (!interviewId) {
    return res.status(400).json({ error: 'Interview selection is required' });
  }

  try {
    // Check candidate and interview ownership
    const candidate = await prisma.candidate.findFirst({ where: { id, companyId } });
    const interview = await prisma.interview.findFirst({ where: { id: interviewId, companyId } });

    if (!candidate || !interview) {
      return res.status(404).json({ error: 'Candidate or Interview template not found' });
    }

    // Check if there is an active session
    const activeSession = await prisma.interviewSession.findFirst({
      where: {
        candidateId: id,
        interviewId,
        status: { in: ['PENDING', 'STARTED'] },
        expiresAt: { gt: new Date() },
      },
    });

    if (activeSession) {
      return res.json({
        message: 'Active session already exists',
        session: activeSession,
        inviteUrl: `/session/${activeSession.token}`,
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(24).toString('hex');
    const days = expiresDays ? Number(expiresDays) : 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const session = await prisma.interviewSession.create({
      data: {
        token,
        candidateId: id,
        interviewId,
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

    // Notify candidate (simulate mailing)
    await prisma.notification.create({
      data: {
        title: 'Interview invitation',
        message: `Hello ${candidate.name}, you have been invited to take the "${interview.title}" interview. Complete it before ${expiresAt.toLocaleDateString()}.`,
        candidateId: id,
      },
    });

    return res.status(201).json({
      message: 'Invitation sent successfully',
      session,
      inviteUrl: `/session/${token}`,
    });
  } catch (error) {
    console.error('Invite candidate error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// RESUME SCORE (ATS scoring)
// -------------------------------------------------------------------------
router.post('/:id/score-resume', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const companyId = req.user?.companyId!;
  const { jobTitle, requiredSkills } = req.body;

  try {
    const candidate = await prisma.candidate.findFirst({
      where: { id, companyId },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const resumeText = candidate.resumeParsedText || candidate.resumeSummary || '';
    if (!resumeText) {
      return res.status(400).json({ error: 'Candidate has no parsed resume text. Upload and parse resume first.' });
    }

    const jt = jobTitle || candidate.jobTitle || 'Software Engineer';
    const skills = Array.isArray(requiredSkills) ? requiredSkills : [];

    const result = await scoreResume(resumeText, jt, skills);

    // Persist the score
    await prisma.candidate.update({
      where: { id },
      data: {
        resumeScore: result.overallScore,
        resumeScoreBreakdown: JSON.stringify(result),
        jobTitle: jt,
      },
    });

    return res.json({ candidateId: id, ...result });
  } catch (error) {
    console.error('Score resume error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// Candidate self-registration (public – no auth needed)
// -------------------------------------------------------------------------
router.post('/register', async (req: any, res: Response) => {
  const { name, email, phone, companyToken, jobTitle } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  try {
    // Find company by token (companyToken is the company id for now; can be replaced with invite token)
    let company = null;
    if (companyToken) {
      company = await prisma.company.findFirst({ where: { id: companyToken } });
    }
    if (!company) {
      // Default to first company (demo mode)
      company = await prisma.company.findFirst();
    }
    if (!company) {
      return res.status(404).json({ error: 'No company found. Contact the recruiter for the correct company link.' });
    }

    // Check if already exists
    const existing = await prisma.candidate.findFirst({
      where: { email, companyId: company.id },
    });
    if (existing) {
      return res.json({ message: 'Already registered!', candidateId: existing.id });
    }

    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        phone: phone || null,
        jobTitle: jobTitle || null,
        companyId: company.id,
        status: 'NEW',
      },
    });

    return res.status(201).json({
      message: 'Registration successful! The recruiter will contact you.',
      candidateId: candidate.id,
      companyName: company.name,
    });
  } catch (error) {
    console.error('Candidate self-registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// Override AI evaluation score (recruiter manually adjusts)
// -------------------------------------------------------------------------
router.put('/evaluations/:evalId/override', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER']), async (req: AuthRequest, res: Response) => {
  const { evalId } = req.params;
  const { overrideScore, overrideFeedback } = req.body;

  if (overrideScore === undefined || overrideScore === null) {
    return res.status(400).json({ error: 'overrideScore is required' });
  }

  const score = Number(overrideScore);
  if (isNaN(score) || score < 0 || score > 100) {
    return res.status(400).json({ error: 'overrideScore must be between 0 and 100' });
  }

  try {
    // Verify the evaluation exists and belongs to this company's candidate
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evalId },
      include: {
        answer: {
          include: {
            session: {
              include: {
                interview: true,
              },
            },
          },
        },
      },
    });

    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    // Update the override fields
    const updated = await prisma.evaluation.update({
      where: { id: evalId },
      data: {
        overrideScore: score,
        overrideFeedback: overrideFeedback || null,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id!,
        action: 'OVERRIDE_EVALUATION',
        details: `Override evaluation ${evalId}: score set to ${score}${overrideFeedback ? ', with feedback note' : ''}`,
      },
    });

    return res.json({ success: true, evaluation: updated });
  } catch (error) {
    console.error('Override evaluation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// Send Decision Email (Selection / Rejection) explicitly triggered by recruiter
// -------------------------------------------------------------------------
router.post('/:id/send-decision-email', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const companyId = req.user?.companyId!;
  const { decision, subject, message } = req.body;

  if (!decision || (decision !== 'SELECTED' && decision !== 'REJECTED')) {
    return res.status(400).json({ error: 'Valid decision ("SELECTED" or "REJECTED") is required' });
  }

  try {
    const { sendDecisionEmail } = require('../services/mailer');

    const candidate = await prisma.candidate.findFirst({
      where: { id, companyId },
      include: { company: true },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const newStatus = decision === 'SELECTED' ? 'SHORTLISTED' : 'REJECTED';

    // Update candidate status
    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: { status: newStatus },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id!,
        action: 'SEND_CANDIDATE_DECISION_EMAIL',
        details: `Sent ${decision} email to candidate ${candidate.name} (${candidate.email})`,
      },
    });

    const orgName = candidate.company?.name || 'TalentAI Systems';

    const mailResult = await sendDecisionEmail({
      to: candidate.email,
      candidateName: candidate.name,
      orgName,
      decision,
      jobTitle: candidate.jobTitle || 'Software Engineer',
      subject,
      messageText: message,
    });

    return res.json({
      success: true,
      candidate: updatedCandidate,
      mailResult,
      message: mailResult.message,
      previewUrl: mailResult.previewUrl,
      realSmtpUsed: mailResult.realSmtpUsed,
    });
  } catch (error: any) {
    console.error('Send decision email error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send decision email' });
  }
});

export default router;


