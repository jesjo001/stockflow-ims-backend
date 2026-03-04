import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog.model';
import { logger } from '../config/logger';

export const auditLog = (action: string, model: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    (res as any).send = function(...args: any[]) {
      if (req.user && res.statusCode >= 200 && res.statusCode < 300) {
        AuditLog.create({
          user: req.user._id,
          action,
          targetModel: model,
          documentId: (req as any).params?.id || (JSON.parse(args[0]))?.data?.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          after: req.body
        }).catch(err => logger.error('Audit Log Error:', err));
      }
      return originalSend.apply(res, args);
    };
    next();
  };
};
