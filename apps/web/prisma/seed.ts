import { PrismaClient, BaseResumeType } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { role: 'ADMIN' },
    create: { email: 'admin@example.com', name: 'Admin', role: 'ADMIN' },
  });
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: { email: 'user@example.com', name: 'User' },
  });

  const resumes = await prisma.$transaction([
    prisma.resume.create({ data: { userId: admin.id, title: 'General', baseType: 'GENERAL', contentMd: '# General Resume\n' } }),
    prisma.resume.create({ data: { userId: user.id, title: 'Mechanical', baseType: 'MECHANICAL', contentMd: '# Mechanical Resume\n' } }),
    prisma.resume.create({ data: { userId: user.id, title: 'SWE', baseType: 'SWE', contentMd: '# SWE Resume\n' } }),
  ]);

  const job = await prisma.job.create({ data: { userId: user.id, source: 'URL', url: 'https://example.com/job', jdText: 'We need an engineer', jdHash: 'hash1' } });
  await prisma.resumeVersion.create({ data: { resumeId: resumes[2].id, jobId: job.id, contentMd: '# Tailored', atsScore: 80, modelRoute: 'DRAFT' } });
  console.log('Seed complete');
}

run().finally(()=>prisma.$disconnect());


