import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogOut, Plus, List, Package, Star } from 'lucide-react';
import api from '../api/api';
import { DonationForm } from '../components/DonationForm';

export const DonorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'MY_DONATIONS' | 'CREATE'>('MY_DONATIONS');
  const [reDonateData, setReDonateData] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profiles/me');
        setProfileData(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, []);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/donations');
      setDonations(res.data.data);
    } catch (err: any) {
      showToast('Failed to load donations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'MY_DONATIONS') {
      fetchDonations();
      setReDonateData(null); // Clear re-donate data when switching back
    }
  }, [activeTab]);

  const handleCancel = async (id: string) => {
    try {
      await api.post(`/donations/${id}/cancel`);
      showToast('Donation cancelled successfully', 'success');
      fetchDonations();
    } catch (error: any) {
      showToast(error.response?.data?.error?.message || 'Failed to cancel donation', 'error');
    }
  };

  const handleReDonate = (d: any) => {
    setReDonateData(d);
    setActiveTab('CREATE');
  };

  return (
    <div className="min-h-screen">
      <nav className="nav-mobile-wrap" style={{ display: 'flex', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <h2 style={{ margin: 0 }}>Donor Dashboard</h2>
        <div className="flex items-center gap-6">
          <span className="text-secondary">{user?.email}</span>
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </nav>

      <div className="container mt-8 flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
          <button 
            className={`btn ${activeTab === 'MY_DONATIONS' ? 'btn-primary' : 'btn-secondary'} flex-shrink-0`}
            onClick={() => setActiveTab('MY_DONATIONS')}
            style={{ justifyContent: 'flex-start' }}
          >
            <List size={18} /> My Donations
          </button>
          <button 
            className={`btn ${activeTab === 'CREATE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setReDonateData(null);
              setActiveTab('CREATE');
            }}
            style={{ justifyContent: 'flex-start' }}
          >
            <Plus size={18} /> Create Donation
          </button>
        </aside>

        {/* Main Content */}
        <main className="w-full">
          {profileData?.stats && (
            <div className="glass-panel mb-6" style={{ padding: '24px', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', alignItems: 'center', background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(16,185,129,0.1))' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h3 className="text-secondary" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={16} /> Trust & Impact Score
                </h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, margin: '8px 0', color: 'var(--accent)' }}>
                  {profileData.stats.impactScore}
                </div>
                <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                  Based on completions, rescues, and ratings.
                </div>
              </div>
              
              <div style={{ flex: 1, minWidth: '150px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '24px' }}>
                <h3 className="text-secondary" style={{ fontSize: '1rem', marginBottom: '8px' }}>Current Tier</h3>
                <div style={{ 
                  display: 'inline-block', padding: '8px 16px', borderRadius: '24px', fontWeight: 'bold',
                  background: profileData.stats.badgeTier === 'GOLD' ? 'rgba(251, 191, 36, 0.2)' : profileData.stats.badgeTier === 'SILVER' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(217, 119, 6, 0.2)',
                  color: profileData.stats.badgeTier === 'GOLD' ? '#FCD34D' : profileData.stats.badgeTier === 'SILVER' ? '#E5E7EB' : '#F59E0B'
                }}>
                  {profileData.stats.badgeTier === 'GOLD' ? '🥇' : profileData.stats.badgeTier === 'SILVER' ? '🥈' : '🥉'} {profileData.stats.badgeTier}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: '150px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '24px' }}>
                <h3 className="text-secondary" style={{ fontSize: '1rem', marginBottom: '8px' }}>Avg Rating</h3>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {profileData.stats.avgRating > 0 ? `★ ${profileData.stats.avgRating.toFixed(1)}` : 'No ratings yet'}
                </div>
              </div>
            </div>
          )}

          <div className="glass-panel">
            {activeTab === 'CREATE' && (
              <DonationForm onSuccess={() => setActiveTab('MY_DONATIONS')} initialData={reDonateData} />
            )}

            {activeTab === 'MY_DONATIONS' && (
              <div>
                <h3 style={{ marginBottom: '24px' }}><Package size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }}/> Active Donations</h3>
                {loading ? (
                  <div className="flex flex-col gap-4 animate-pulse">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="glass-panel" style={{ height: '100px' }}></div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {donations.length === 0 ? <p className="text-muted">No donations found. Create one to get started!</p> : null}
                    
                    {donations.map(d => (
                      <div key={d.id} className="glass-panel flex-col-mobile" style={{ padding: '16px', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                        <div className="w-full-mobile">
                          <h4 style={{ margin: 0, color: 'var(--accent)' }}>{d.food_category} - {d.quantity_kg} kg</h4>
                          <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>Status: <strong>{d.status}</strong></p>
                          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.description}</p>
                          {d.risk_level && (
                            <span style={{ display: 'inline-block', marginTop: '8px', padding: '4px 8px', borderRadius: '4px', background: d.risk_level === 'LOW' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: d.risk_level === 'LOW' ? 'var(--success)' : 'var(--warning)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                              {d.risk_level === 'LOW' ? '🟢' : '🟡'} {d.risk_level} RISK
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-2 flex-wrap-mobile w-full-mobile">
                          {(d.status === 'COMPLETED' || d.status === 'CANCELLED' || d.status === 'PICKED_UP') && (
                            <button onClick={() => handleReDonate(d)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', flex: 1 }}>
                              <Plus size={16} style={{ display: 'inline', marginRight: '4px' }}/> Donate Again
                            </button>
                          )}
                          <button onClick={() => navigate(`/donations/${d.id}`)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem', flex: 1 }}>
                            View Details
                          </button>
                          {d.status === 'AVAILABLE' && (
                            <button onClick={() => handleCancel(d.id)} className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', flex: 1 }}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
