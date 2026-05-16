import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

export const trackActivity = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = new Date();
    const user = (req as any).user;

    // We use the 'finish' event to log when the request is done
    res.on('finish', async () => {
      if (user) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              userRole: user.role,
              action: action,
              details: JSON.stringify({
                method: req.method,
                path: req.path,
                status: res.statusCode,
                params: req.params,
                query: req.query,
                // We avoid logging full body for security/size unless needed
              }),
              startTime: startTime,
              endTime: new Date(),
              status: res.statusCode < 400 ? 'SUCCESS' : 'FAILED',
              ipAddress: req.ip || req.socket.remoteAddress,
            }
          });
        } catch (error) {
          console.error('Failed to log activity:', error);
        }
      }
    });

    next();
  };
};
