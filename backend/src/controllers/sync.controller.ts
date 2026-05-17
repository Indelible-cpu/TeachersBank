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

    const user = (req as any).user;
    const userId = user?.id || 'SYSTEM';
    const userRole = user?.role || 'SYSTEM';

    // We process sequentially to maintain referential integrity (e.g. member created before their loan)
    for (const item of queue) {
      try {
        const { action, table, data } = item;
        let auditDetails = `Processed ${action} on ${table}`;
        
        switch (table) {
          case 'members':
            const { fullname, alternativeNames, ...memberData } = data; // Strip frontend fields if any, or adjust
            // Wait, member in schema has fullname, alternativeNames. Let's make sure we only pass valid fields.
            // Actually, frontend sends exactly what is needed for member, but we should ensure no extra fields.
            const cleanMemberData = { ...data };
            delete cleanMemberData.timestamp; // Strip frontend-only timestamp if it exists
            
            if (action === 'CREATE') {
              cleanMemberData.recordedBy = userId;
              await prisma.member.create({ data: cleanMemberData });
              auditDetails = `Successfully registered new cooperative member: ${data.fullname}`;
            }
            if (action === 'UPDATE') {
              await prisma.member.update({ where: { id: data.id }, data: cleanMemberData });
              auditDetails = `Updated cooperative member details for: ${data.fullname || data.id}`;
            }
            if (action === 'DELETE') {
              await prisma.member.delete({ where: { id: data.id } });
              auditDetails = `Removed member with ID: ${data.id}`;
            }
            break;

          case 'loans':
            const cleanLoanData = { ...data };
            delete cleanLoanData.timestamp;
            delete cleanLoanData.memberName;
            
            if (action === 'CREATE') {
              cleanLoanData.recordedBy = userId;
              await prisma.loan.create({ data: cleanLoanData });
              auditDetails = `Issued new cooperative loan: Principal ${data.principal} for member ID: ${data.memberId}`;
            }
            if (action === 'UPDATE') {
              await prisma.loan.update({ where: { id: data.id }, data: cleanLoanData });
              auditDetails = `Updated loan status for ID: ${data.id} to ${data.status}`;
            }
            if (action === 'DELETE') {
              await prisma.loan.delete({ where: { id: data.id } });
              auditDetails = `Deleted loan record ID: ${data.id}`;
            }
            break;

          case 'repayments':
            const cleanRepaymentData = { ...data };
            delete cleanRepaymentData.timestamp;
            delete cleanRepaymentData.memberName;
            
            if (action === 'CREATE') {
              cleanRepaymentData.recordedBy = userId;
              await prisma.repayment.create({ data: cleanRepaymentData });
              auditDetails = `Logged new loan repayment: Amount ${data.amount} for loan ID: ${data.loanId}`;
            }
            if (action === 'UPDATE') {
              await prisma.repayment.update({ where: { id: data.id }, data: cleanRepaymentData });
              auditDetails = `Updated repayment status for ID: ${data.id} to ${data.status}`;
            }
            if (action === 'DELETE') {
              await prisma.repayment.delete({ where: { id: data.id } });
              auditDetails = `Removed repayment record ID: ${data.id}`;
            }
            break;

          case 'contributions':
            const cleanContribData = formatContribution(data);
            
            if (action === 'CREATE') {
              cleanContribData.recordedBy = userId;
              if (data.type === 'SHARE') {
                await prisma.shareContribution.create({ data: cleanContribData });
                auditDetails = `Logged share contribution: Amount ${data.amount} for member ID: ${data.memberId}`;
              } else {
                await prisma.emergencyContribution.create({ data: cleanContribData });
                auditDetails = `Logged emergency contribution: Amount ${data.amount} for member ID: ${data.memberId}`;
              }
            }
            break;

          case 'receipts':
            const cleanReceiptData = { ...data };
            delete cleanReceiptData.timestamp;
            
            if (action === 'CREATE') {
              await prisma.receipt.create({ data: cleanReceiptData });
              auditDetails = `Generated digital transaction receipt ID: ${data.id}`;
            }
            break;
            
          default:
            throw new Error(`Unknown table: ${table}`);
        }
        
        // Log successful operation in AuditTrail
        if (user) {
          await prisma.auditLog.create({
            data: {
              userId: userId,
              userRole: userRole,
              action: `${action}_${table.toUpperCase()}`,
              details: auditDetails,
              status: 'SUCCESS'
            }
          });
        }
        
        results.successful++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({ item, error: err.message });
        
        // Log failure
        if (user) {
          try {
            await prisma.auditLog.create({
              data: {
                userId: userId,
                userRole: userRole,
                action: `${item.action}_${item.table.toUpperCase()}_FAILED`,
                details: `Failed to sync ${item.action.toLowerCase()} on ${item.table}: ${err.message}`,
                status: 'FAILED'
              }
            });
          } catch (logErr) {
            console.error('Failed to write failure audit log', logErr);
          }
        }
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
