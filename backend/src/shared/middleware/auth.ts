import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../database';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Malformed authorization header' } });
  }
  try {
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'test_secret';
    // Explicitly enforce HS256 algorithm
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any;
    
    // Check if user exists and is active, fetching current role from DB
    const result = await query('SELECT role, is_active FROM users WHERE id = $1', [decoded.sub]);
    
    if (!result.rowCount || result.rowCount === 0) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not found' } });
    }
    
    if (result.rows[0].is_active === false) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Account is disabled' } });
    }

    req.user = {
      userId: decoded.sub,
      role: result.rows[0].role,
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' } });
    }
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or malformed token' } });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    
    next();
  };
};
