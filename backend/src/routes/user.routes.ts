import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { trackActivity } from '../middleware/audit.middleware';

import bcrypt from 'bcryptjs';

const router = Router();

// Check if email exists (Public or specific role? Let's make it authenticated at least)
router.get('/check-email', authenticate, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await prisma.user.findUnique({ where: { email: email as string } });
    if (user) return res.status(400).json({ error: 'Email already in use' });
    return res.json({ available: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

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

// Update user role or status or details (Admin only)
router.patch('/:id', authenticate, authorize(['ADMIN']), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { role, isActive, name, email } = req.body;

    const oldUser = await prisma.user.findUnique({ where: { id: id as string } });
    if (!oldUser) return res.status(404).json({ error: 'User not found' });

    const user = await prisma.user.update({
      where: { id: id as string },
      data: { 
        role: role as any,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        name: name as string,
        email: email as string
      }
    });

    if (role && oldUser.role !== role) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          userRole: req.user.role,
          action: 'ROLE_CHANGE',
          details: `Changed role for ${user.name} from ${oldUser.role} to ${role}`,
          status: 'SUCCESS'
        }
      });
    }

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

    const passwordStr = password as string;
    if (!passwordStr || passwordStr.trim().length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const hashedPassword = await bcrypt.hash(passwordStr, 10);

    const user = await prisma.user.update({
      where: { id: id as string },
      data: { password: hashedPassword }
    });

    res.json({ message: `Password reset successfully for ${user.name}` });
  } catch (error: any) {
    console.error('Password reset backend error:', error);
    res.status(400).json({ error: 'Failed to reset password', details: error?.message });
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

    // Delete associated member records to prevent foreign key violation
    await prisma.member.deleteMany({
      where: { userId: id }
    });

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete user' });
  }
});

// Audit Logs (Admin, Secretary, Treasurer)
router.get('/audit-logs', authenticate, authorize(['ADMIN', 'SECRETARY', 'TREASURER']), async (req, res) => {
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
