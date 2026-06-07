import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting user reset...');

  // Delete in order to respect foreign key constraints
  console.log('  Deleting notifications...');
  await prisma.notification.deleteMany({});

  console.log('  Deleting authenticators...');
  await prisma.authenticator.deleteMany({});

  console.log('  Deleting audit logs...');
  await prisma.auditLog.deleteMany({});

  console.log('  Deleting receipts...');
  await prisma.receipt.deleteMany({});

  console.log('  Deleting repayments...');
  await prisma.repayment.deleteMany({});

  console.log('  Deleting disbursements...');
  await prisma.disbursement.deleteMany({});

  console.log('  Deleting loans...');
  await prisma.loan.deleteMany({});

  console.log('  Deleting share contributions...');
  await prisma.shareContribution.deleteMany({});

  console.log('  Deleting emergency contributions...');
  await prisma.emergencyContribution.deleteMany({});

  console.log('  Deleting contribution cycles...');
  await prisma.contributionCycle.deleteMany({});

  console.log('  Deleting members...');
  await prisma.member.deleteMany({});

  console.log('  Deleting all users...');
  await prisma.user.deleteMany({});

  // Create default admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@teachersbank.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
      requiresPasswordChange: true,
    },
  });

  console.log('');
  console.log('✅ Reset complete! Default admin created:');
  console.log('   ─────────────────────────────────────');
  console.log(`   Email:    admin@teachersbank.com`);
  console.log(`   Password: admin123`);
  console.log(`   Role:     ADMIN`);
  console.log(`   ID:       ${admin.id}`);
  console.log('   ─────────────────────────────────────');
  console.log('   ⚠️  You will be forced to change the password on first login.');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
