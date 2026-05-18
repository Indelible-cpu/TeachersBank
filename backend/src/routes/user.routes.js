"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const router = (0, express_1.Router)();
// Get all users (Admin only)
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN']), async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            include: { member: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// Update user role or status or details (Admin only)
router.patch('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN']), (0, audit_middleware_1.trackActivity)('UPDATE_USER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { role, isActive, name, email } = req.body;
        const user = await prisma_1.default.user.update({
            where: { id: id },
            data: {
                role: role,
                isActive: isActive !== undefined ? isActive : undefined,
                name: name,
                email: email
            }
        });
        res.json(user);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update user' });
    }
});
// Reset password of a user (Admin only)
router.post('/:id/reset-password', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN']), (0, audit_middleware_1.trackActivity)('RESET_USER_PASSWORD'), async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;
        if (!password || password.trim().length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.default.user.update({
            where: { id: id },
            data: { password: hashedPassword }
        });
        res.json({ message: `Password reset successfully for ${user.name}` });
    }
    catch (error) {
        console.error('Password reset backend error:', error);
        res.status(400).json({ error: 'Failed to reset password', details: error?.message });
    }
});
// Delete user (Admin only)
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN']), (0, audit_middleware_1.trackActivity)('DELETE_USER'), async (req, res) => {
    try {
        const { id } = req.params;
        // Check if user is deleting themselves
        if (req.user.id === id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        // Delete associated member records to prevent foreign key violation
        await prisma_1.default.member.deleteMany({
            where: { userId: id }
        });
        await prisma_1.default.user.delete({
            where: { id }
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to delete user' });
    }
});
// Audit Logs (Admin, Secretary, Treasurer)
router.get('/audit-logs', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN', 'SECRETARY', 'TREASURER']), async (req, res) => {
    try {
        const logs = await prisma_1.default.auditLog.findMany({
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});
exports.default = router;
