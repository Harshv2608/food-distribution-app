import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogOut, Star, Search, User, ClipboardList, MapPin, Clock, Package } from 'lucide-react';
import api from '../api/api';
import { NgoProfileForm } from '../components/NgoProfileForm';

export const NgoDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'DISCOVERY' | 'PROFILE' | 'CLAIMS'>('MATCHES');
  
  const [matches, setMatches] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'MATCHES') fetchMatches();
    if (activeTab === 'CLAIMS') fetchClaims();
  }, [activeTab]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/donations/matches');
      setMatches(res.data.data);
      setNeedsProfile(false);
    } catch (err: any) {
      if (err.response?.data?.error?.code === 'NGO_PROFILE_REQUIRED') {
        setNeedsProfile(true);
      } else {
        showToast('Failed to load matches', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await api.get('/donations?claims_only=true');
      setClaims(res.data.data);
    } catch (err) {
      showToast('Failed to load active claims', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <nav className="nav-mobile-wrap" style={{ display: 'flex', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <h2 style={{ margin: 0 }}>NGO Dashboard</h2>
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
            className={`btn ${activeTab === 'MATCHES' ? 'btn-primary' : 'btn-secondary'} flex-shrink-0`}
            onClick={() => setActiveTab('MATCHES')}
            style={{ justifyContent: 'flex-start' }}
          >
            <Star size={18} /> Recommendations
          </button>
          <button 
            className={`btn ${activeTab === 'CLAIMS' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('CLAIMS')}
            style={{ justifyContent: 'flex-start' }}
          >
            <ClipboardList size={18} /> Active Claims
          </button>
          <button 
            className={`btn ${activeTab === 'DISCOVERY' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('DISCOVERY')}
            style={{ justifyContent: 'flex-start' }}
          >
            <Search size={18} /> Map Discovery
          </button>
          <button 
            className={`btn ${activeTab === 'PROFILE' ? 'btn-primary' : 'btn-secondary'} flex-shrink-0`}
            onClick={() => setActiveTab('PROFILE')}
            style={{ justifyContent: 'flex-start' }}
          >
            <User size={18} /> Organization Profile
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
                  Based on successful claims, reliability, and ratings.
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
            {activeTab === 'PROFILE' && (
              <NgoProfileForm onSuccess={() => setActiveTab('MATCHES')} />
            )}

            {activeTab === 'MATCHES' && (
              <div>
                <h3 style={{ marginBottom: '24px' }}>Recommended For You</h3>
                
                {needsProfile ? (
                  <div style={{ padding: '24px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', borderRadius: '8px', color: 'var(--warning)', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 16px', color: 'var(--warning)' }}>You need to configure your capacity and food needs before we can generate matches.</p>
                    <button onClick={() => setActiveTab('PROFILE')} className="btn btn-secondary">Configure Needs</button>
                  </div>
                ) : loading ? (
                  <div className="grid animate-pulse" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="glass-panel" style={{ height: '250px' }}></div>
                    ))}
                  </div>
                ) : matches.length === 0 ? (
                  <p className="text-muted">No highly relevant donations found at this time.</p>
                ) : (
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                    {matches.map(m => (
                      <div key={m.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{m.food_category}</h4>
                            <div className="text-muted mt-1" style={{ fontSize: '0.9rem' }}>{m.quantity_kg} kg available</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '6px 12px', borderRadius: '16px', fontWeight: 'bold' }}>
                            ★ {m.match_score}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {m.match_reasons.map((reason: string, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              {reason.includes('km away') && <MapPin size={14} color="var(--accent)" />}
                              {reason.includes('Expires') && <Clock size={14} color="var(--warning)" />}
                              {reason.includes('capacity') && <Package size={14} color="var(--success)" />}
                              {reason.includes('category') && <Star size={14} color="var(--success)" />}
                              {reason}
                            </div>
                          ))}
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-800">
                          <button onClick={() => navigate(`/donations/${m.id}`)} className="btn btn-primary w-full">
                            Review & Claim
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'DISCOVERY' && (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <Search size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
                <h3>Radius Discovery</h3>
                <p className="text-muted">The Map Discovery UI utilizing the GET /donations endpoint with lat/lng constraints will be implemented here.</p>
              </div>
            )}
            
            {activeTab === 'CLAIMS' && (
              <div>
                <h3 style={{ marginBottom: '24px' }}><ClipboardList size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }}/> Active Claims</h3>
                {loading ? (
                  <div className="flex flex-col gap-4 animate-pulse">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="glass-panel" style={{ height: '100px' }}></div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {claims.length === 0 ? <p className="text-muted">You have no active claims. Check Recommendations to claim donations!</p> : null}
                    
                    {claims.map(c => (
                      <div key={c.id} className="glass-panel flex-col-mobile" style={{ padding: '16px', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                        <div className="w-full-mobile">
                          <h4 style={{ margin: 0, color: 'var(--accent)' }}>{c.food_category} - {c.quantity_kg} kg</h4>
                          <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>Status: <strong>{c.status}</strong></p>
                          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.description}</p>
                        </div>
                        
                        <div className="flex gap-2 flex-wrap-mobile w-full-mobile">
                          <button onClick={() => navigate(`/donations/${c.id}`)} className="btn btn-secondary w-full-mobile" style={{ padding: '8px 16px', fontSize: '0.9rem', flex: 1 }}>
                            View Details / Act
                          </button>
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
