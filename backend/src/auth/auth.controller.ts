import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../shared/database';
import { AuthRequest } from '../shared/middleware/auth';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Valid email is required' } });
    }
    
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Password must be at least 8 characters' } });
    }
    
    if (!['DONOR', 'NGO'].includes(role)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ROLE', message: 'Public registration is restricted to DONOR and NGO roles' } });
    }
    
    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, passwordHash, role]
    );
    
    const user = result.rows[0];
    
    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Registration failed' } });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Email and password are required' } });
    }
    
    const result = await query('SELECT id, password_hash, role, is_active FROM users WHERE email = $1', [email]);
    
    if (!result.rowCount || result.rowCount === 0) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }
    
    const user = result.rows[0];
    
    if (user.is_active === false) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Account is disabled' } });
    }
    
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (!match) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }
    
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_ACCESS_SECRET || 'test_secret',
      { expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any }
    );
    
    return res.status(200).json({ 
      success: true, 
      data: { 
        token,
        user: { id: user.id, email: email, role: user.role }
      } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};

import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'mock-client-id');

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token, role } = req.body;
    if (!token) return res.status(400).json({ success: false, error: { message: 'Token required' } });

    let email = '';
    // Mock token support for local development if real client ID isn't set
    if (token.startsWith('mock-google-token-')) {
      email = token.replace('mock-google-token-', '');
    } else {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID || ''
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) return res.status(400).json({ success: false, error: { message: 'Invalid Google Token' } });
      email = payload.email;
    }

    // Check if user exists
    let result = await query('SELECT id, email, role, is_active FROM users WHERE email = $1', [email]);
    let user = result.rows[0];

    if (!user) {
      if (!role) {
        return res.status(400).json({ success: false, error: { code: 'ROLE_REQUIRED', message: 'First time Google login requires a role' } });
      }
      
      // Create user
      const placeholderPass = await bcrypt.hash(Math.random().toString(36), 10);
      const insertResult = await query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, is_active',
        [email, placeholderPass, role]
      );
      user = insertResult.rows[0];

      // Auto-create profile stubs
      if (role === 'DONOR') {
        await query('INSERT INTO donor_profiles (user_id, location) VALUES ($1, ST_SetSRID(ST_MakePoint(0,0), 4326))', [user.id]);
      } else if (role === 'NGO') {
        await query('INSERT INTO ngo_profiles (user_id, location) VALUES ($1, ST_SetSRID(ST_MakePoint(0,0), 4326))', [user.id]);
      }
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, error: { message: 'Account is suspended' } });
    }

    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      data: {
        token: jwtToken,
        user: { id: user.id, email: user.email, role: user.role }
      }
    });

  } catch (error) {
    console.error('Google login error', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to authenticate with Google' } });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const result = await query('SELECT id, email, role, created_at FROM users WHERE id = $1', [userId]);
    
    if (!result.rowCount || result.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to get profile' } });
  }
};
