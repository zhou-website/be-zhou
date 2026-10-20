import { prisma } from '../src/config/database.js';

async function main() {
  console.log('Running database schema updates...');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE consultations_projects
    ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS priority varchar(50) DEFAULT 'Normal';
  `);
  console.log('✓ consultations_projects columns updated (is_archived, priority)');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE regulations
    ADD COLUMN IF NOT EXISTS legal_status varchar(50) DEFAULT 'Berlaku',
    ADD COLUMN IF NOT EXISTS replacement_ref varchar(255);
  `);
  console.log('✓ regulations columns updated (legal_status, replacement_ref)');

  console.log('Database schema update finished successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
