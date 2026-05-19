import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
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
            const cleanMemberData = { ...data };
            delete cleanMemberData.timestamp; // Strip frontend-only timestamp if it exists
            
            if (action === 'CREATE') {
              cleanMemberData.recordedBy = userId;
              
              // 1. Create a corresponding system User so they appear in users lists and can log in
              let userRecord = await prisma.user.findUnique({
                where: { email: data.email || `${data.memberNumber.toLowerCase()}@teachersbank.com` }
              });
              
              if (!userRecord) {
                const hashedPassword = await bcrypt.hash(data.password || 'member123', 10);
                userRecord = await prisma.user.create({
                  data: {
                    email: data.email || `${data.memberNumber.toLowerCase()}@teachersbank.com`,
                    password: hashedPassword,
                    name: data.fullname,
                    role: 'MEMBER'
                  }
                });
              }
              
              // 2. Map user relation ID
              cleanMemberData.userId = userRecord.id;
              
              // 3. Clear transient/frontend fields not in schema
              delete cleanMemberData.email;
              delete cleanMemberData.password;
              
              await prisma.member.create({ data: cleanMemberData });
              auditDetails = `Successfully registered new cooperative member: ${data.fullname}`;
            }
            if (action === 'UPDATE') {
              // 1. Get member's current userId to update their User credentials if present
              const currentMember = await prisma.member.findUnique({ where: { id: data.id } });
              if (currentMember && currentMember.userId) {
                const userPayload: any = {};
                if (data.email) userPayload.email = data.email;
                if (data.fullname) userPayload.name = data.fullname;
                if (data.password) {
                  userPayload.password = await bcrypt.hash(data.password, 10);
                }
                
                if (Object.keys(userPayload).length > 0) {
                  await prisma.user.update({
                    where: { id: currentMember.userId },
                    data: userPayload
                  });
                }
              }

              // 2. Clear transient fields
              delete cleanMemberData.email;
              delete cleanMemberData.password;

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
            if (action === 'UPDATE') {
              const updateData = { ...cleanContribData };
              delete updateData.id;
              
              if (data.type === 'SHARE') {
                await prisma.shareContribution.update({
                  where: { id: data.id },
                  data: updateData
                });
                auditDetails = `Updated share contribution status for ID: ${data.id} to ${data.status}`;
              } else {
                await prisma.emergencyContribution.update({
                  where: { id: data.id },
                  data: updateData
                });
                auditDetails = `Updated emergency contribution status for ID: ${data.id} to ${data.status}`;
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

          case 'settings':
            const { loanDurationRules, ...settingsData } = data;
            
            // Strip out frontend-only/incompatible keys to prevent prisma validation errors
            const cleanSettingsPayload: any = {};
            const allowedFields = [
              'organizationName',
              'systemName',
              'logo',
              'receiptFooter',
              'defaultLanguage',
              'interestPercentage',
              'maturityMonths'
            ];
            
            allowedFields.forEach(field => {
              if (settingsData[field] !== undefined && settingsData[field] !== null) {
                if (field === 'interestPercentage') {
                  cleanSettingsPayload[field] = parseFloat(settingsData[field]);
                } else if (field === 'maturityMonths') {
                  cleanSettingsPayload[field] = parseInt(settingsData[field], 10);
                } else {
                  cleanSettingsPayload[field] = settingsData[field];
                }
              }
            });
            
            if (loanDurationRules) {
              cleanSettingsPayload.contactDetails = JSON.stringify(loanDurationRules);
            }
            
            const existingSettings = await prisma.settings.findFirst();
            if (existingSettings) {
              await prisma.settings.update({
                where: { id: existingSettings.id },
                data: cleanSettingsPayload
              });
            } else {
              await prisma.settings.create({
                data: {
                  ...cleanSettingsPayload,
                  id: 'global-settings'
                }
              });
            }
            auditDetails = `Successfully saved updated global system and loan configurations`;
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
    const rawSettings = await prisma.settings.findFirst();
    const cleanSettings = rawSettings ? { ...rawSettings } as any : null;
    if (cleanSettings && cleanSettings.contactDetails) {
      try {
        cleanSettings.loanDurationRules = JSON.parse(cleanSettings.contactDetails);
      } catch (e) {
        console.error('Failed to parse contactDetails as loanDurationRules:', e);
      }
    }

    const shareContribs = await prisma.shareContribution.findMany();
    const emergencyContribs = await prisma.emergencyContribution.findMany();
    const allContributions = [
      ...shareContribs.map(c => ({ ...c, type: 'SHARE' })),
      ...emergencyContribs.map(c => ({ ...c, type: 'EMERGENCY' }))
    ];

    const serverState = {
      members: await prisma.member.findMany(),
      loans: await prisma.loan.findMany(),
      repayments: await prisma.repayment.findMany(),
      contributions: allContributions,
      receipts: await prisma.receipt.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      settings: cleanSettings,
      staffCount: await prisma.user.count({
        where: {
          role: { in: ['ADMIN', 'TREASURER', 'SECRETARY'] }
        }
      })
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
