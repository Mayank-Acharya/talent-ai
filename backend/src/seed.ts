import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Clean database
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.plagiarismReport.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.answer.deleteMany({});
  await prisma.interviewSession.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.interview.deleteMany({});
  await prisma.candidate.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.questionBankItem.deleteMany({});
  await prisma.company.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Company
  const company = await prisma.company.create({
    data: {
      name: 'TalentAI Systems',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&h=80&fit=crop&q=80',
      primaryColor: '#8b5cf6',
    },
  });

  console.log(`Created company: ${company.name}`);

  // 2. Create Users
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@talentai.com',
      name: 'Sarah Jenkins',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  const companyAdmin = await prisma.user.create({
    data: {
      email: 'admin@talentai.com',
      name: 'Alex Rivera',
      passwordHash,
      role: 'COMPANY_ADMIN',
      companyId: company.id,
    },
  });

  const recruiter = await prisma.user.create({
    data: {
      email: 'recruiter@talentai.com',
      name: 'Marcus Chen',
      passwordHash,
      role: 'RECRUITER',
      companyId: company.id,
    },
  });

  console.log('Created users: superadmin, admin, recruiter');

  // 3. Create Subscription
  await prisma.subscription.create({
    data: {
      companyId: company.id,
      plan: 'GROWTH',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });

  console.log('Seeding finished successfully. (No mock candidates or sessions were added)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
