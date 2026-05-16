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
      maturityMonths: 12
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

  // 3. Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'System Admin',
      role: 'ADMIN'
    }
  });
  console.log('Admin user seeded:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
