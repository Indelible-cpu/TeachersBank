import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { trackActivity } from '../middleware/audit.middleware';

import bcrypt from 'bcryptjs';

const router = Router();

// Get all users (Admin only)
router.get('/', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { member: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role or status (Admin only)
router.patch('/:id', authenticate, authorize(['ADMIN']), trackActivity('UPDATE_USER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: id as string },
      data: { 
        role: role,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update user' });
  }
});

// Reset password of a user (Admin only)
router.post('/:id/reset-password', authenticate, authorize(['ADMIN']), trackActivity('RESET_USER_PASSWORD'), async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.trim().length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: id as string },
      data: { password: hashedPassword }
    });

    res.json({ message: `Password reset successfully for ${user.name}` });
  } catch (error) {
    res.status(400).json({ error: 'Failed to reset password' });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticate, authorize(['ADMIN']), trackActivity('DELETE_USER'), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Check if user is deleting themselves
    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete user' });
  }
});

// Audit Logs (Admin only)
router.get('/audit-logs', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
