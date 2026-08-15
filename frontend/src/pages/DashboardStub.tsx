import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export const DashboardStub: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
        <h2>Welcome to the {user?.role} Dashboard</h2>
        <p>This is a protected route. Only authorized {user?.role}s can view this page.</p>
        
        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          <pre style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <button onClick={logout} className="btn btn-secondary mt-8">
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  );
};
