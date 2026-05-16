import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

export const trackActivity = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // We'll track the activity after the response is sent
    const originalJson = res.json;
    res.json = function (data: any) {
      const user = (req as any).user;
      if (user && res.statusCode >= 200 && res.statusCode < 300) {
        prisma.auditLog.create({
          data: {
            userId: user.id,
            action,
            details: JSON.stringify({
              method: req.method,
              path: req.path,
              params: req.params,
              body: req.body,
              timestamp: new Date().toISOString()
            })
          }
        }).catch((err: any) => console.error('Failed to log activity:', err));
      }
      return originalJson.call(this, data);
    };
    next();
  };
};
