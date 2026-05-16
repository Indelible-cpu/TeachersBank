import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { trackActivity } from '../middleware/audit.middleware';

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
