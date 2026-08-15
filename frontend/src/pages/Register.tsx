import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import api from '../api/api';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const location = useLocation();
  const [role, setRole] = useState<'DONOR' | 'NGO'>(location.state?.role || 'DONOR');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/register', { email, password, role });
      if (res.data.success) {
        // Automatically redirect to login upon successful registration
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: 'linear-gradient(to bottom, rgba(10, 12, 16, 0.8), rgba(10, 12, 16, 1)), url("https://images.unsplash.com/photo-1556910103-1c02745a872f?q=80&w=2070&auto=format&fit=crop")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', margin: '24px', padding: '40px 32px' }}>
        <div className="flex flex-col items-center gap-4">
          <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', color: 'var(--accent)', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
            <UserPlus size={32} />
          </div>
          <h2 style={{ color: '#fff' }}>Create Account</h2>
          <p>Join the food rescue mission</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
          <div>
            <select
              className="glass-input"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="DONOR">I am a Donor (Restaurant/Store)</option>
              <option value="NGO">I am an NGO (Food Bank)</option>
            </select>
          </div>
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
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <span className="text-danger">{error}</span>}

          <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading} style={{ background: 'linear-gradient(135deg, var(--success), #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
          <button 
            onClick={async () => {
              if (!email) {
                setError('Please enter your email above before using Mock Google Login.');
                return;
              }
              try {
                const res = await api.post('/auth/google', { token: `mock-google-token-${email}`, role: role });
                const { token, user } = res.data.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                window.dispatchEvent(new Event('storage'));
                window.location.href = user.role === 'ADMIN' ? '/admin' : `/${user.role.toLowerCase()}`;
              } catch (err) {
                setError('Google registration failed.');
              }
            }}
            className="btn btn-secondary w-full" 
            style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: '20px' }} />
            Sign up with Google
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};
