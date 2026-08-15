import { Request, Response } from 'express';
import { query } from '../shared/database';
import { AuthRequest } from '../shared/middleware/auth';

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await query(
      'SELECT id, title, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: 'Internal error' } });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationId = req.params.id;
    await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: 'Internal error' } });
  }
};
