import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Package, MapPin, Clock, Info, ShieldAlert, ArrowLeft } from 'lucide-react';

export const DonationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [donation, setDonation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string, message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const fetchDonation = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/donations/${id}`);
      setDonation(res.data.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError({ code: 'NOT_FOUND', message: 'Donation not found' });
      } else if (err.response?.status === 403) {
        setError({ code: 'FORBIDDEN', message: 'You do not have permission to view this donation' });
      } else {
        setError({ code: 'SERVER_ERROR', message: 'Failed to fetch donation details' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonation();
  }, [id]);

  const handleAction = async (endpoint: string) => {
    try {
      setActionLoading(true);
      await api.post(`/donations/${id}/${endpoint}`);
      await fetchDonation();
    } catch (err: any) {
      if (err.response?.status === 409) {
        showToast(err.response.data.error.message || 'Donation state has changed. Refreshing...', 'error');
        await fetchDonation();
      } else {
        showToast(err.response?.data?.error?.message || 'Action failed', 'error');
      }
      } finally {
        setActionLoading(false);
      }
    };
  
    const handleRate = async () => {
      if (rating < 1 || rating > 5) {
        showToast('Please select a star rating', 'error');
        return;
      }
      try {
        setActionLoading(true);
        await api.post(`/ratings/donations/${id}`, { rating, review });
        showToast('Rating submitted successfully', 'success');
        setRatingSubmitted(true);
      } catch (err: any) {
        showToast(err.response?.data?.error?.message || 'Failed to submit rating', 'error');
      } finally {
        setActionLoading(false);
      }
    };
  
    if (loading) return (
    <div className="container mt-8 flex flex-col gap-6 animate-pulse">
      <div style={{ width: '100px', height: '40px', background: 'var(--bg-card)', borderRadius: '8px' }}></div>
      <div className="flex gap-6 flex-col md:flex-row">
        <div className="w-full glass-panel" style={{ flex: 2, height: '400px' }}></div>
        <div className="w-full flex flex-col gap-6" style={{ flex: 1 }}>
          <div className="glass-panel" style={{ height: '200px' }}></div>
          <div className="glass-panel" style={{ height: '150px' }}></div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="container mt-8">
      <div className="glass-panel text-center">
        <h2 className="text-danger">{error.code}</h2>
        <p>{error.message}</p>
        <button onClick={() => navigate(-1)} className="btn btn-secondary mt-4">Go Back</button>
      </div>
    </div>
  );
  if (!donation) return null;

  return (
    <div className="container mt-8">
      <button onClick={() => navigate(-1)} className="btn btn-secondary mb-6" style={{ padding: '8px 16px' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex gap-6 flex-col md:flex-row">
        {/* Main Details */}
        <div className="w-full glass-panel" style={{ flex: 2 }}>
          <div className="flex justify-between items-center mb-6">
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={28} color="var(--accent)" />
              {donation.food_category}
            </h1>
            <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px', fontWeight: 'bold' }}>
              {donation.status}
            </span>
          </div>

          <p className="text-primary text-lg">{donation.description}</p>
          
          <div className="mt-8 grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div className="text-muted mb-1"><Info size={14} style={{ display: 'inline', marginRight: '4px' }}/> Quantity</div>
              <div className="font-bold text-lg">{donation.quantity_kg} kg</div>
            </div>
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div className="text-muted mb-1"><MapPin size={14} style={{ display: 'inline', marginRight: '4px' }}/> Location</div>
              <div className="font-bold text-lg">{donation.lat.toFixed(4)}, {donation.lng.toFixed(4)}</div>
            </div>
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div className="text-muted mb-1"><Package size={14} style={{ display: 'inline', marginRight: '4px' }}/> Storage</div>
              <div className="font-bold text-lg">{donation.storage_condition}</div>
            </div>
          </div>

          <div className="mt-8 glass-panel" style={{ padding: '24px', background: 'rgba(0,0,0,0.2)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Clock size={20} /> Timeline
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)' }}>
              <li><strong>Prepared At:</strong> {new Date(donation.prepared_at).toLocaleString()}</li>
              <li><strong>Available Window:</strong> {new Date(donation.available_from).toLocaleString()} - {new Date(donation.available_until).toLocaleString()}</li>
              <li><strong>Usable Until:</strong> {new Date(donation.usable_until).toLocaleString()}</li>
            </ul>
          </div>

          {donation.images && donation.images.length > 0 && (
            <div className="mt-8 glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                📷 Food Verification Photos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {donation.images.map((img: string, idx: number) => (
                  <img 
                    key={idx} 
                    src={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : 'http://localhost:3000'}${img}`} 
                    alt={`Donation ${idx + 1}`} 
                    style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / Actions / Risk */}
        <div className="w-full flex flex-col gap-6" style={{ flex: 1 }}>
          
          {/* Risk Assessment */}
          {donation.risk_level && (
            <div className="glass-panel" style={{ border: `1px solid ${donation.risk_level === 'LOW' ? 'var(--success)' : 'var(--warning)'}` }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <ShieldAlert size={20} /> Food Safety Assessment
              </h3>
              
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: donation.risk_level === 'LOW' ? 'var(--success)' : 'var(--warning)' }}>
                {donation.risk_level === 'LOW' ? '🟢' : '🟡'} {donation.risk_level} RISK
              </div>
              
              {donation.risk_reasons && donation.risk_reasons.length > 0 && (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {donation.risk_reasons.map((reason: string, i: number) => (
                    <li key={i} style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ color: 'var(--success)' }}>✓</span> {reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Lifecycle Actions */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px' }}>Actions</h3>
            
            <div className="flex flex-col gap-4">
              {donation.status === 'AVAILABLE' && user?.role === 'DONOR' && (
                <button onClick={() => handleAction('cancel')} disabled={actionLoading} className="btn w-full" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {actionLoading ? 'Processing...' : 'Cancel Donation'}
                </button>
              )}

              {donation.status === 'AVAILABLE' && user?.role === 'NGO' && (
                <button onClick={() => handleAction('claim')} disabled={actionLoading} className="btn btn-primary w-full">
                  {actionLoading ? 'Processing...' : 'Claim Donation'}
                </button>
              )}

              {donation.status === 'CLAIMED' && (
                <>
                  <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Status</p>
                    <p style={{ margin: '4px 0 0', fontWeight: 'bold' }}>{donation.status}</p>
                  </div>
                  <button onClick={() => handleAction('pickup-assigned')} disabled={actionLoading} className="btn btn-primary w-full">
                    {actionLoading ? 'Processing...' : 'Assign Pickup'}
                  </button>
                </>
              )}

              {donation.status === 'PICKUP_ASSIGNED' && (
                <>
                  <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: '8px', textAlign: 'center' }}>
                    Pickup Assigned
                  </div>
                  {user?.role === 'NGO' && (
                    <button onClick={() => handleAction('picked-up')} disabled={actionLoading} className="btn btn-primary w-full">
                      {actionLoading ? 'Processing...' : 'Mark Picked Up'}
                    </button>
                  )}
                </>
              )}

              {donation.status === 'PICKED_UP' && (
                <>
                  <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '8px', textAlign: 'center' }}>
                    Food Picked Up
                  </div>
                  {user?.role === 'NGO' && (
                    <button onClick={() => handleAction('complete')} disabled={actionLoading} className="btn btn-primary w-full" style={{ background: 'linear-gradient(135deg, var(--success), #059669)' }}>
                      {actionLoading ? 'Processing...' : 'Mark Completed'}
                    </button>
                  )}
                </>
              )}

              {['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(donation.status) && (
                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', borderRadius: '8px', textAlign: 'center' }}>
                  This donation is {donation.status.toLowerCase()} and read-only.
                </div>
              )}
            </div>
          </div>

          {/* Rating Section */}
          {(donation.status === 'COMPLETED' || donation.status === 'PICKED_UP') && user && (
            <div className="glass-panel mt-6">
              <h3 style={{ marginBottom: '16px' }}>Rescue Completed 🎉</h3>
              {ratingSubmitted ? (
                <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '8px', textAlign: 'center' }}>
                  ✓ Rating submitted successfully
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-secondary text-sm">How was your experience with this rescue?</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        onClick={() => setRating(star)}
                        style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: star <= rating ? 'var(--accent)' : 'var(--border)' }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea 
                    placeholder="Write an optional review..." 
                    className="glass-input" 
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    rows={3}
                  />
                  <button onClick={handleRate} disabled={actionLoading || rating === 0} className="btn btn-primary w-full">
                    {actionLoading ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
