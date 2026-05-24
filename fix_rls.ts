import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Enabling RLS on Authenticator table...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "Authenticator" ENABLE ROW LEVEL SECURITY;`);
    console.log('RLS enabled.');
  } catch (error) {
    console.error('Error enabling RLS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
