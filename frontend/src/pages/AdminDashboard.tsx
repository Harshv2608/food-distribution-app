import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';
import { ShieldAlert, Users, LayoutDashboard, FileText, Star, Trash2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, donationsRes, ratingsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/donations'),
        api.get('/admin/ratings')
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data);
      setDonations(donationsRes.data.data);
      setRatings(ratingsRes.data.data);
    } catch (err) {
      showToast('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleUpdateUser = async (id: string, updates: any) => {
    try {
      await api.put(`/admin/users/${id}`, updates);
      showToast('User updated successfully', 'success');
      fetchAllData();
    } catch (err) {
      showToast('Failed to update user', 'error');
    }
  };

  const handleDeleteRating = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this rating?')) return;
    try {
      await api.delete(`/admin/ratings/${id}`);
      showToast('Rating deleted', 'success');
      fetchAllData();
    } catch (err) {
      showToast('Failed to delete rating', 'error');
    }
  };

  if (loading) return <div className="container mt-8 text-center animate-pulse">Loading Super Controls...</div>;

  return (
    <div className="container mt-8">
      <div className="flex items-center gap-4 mb-8">
        <ShieldAlert size={36} color="var(--danger)" />
        <div>
          <h2>Admin Super Controls</h2>
          <p className="text-secondary" style={{ margin: 0 }}>System Management & Audit Logs</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8 border-b border-gray-800 pb-2 overflow-x-auto">
        <button onClick={() => setActiveTab('overview')} className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}><LayoutDashboard size={18}/> Overview</button>
        <button onClick={() => setActiveTab('users')} className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}><Users size={18}/> Users & Verification</button>
        <button onClick={() => setActiveTab('transactions')} className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}><FileText size={18}/> Global Transactions</button>
        <button onClick={() => setActiveTab('ratings')} className={`btn ${activeTab === 'ratings' ? 'btn-primary' : 'btn-secondary'}`}><Star size={18}/> Ratings Audit</button>
      </div>

      {activeTab === 'overview' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel text-center">
            <h1 style={{ color: 'var(--accent)', fontSize: '3rem' }}>{stats.total_donors}</h1>
            <p>Total Donors</p>
          </div>
          <div className="glass-panel text-center">
            <h1 style={{ color: 'var(--accent)', fontSize: '3rem' }}>{stats.total_ngos}</h1>
            <p>Total NGOs</p>
          </div>
          <div className="glass-panel text-center">
            <h1 style={{ color: 'var(--warning)', fontSize: '3rem' }}>{stats.active_donations}</h1>
            <p>Active Donations</p>
          </div>
          <div className="glass-panel text-center">
            <h1 style={{ color: 'var(--success)', fontSize: '3rem' }}>{stats.food_rescued_kg}</h1>
            <p>Kg Food Rescued</p>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="mb-4">User Management</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">NGO Verified</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.user_id} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <td className="p-4">{u.email}</td>
                    <td className="p-4">{u.role}</td>
                    <td className="p-4">{u.is_active ? <span className="text-success">Active</span> : <span className="text-danger">Suspended</span>}</td>
                    <td className="p-4">{u.role === 'NGO' ? (u.ngo_verified ? 'Yes' : 'No') : 'N/A'}</td>
                    <td className="p-4 flex gap-2">
                      <button onClick={() => handleUpdateUser(u.user_id, { is_active: !u.is_active })} className="btn btn-secondary text-sm" style={{ padding: '8px 12px' }}>
                        {u.is_active ? 'Suspend' : 'Activate'}
                      </button>
                      {u.role === 'NGO' && (
                        <button onClick={() => handleUpdateUser(u.user_id, { ngo_verified: !u.ngo_verified })} className="btn btn-secondary text-sm" style={{ padding: '8px 12px' }}>
                          {u.ngo_verified ? 'Revoke' : 'Verify'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="mb-4">Global Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <th className="p-4">ID</th>
                  <th className="p-4">Donor Email</th>
                  <th className="p-4">Food</th>
                  <th className="p-4">Qty (kg)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {donations.map(d => (
                  <tr key={d.id} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <td className="p-4 text-sm text-gray-400">{d.id.split('-')[0]}...</td>
                    <td className="p-4">{d.donor_email}</td>
                    <td className="p-4">{d.food_category}</td>
                    <td className="p-4">{d.quantity_kg}</td>
                    <td className="p-4">{d.status}</td>
                    <td className="p-4">{d.risk_level === 'LOW' ? <span className="text-success">LOW</span> : <span className="text-danger">{d.risk_level}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ratings' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="mb-4">Ratings Audit Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <th className="p-4">Rater</th>
                  <th className="p-4">Rated User</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Review</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map(r => (
                  <tr key={r.id} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <td className="p-4">{r.rater_email}</td>
                    <td className="p-4">{r.rated_email}</td>
                    <td className="p-4 text-warning">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</td>
                    <td className="p-4 text-sm text-gray-400">{r.review || 'No written review'}</td>
                    <td className="p-4">
                      <button onClick={() => handleDeleteRating(r.id)} className="btn btn-secondary text-danger" style={{ padding: '8px 12px' }} title="Delete fraudulent rating">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
