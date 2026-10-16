import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../services/db';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. Get current company details
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId;

  if (!companyId) {
    return res.status(400).json({ error: 'User does not belong to a company' });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    return res.json({ company });
  } catch (error) {
    console.error('Get company error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Update company branding & name
router.put('/me', authenticateToken, requireRole(['COMPANY_ADMIN']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;
  const { name, primaryColor, logoUrl } = req.body;

  try {
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        primaryColor,
        logoUrl,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id!,
        action: 'UPDATE_COMPANY_BRANDING',
        details: `Updated company branding to color ${primaryColor} and name ${name}`,
      },
    });

    return res.json({ company: updated });
  } catch (error) {
    console.error('Update company error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Invite / create new user in the company (Recruiter/Interviewer)
router.post('/users', authenticateToken, requireRole(['COMPANY_ADMIN']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;
  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!['RECRUITER', 'INTERVIEWER', 'COMPANY_ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        companyId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id!,
        action: 'CREATE_USER',
        details: `Created new user ${name} (${role})`,
      },
    });

    return res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        companyId: newUser.companyId,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. List company users
router.get('/users', authenticateToken, requireRole(['COMPANY_ADMIN', 'RECRUITER']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;

  try {
    const users = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
