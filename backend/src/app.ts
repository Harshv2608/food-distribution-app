import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './auth/auth.routes';
import profileRoutes from './profiles/profiles.routes';
import donationRoutes from './donations/donations.routes';
import claimsRoutes from './claims/claims.routes';
import adminRoutes from './admin/admin.routes';
import notificationsRoutes from './notifications/notifications.routes';
import ratingsRoutes from './ratings/ratings.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploads statically for 7D Photo Verification
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/donations', donationRoutes);
app.use('/api/v1/claims', claimsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/ratings', ratingsRoutes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } });
});

export default app;
