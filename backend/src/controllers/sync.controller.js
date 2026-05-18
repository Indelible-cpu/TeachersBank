"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncData = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../prisma"));
const syncData = async (req, res) => {
    try {
        const { queue } = req.body; // Array of offline actions
        if (!Array.isArray(queue)) {
            return res.status(400).json({ error: 'Invalid sync payload format' });
        }
        const results = {
            successful: 0,
            failed: 0,
            errors: []
        };
        const user = req.user;
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
                            // 1. Create a corresponding system User so they appear in users lists and can log in
                            let userRecord = await prisma_1.default.user.findUnique({
                                where: { email: data.email || `${data.memberNumber.toLowerCase()}@teachersbank.com` }
                            });
                            if (!userRecord) {
                                const hashedPassword = await bcryptjs_1.default.hash(data.password || 'member123', 10);
                                userRecord = await prisma_1.default.user.create({
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
                            await prisma_1.default.member.create({ data: cleanMemberData });
                            auditDetails = `Successfully registered new cooperative member: ${data.fullname}`;
                        }
                        if (action === 'UPDATE') {
                            // 1. Get member's current userId to update their User credentials if present
                            const currentMember = await prisma_1.default.member.findUnique({ where: { id: data.id } });
                            if (currentMember && currentMember.userId) {
                                const userPayload = {};
                                if (data.email)
                                    userPayload.email = data.email;
                                if (data.fullname)
                                    userPayload.name = data.fullname;
                                if (data.password) {
                                    userPayload.password = await bcryptjs_1.default.hash(data.password, 10);
                                }
                                if (Object.keys(userPayload).length > 0) {
                                    await prisma_1.default.user.update({
                                        where: { id: currentMember.userId },
                                        data: userPayload
                                    });
                                }
                            }
                            // 2. Clear transient fields
                            delete cleanMemberData.email;
                            delete cleanMemberData.password;
                            await prisma_1.default.member.update({ where: { id: data.id }, data: cleanMemberData });
                            auditDetails = `Updated cooperative member details for: ${data.fullname || data.id}`;
                        }
                        if (action === 'DELETE') {
                            await prisma_1.default.member.delete({ where: { id: data.id } });
                            auditDetails = `Removed member with ID: ${data.id}`;
                        }
                        break;
                    case 'loans':
                        const cleanLoanData = { ...data };
                        delete cleanLoanData.timestamp;
                        delete cleanLoanData.memberName;
                        if (action === 'CREATE') {
                            cleanLoanData.recordedBy = userId;
                            await prisma_1.default.loan.create({ data: cleanLoanData });
                            auditDetails = `Issued new cooperative loan: Principal ${data.principal} for member ID: ${data.memberId}`;
                        }
                        if (action === 'UPDATE') {
                            await prisma_1.default.loan.update({ where: { id: data.id }, data: cleanLoanData });
                            auditDetails = `Updated loan status for ID: ${data.id} to ${data.status}`;
                        }
                        if (action === 'DELETE') {
                            await prisma_1.default.loan.delete({ where: { id: data.id } });
                            auditDetails = `Deleted loan record ID: ${data.id}`;
                        }
                        break;
                    case 'repayments':
                        const cleanRepaymentData = { ...data };
                        delete cleanRepaymentData.timestamp;
                        delete cleanRepaymentData.memberName;
                        if (action === 'CREATE') {
                            cleanRepaymentData.recordedBy = userId;
                            await prisma_1.default.repayment.create({ data: cleanRepaymentData });
                            auditDetails = `Logged new loan repayment: Amount ${data.amount} for loan ID: ${data.loanId}`;
                        }
                        if (action === 'UPDATE') {
                            await prisma_1.default.repayment.update({ where: { id: data.id }, data: cleanRepaymentData });
                            auditDetails = `Updated repayment status for ID: ${data.id} to ${data.status}`;
                        }
                        if (action === 'DELETE') {
                            await prisma_1.default.repayment.delete({ where: { id: data.id } });
                            auditDetails = `Removed repayment record ID: ${data.id}`;
                        }
                        break;
                    case 'contributions':
                        const cleanContribData = formatContribution(data);
                        if (action === 'CREATE') {
                            cleanContribData.recordedBy = userId;
                            if (data.type === 'SHARE') {
                                await prisma_1.default.shareContribution.create({ data: cleanContribData });
                                auditDetails = `Logged share contribution: Amount ${data.amount} for member ID: ${data.memberId}`;
                            }
                            else {
                                await prisma_1.default.emergencyContribution.create({ data: cleanContribData });
                                auditDetails = `Logged emergency contribution: Amount ${data.amount} for member ID: ${data.memberId}`;
                            }
                        }
                        break;
                    case 'receipts':
                        const cleanReceiptData = { ...data };
                        delete cleanReceiptData.timestamp;
                        if (action === 'CREATE') {
                            await prisma_1.default.receipt.create({ data: cleanReceiptData });
                            auditDetails = `Generated digital transaction receipt ID: ${data.id}`;
                        }
                        break;
                    case 'settings':
                        const { loanDurationRules, ...settingsData } = data;
                        // Strip out frontend-only/incompatible keys to prevent prisma validation errors
                        const cleanSettingsPayload = {};
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
                            if (settingsData[field] !== undefined) {
                                cleanSettingsPayload[field] = settingsData[field];
                            }
                        });
                        if (loanDurationRules) {
                            cleanSettingsPayload.contactDetails = JSON.stringify(loanDurationRules);
                        }
                        const existingSettings = await prisma_1.default.settings.findFirst();
                        if (existingSettings) {
                            await prisma_1.default.settings.update({
                                where: { id: existingSettings.id },
                                data: cleanSettingsPayload
                            });
                        }
                        else {
                            await prisma_1.default.settings.create({
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
                    await prisma_1.default.auditLog.create({
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
            }
            catch (err) {
                results.failed++;
                results.errors.push({ item, error: err.message });
                // Log failure
                if (user) {
                    try {
                        await prisma_1.default.auditLog.create({
                            data: {
                                userId: userId,
                                userRole: userRole,
                                action: `${item.action}_${item.table.toUpperCase()}_FAILED`,
                                details: `Failed to sync ${item.action.toLowerCase()} on ${item.table}: ${err.message}`,
                                status: 'FAILED'
                            }
                        });
                    }
                    catch (logErr) {
                        console.error('Failed to write failure audit log', logErr);
                    }
                }
            }
        }
        // After processing mutations, we fetch the latest state from the database
        // to send back to the frontend for reconciliation.
        const rawSettings = await prisma_1.default.settings.findFirst();
        const cleanSettings = rawSettings ? { ...rawSettings } : null;
        if (cleanSettings && cleanSettings.contactDetails) {
            try {
                cleanSettings.loanDurationRules = JSON.parse(cleanSettings.contactDetails);
            }
            catch (e) {
                console.error('Failed to parse contactDetails as loanDurationRules:', e);
            }
        }
        const serverState = {
            members: await prisma_1.default.member.findMany(),
            loans: await prisma_1.default.loan.findMany(),
            repayments: await prisma_1.default.repayment.findMany(),
            receipts: await prisma_1.default.receipt.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
            settings: cleanSettings,
            staffCount: await prisma_1.default.user.count({
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
    }
    catch (error) {
        console.error('Sync Error:', error);
        res.status(500).json({ error: 'Internal Server Error during synchronization' });
    }
};
exports.syncData = syncData;
// Helper to strip frontend-only fields before sending to Prisma
function formatContribution(data) {
    const { type, memberName, ...rest } = data;
    return rest;
}
