import { prisma } from '../src/config/database.js';

async function main() {
  const projCols: any[] = await prisma.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'consultations_projects' ORDER BY ordinal_position");
  console.log('CONSULTATIONS_PROJECTS COLS:', projCols.map(c => `${c.column_name} (${c.data_type})`));

  const regCols: any[] = await prisma.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'regulations' ORDER BY ordinal_position");
  console.log('REGULATIONS COLS:', regCols.map(c => `${c.column_name} (${c.data_type})`));

  const srvCols: any[] = await prisma.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'services' ORDER BY ordinal_position");
  console.log('SERVICES COLS:', srvCols.map(c => `${c.column_name} (${c.data_type})`));

  const eduCols: any[] = await prisma.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'education_contents' ORDER BY ordinal_position");
  console.log('EDUCATION COLS:', eduCols.map(c => `${c.column_name} (${c.data_type})`));

  const careerCols: any[] = await prisma.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'career_jobs' ORDER BY ordinal_position");
  console.log('CAREER COLS:', careerCols.map(c => `${c.column_name} (${c.data_type})`));

  const settingsCols: any[] = await prisma.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'site_settings' ORDER BY ordinal_position");
  console.log('SITE_SETTINGS COLS:', settingsCols.map(c => `${c.column_name} (${c.data_type})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
