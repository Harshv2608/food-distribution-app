import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const { user, token } = res.data.data;
        login(user, token);
        
        // Role-based navigation handled by AuthContext effectively, but we can direct here:
        if (user.role === 'DONOR') navigate('/donor/dashboard');
        else if (user.role === 'NGO') navigate('/ngo/dashboard');
        else if (user.role === 'ADMIN') navigate('/admin/dashboard');
        else navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: 'linear-gradient(to bottom, rgba(10, 12, 16, 0.8), rgba(10, 12, 16, 1)), url("https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=2070&auto=format&fit=crop")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', margin: '24px', padding: '40px 32px' }}>
        <div className="flex flex-col items-center gap-4">
          <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', color: 'var(--accent)', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
            <LogIn size={32} />
          </div>
          <h2 style={{ color: '#fff' }}>Welcome Back</h2>
          <p>Sign in to your food rescue account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
          <div>
            <input
              type="email"
              className="glass-input"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="password"
              className="glass-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <span className="text-danger">{error}</span>}

          <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
        <button 
          onClick={async () => {
            try {
              const res = await api.post('/auth/google', { token: `mock-google-token-${email || 'donor@example.com'}` });
              const { token, user } = res.data.data;
              localStorage.setItem('token', token);
              localStorage.setItem('user', JSON.stringify(user));
              window.dispatchEvent(new Event('storage'));
              window.location.href = user.role === 'ADMIN' ? '/admin' : `/${user.role.toLowerCase()}`;
            } catch (err) {
              setError('Google login failed or account does not exist. Please register first.');
            }
          }}
          className="btn btn-secondary w-full" 
          style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: '20px' }} />
          Continue with Google
        </button>
      </div>

        <p style={{ textAlign: 'center', marginTop: '24px' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Register</Link>
        </p>
      </div>
    </div>
  );
};
