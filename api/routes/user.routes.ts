import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { trackActivity } from '../middleware/audit.middleware';

const router = Router();

// Get all users (Admin only)
router.get('/', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
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
router.patch('/:id', authenticate, authorize(['ADMIN']), trackActivity('UPDATE_USER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
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

// Delete user (Admin only)
router.delete('/:id', authenticate, authorize(['ADMIN']), trackActivity('DELETE_USER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if user is deleting themselves
    if ((req as any).user.id === id) {
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
router.get('/audit-logs', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
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
