"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
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
// Update user role or status (Admin only)
router.patch('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN']), (0, audit_middleware_1.trackActivity)('UPDATE_USER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { role, isActive } = req.body;
        const user = await prisma_1.default.user.update({
            where: { id },
            data: {
                role: role,
                isActive: isActive !== undefined ? isActive : undefined
            }
        });
        res.json(user);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update user' });
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
        await prisma_1.default.user.delete({
            where: { id }
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to delete user' });
    }
});
// Audit Logs (Admin only)
router.get('/audit-logs', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN']), async (req, res) => {
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
