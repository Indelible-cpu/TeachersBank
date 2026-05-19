import prisma from './src/prisma';

async function main() {
  const users = await prisma.user.findMany();
  const members = await prisma.member.findMany();
  console.log("=== USERS ===");
  console.log(users.map((u: any) => ({ id: u.id, email: u.email, name: u.name, role: u.role })));
  console.log("=== MEMBERS ===");
  console.log(members.map((m: any) => ({ id: m.id, userId: m.userId, fullname: m.fullname, memberNumber: m.memberNumber })));
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
