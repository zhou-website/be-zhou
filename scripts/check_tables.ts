import { prisma } from '../src/config/database.js';

async function check() {
  const [users, projects, documents, services, regulations, education, careers, applications, faqs, profiles, auditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.consultationProject.count(),
    prisma.projectDocument.count(),
    prisma.service.count(),
    prisma.regulation.count(),
    prisma.educationContent.count(),
    prisma.careerJob.count(),
    prisma.jobApplication.count(),
    prisma.chatbotFaq.count(),
    prisma.companyProfile.count(),
    prisma.auditLog.count(),
  ]);

  console.log('--- DATABASE RECORD COUNTS ---');
  console.log({
    users,
    projects,
    documents,
    services,
    regulations,
    education,
    careers,
    applications,
    faqs,
    profiles,
    auditLogs,
  });

  const allServices = await prisma.service.findMany();
  console.log('SERVICES IN DB:', allServices.map(s => ({ id: s.id, code: s.service_code, name: s.service_name, cat: s.category })));

  const allAdmins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
    select: { id: true, name: true, email: true, role: true }
  });
  console.log('ADMINS IN DB:', allAdmins);

  await prisma.$disconnect();
}

check();
