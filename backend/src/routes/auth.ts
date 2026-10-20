import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../services/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { sendWelcomeEmail } from '../services/mailer';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mock-jwt-secret-for-local-development-987654';

// 1. Company Onboarding & Admin Registration
router.post('/register', async (req: AuthRequest, res: Response) => {
  const { companyName, email, password, name } = req.body;

  if (!companyName || !email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Create company & user inside transaction
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
        },
      });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'COMPANY_ADMIN',
          companyId: company.id,
        },
      });

      // Initialize default subscription
      await tx.subscription.create({
        data: {
          companyId: company.id,
          plan: 'ORGANISATION',
          status: 'ACTIVE',
        },
      });

      return { user, company };
    });

    // Send thank you welcome email directly to registered email
    sendWelcomeEmail({
      to: result.user.email,
      name: result.user.name,
      role: result.user.role,
      companyName: result.company.name,
    }).catch(err => console.error('Welcome email error (non-fatal):', err));

    // Generate JWT
    const token = jwt.sign(
      {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        companyId: result.user.companyId,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        companyId: result.user.companyId,
        createdAt: result.user.createdAt,
      },
      company: result.company,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 1b. Student Registration ($20/month plan)
router.post('/register-student', async (req: AuthRequest, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Find or create a shared student workspace company
    let studentCompany = await prisma.company.findFirst({
      where: { name: 'Student Workspace' },
    });

    if (!studentCompany) {
      studentCompany = await prisma.company.create({
        data: {
          name: 'Student Workspace',
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'STUDENT',
        companyId: studentCompany.id,
      },
    });

    // Send thank you welcome email directly to registered student email
    sendWelcomeEmail({
      to: user.email,
      name: user.name,
      role: user.role,
      companyName: 'Student Workspace',
    }).catch(err => console.error('Welcome email error (non-fatal):', err));

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        createdAt: user.createdAt,
      },
      company: studentCompany,
    });
  } catch (error: any) {
    console.error('Student registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 1c. Social Authentication (Google, Facebook, GitHub, LinkedIn)
router.post('/social-login', async (req: AuthRequest, res: Response) => {
  const { provider = 'google', email, name, role = 'STUDENT', companyName } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required for social authentication' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const displayName = name?.trim() || cleanEmail.split('@')[0];

  try {
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { company: true },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      let targetCompanyId: string;
      let targetCompanyName = companyName || `${displayName}'s Workspace`;

      if (role === 'COMPANY_ADMIN') {
        const newCompany = await prisma.company.create({
          data: { name: targetCompanyName },
        });
        targetCompanyId = newCompany.id;

        await prisma.subscription.create({
          data: {
            companyId: newCompany.id,
            plan: 'ORGANISATION',
            status: 'ACTIVE',
          },
        });
      } else {
        let studentCompany = await prisma.company.findFirst({
          where: { name: 'Student Workspace' },
        });
        if (!studentCompany) {
          studentCompany = await prisma.company.create({
            data: { name: 'Student Workspace' },
          });
        }
        targetCompanyId = studentCompany.id;
        targetCompanyName = studentCompany.name;
      }

      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: displayName,
          passwordHash,
          role: role || 'STUDENT',
          companyId: targetCompanyId,
        },
        include: { company: true },
      });

      // Send thank you welcome email directly to new social-registered email
      sendWelcomeEmail({
        to: user.email,
        name: user.name,
        role: user.role,
        companyName: targetCompanyName,
      }).catch(err => console.error('Social welcome email error (non-fatal):', err));
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        createdAt: user.createdAt,
        isMaster: user.email === 'mayank074518@gmail.com' || user.role === 'SUPER_ADMIN',
      },
      company: user.company,
      isNewUser,
      provider,
    });
  } catch (error) {
    console.error('Social login error:', error);
    return res.status(500).json({ error: 'Internal server error during social authentication' });
  }
});

// 1d. 1-Time Demo Guest Login
router.post('/demo-login', async (req: AuthRequest, res: Response) => {
  try {
    let demoUser = await prisma.user.findFirst({
      where: { email: 'demo.guest@talentai.com' },
      include: { company: true },
    });

    let company = await prisma.company.findFirst({ where: { name: 'Student Workspace' } });
    if (!company) {
      company = await prisma.company.create({ data: { name: 'Student Workspace' } });
    }

    if (!demoUser) {
      const passwordHash = await bcrypt.hash('demopassword123', 10);
      demoUser = await prisma.user.create({
        data: {
          email: 'demo.guest@talentai.com',
          name: 'Demo Guest User',
          passwordHash,
          role: 'STUDENT',
          companyId: company.id,
        },
        include: { company: true },
      });
    }

    const token = jwt.sign(
      {
        id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role,
        companyId: demoUser.companyId,
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.json({
      token,
      user: {
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
        role: demoUser.role,
        companyId: demoUser.companyId,
        isDemoGuest: true,
      },
      company: demoUser.company || company,
      isDemoGuest: true,
    });
  } catch (error) {
    console.error('Demo login error:', error);
    return res.status(500).json({ error: 'Failed to initialize demo session' });
  }
});

// 1e. Master Owner Login (Lifetime Permanent VIP Access for Creator/Owner)
router.post('/master-login', async (req: AuthRequest, res: Response) => {
  try {
    let masterUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'mayank074518@gmail.com' },
          { email: 'admin@talentai.com' }
        ]
      },
      include: { company: true },
    });

    let company = await prisma.company.findFirst({ where: { name: 'TalentAI Systems' } });
    if (!company) {
      company = await prisma.company.create({ data: { name: 'TalentAI Systems' } });
    }

    if (!masterUser) {
      const passwordHash = await bcrypt.hash('mayankadmin2026', 10);
      masterUser = await prisma.user.create({
        data: {
          email: 'mayank074518@gmail.com',
          name: 'Mayank Kumar Acharya (Founder)',
          passwordHash,
          role: 'SUPER_ADMIN',
          companyId: company.id,
        },
        include: { company: true },
      });

      // Grant lifetime subscription
      await prisma.subscription.create({
        data: {
          companyId: company.id,
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
        },
      });
    }

    const token = jwt.sign(
      {
        id: masterUser.id,
        email: masterUser.email,
        role: 'SUPER_ADMIN',
        companyId: masterUser.companyId,
      },
      JWT_SECRET,
      { expiresIn: '365d' }
    );

    return res.json({
      token,
      user: {
        id: masterUser.id,
        name: masterUser.name,
        email: masterUser.email,
        role: 'SUPER_ADMIN',
        companyId: masterUser.companyId,
        isMaster: true,
        createdAt: masterUser.createdAt,
      },
      company: masterUser.company || company,
      isMaster: true,
    });
  } catch (error) {
    console.error('Master login error:', error);
    return res.status(500).json({ error: 'Failed to access Master account' });
  }
});

// 2. Login
router.post('/login', async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        createdAt: user.createdAt,
        isMaster: user.email === 'mayank074518@gmail.com' || user.role === 'SUPER_ADMIN',
      },
      company: user.company,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Get Current User Profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        company: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
