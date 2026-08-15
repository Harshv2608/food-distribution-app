import { Router } from 'express';
import { register, login, getMe, googleLogin } from './auth.controller';
import { authenticate } from '../shared/middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', authenticate, getMe);

export default router;
