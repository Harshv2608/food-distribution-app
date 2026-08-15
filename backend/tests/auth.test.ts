import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import pool, { query } from '../src/shared/database';
import { authenticate, authorize } from '../src/shared/middleware/auth';
import jwt from 'jsonwebtoken';

describe('Authentication Module & RBAC', () => {
  beforeAll(async () => {
    // Ensure DB is alive
    await query('SELECT 1');
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await query('TRUNCATE TABLE claims, donations, volunteer_profiles, ngo_profiles, donor_profiles, users CASCADE;');
  });

  describe('Registration', () => {
    it('should register a valid DONOR and hash password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'donor@test.com', password: 'password123', role: 'DONOR' });
        
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('donor@test.com');
      
      const dbUser = await query('SELECT password_hash FROM users WHERE email = $1', ['donor@test.com']);
      expect(dbUser.rows[0].password_hash).not.toBe('password123'); // Ensure it's hashed
    });

    it('should reject duplicate email', async () => {
      await request(app).post('/api/v1/auth/register').send({ email: 'donor@test.com', password: 'password123', role: 'DONOR' });
      const res = await request(app).post('/api/v1/auth/register').send({ email: 'donor@test.com', password: 'password123', role: 'NGO' });
      
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should reject invalid role (SUPERADMIN)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'bad@test.com', password: 'password123', role: 'SUPERADMIN' });
        
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ROLE');
    });

    it('should reject admin self-registration via public endpoint', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'hacker@test.com', password: 'password123', role: 'ADMIN' });
        
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ROLE');
    });

    it('should reject invalid or missing input fields', async () => {
      const res1 = await request(app).post('/api/v1/auth/register').send({ email: 'no-at-sign.com', password: 'password123', role: 'DONOR' });
      expect(res1.status).toBe(400);
      
      const res2 = await request(app).post('/api/v1/auth/register').send({ email: 'good@test.com', password: 'short', role: 'DONOR' });
      expect(res2.status).toBe(400);
    });
  });

  describe('Login & JWT', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send({ email: 'user@test.com', password: 'password123', role: 'NGO' });
    });

    it('should login with correct credentials and return JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'password123' });
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'wrongpassword' });
        
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject unknown email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'unknown@test.com', password: 'password123' });
        
      expect(res.status).toBe(401);
    });

    it('should reject disabled user accounts', async () => {
      await request(app).post('/api/v1/auth/register').send({ email: 'disabled@test.com', password: 'password123', role: 'DONOR' });
      await query('UPDATE users SET is_active = false WHERE email = $1', ['disabled@test.com']);
      
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'disabled@test.com', password: 'password123' });
        
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/disabled/i);
    });
  });

  describe('Protected Routes & RBAC', () => {
    let token: string;
    
    beforeAll(() => {
      // Setup a dummy route to test RBAC specifically
      app.get('/api/v1/test-admin', authenticate, authorize(['ADMIN']), (req, res) => {
        res.status(200).json({ success: true });
      });
    });
    
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send({ email: 'user@test.com', password: 'password123', role: 'NGO' });
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'user@test.com', password: 'password123' });
      token = res.body.data.token;
    });

    it('should allow access to /me with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
        
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('user@test.com');
      expect(res.body.data.role).toBe('NGO');
    });

    it('should reject missing token (401)', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject malformed token (401)', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });

    it('should enforce RBAC (403 Forbidden)', async () => {
      // Token belongs to NGO, trying to access ADMIN route
      const res = await request(app)
        .get('/api/v1/test-admin')
        .set('Authorization', `Bearer ${token}`);
        
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign({ sub: 'user-id', role: 'NGO' }, 'test_secret', { expiresIn: '-1s' });
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should enforce specific JWT algorithm (HS256)', async () => {
      // Sign with HS512 which is NOT HS256
      const wrongAlgoToken = jwt.sign({ sub: 'user-id', role: 'NGO' }, 'test_secret', { algorithm: 'HS512' });
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${wrongAlgoToken}`);
      
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/malformed/i);
    });
  });
});
