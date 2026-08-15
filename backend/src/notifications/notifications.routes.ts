import { Router } from 'express';
import { getMyNotifications, markAsRead } from './notifications.controller';
import { authenticate } from '../shared/middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getMyNotifications);
router.put('/:id/read', markAsRead);

export default router;
