import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Create Default Settings
  const settings = await prisma.settings.upsert({
    where: { id: 'global-settings' },
    update: {},
    create: {
      id: 'global-settings',
      organizationName: 'Teachers Bank Tracking System',
      systemName: 'TBTS',
      defaultLanguage: 'en',
      interestPercentage: 10,
      maturityMonths: 12,
      contactDetails: JSON.stringify([
        { id: '1', minAmount: 5000, maxAmount: 50000, durationMonths: 3 },
        { id: '2', minAmount: 50001, maxAmount: 100000, durationMonths: 6 },
        { id: '3', minAmount: 100001, maxAmount: 500000, durationMonths: 12 },
        { id: '4', minAmount: 500001, maxAmount: 9999999, durationMonths: 24 }
      ])
    }
  });
  console.log('Settings seeded:', settings.systemName);

  // 2. Create Active Contribution Cycle
  const cycle = await prisma.contributionCycle.upsert({
    where: { id: 'default-cycle-2026' },
    update: {},
    create: {
      id: 'default-cycle-2026',
      name: '2026 Annual Cycle',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      maturityMonths: 12,
      isActive: true
    }
  });
  console.log('Cycle seeded:', cycle.name);

  // 3. Create Users with different roles
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const treasurerPassword = await bcrypt.hash('treasurer123', 10);
  const secretaryPassword = await bcrypt.hash('secretary123', 10);

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'System Admin',
      role: 'ADMIN'
    }
  });

  // Treasurer (Read Only)
  await prisma.user.upsert({
    where: { email: 'treasurer@example.com' },
    update: {},
    create: {
      email: 'treasurer@example.com',
      password: treasurerPassword,
      name: 'John Treasurer',
      role: 'TREASURER'
    }
  });

  // Secretary (Write Access)
  await prisma.user.upsert({
    where: { email: 'secretary@example.com' },
    update: {},
    create: {
      email: 'secretary@example.com',
      password: secretaryPassword,
      name: 'Mary Secretary',
      role: 'SECRETARY'
    }
  });

  console.log('Users seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
