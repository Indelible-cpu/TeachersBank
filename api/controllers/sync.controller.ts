import { Request, Response } from 'express';
import prisma from '../prisma';

export const syncData = async (req: Request, res: Response) => {
  try {
    const { queue } = req.body; // Array of offline actions

    if (!Array.isArray(queue)) {
      return res.status(400).json({ error: 'Invalid sync payload format' });
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as any[]
    };

    // We process sequentially to maintain referential integrity (e.g. member created before their loan)
    for (const item of queue) {
      try {
        const { action, table, data } = item;
        
        switch (table) {
          case 'members':
            if (action === 'CREATE') await prisma.member.create({ data });
            if (action === 'UPDATE') await prisma.member.update({ where: { id: data.id }, data });
            if (action === 'DELETE') await prisma.member.delete({ where: { id: data.id } });
            break;

          case 'loans':
            if (action === 'CREATE') await prisma.loan.create({ data });
            if (action === 'UPDATE') await prisma.loan.update({ where: { id: data.id }, data });
            if (action === 'DELETE') await prisma.loan.delete({ where: { id: data.id } });
            break;

          case 'repayments':
            if (action === 'CREATE') await prisma.repayment.create({ data });
            if (action === 'UPDATE') await prisma.repayment.update({ where: { id: data.id }, data });
            if (action === 'DELETE') await prisma.repayment.delete({ where: { id: data.id } });
            break;

          case 'contributions':
            if (action === 'CREATE') {
              // Note: The frontend might pass generic 'contributions' which need to be routed
              // to either shareContributions or emergencyContributions based on a type field.
              if (data.type === 'SHARE') {
                await prisma.shareContribution.create({ data: formatContribution(data) });
              } else {
                await prisma.emergencyContribution.create({ data: formatContribution(data) });
              }
            }
            break;

          case 'receipts':
            if (action === 'CREATE') await prisma.receipt.create({ data });
            break;
            
          default:
            throw new Error(`Unknown table: ${table}`);
        }
        
        results.successful++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({ item, error: err.message });
      }
    }

    // After processing mutations, we fetch the latest state from the database
    // to send back to the frontend for reconciliation.
    const serverState = {
      members: await prisma.member.findMany(),
      loans: await prisma.loan.findMany(),
      repayments: await prisma.repayment.findMany(),
      receipts: await prisma.receipt.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      settings: await prisma.settings.findFirst()
    };

    res.json({
      message: 'Sync completed',
      syncResults: results,
      serverState // Frontend will update its IndexedDB with this fresh truth
    });
    
  } catch (error: any) {
    console.error('Sync Error:', error);
    res.status(500).json({ error: 'Internal Server Error during synchronization' });
  }
};

// Helper to strip frontend-only fields before sending to Prisma
function formatContribution(data: any) {
  const { type, memberName, ...rest } = data;
  return rest;
}
