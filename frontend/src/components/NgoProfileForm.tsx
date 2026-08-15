import React, { useState } from 'react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

import { LocationPicker } from './LocationPicker';

export const NgoProfileForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    capacity_kg: '',
    max_pickup_radius_km: '10',
    needs_description: '',
    food_categories: [] as string[],
    lat: '',
    lng: ''
  });
  
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const CATEGORIES = ['COOKED_MEALS', 'RICE', 'VEGETABLES', 'FRUITS', 'BAKERY', 'PACKAGED_FOOD', 'DAIRY', 'OTHER'];

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profiles/me');
        const data = res.data.data;
        if (data && data.lat !== undefined && data.lng !== undefined) {
          setFormData({
            capacity_kg: data.capacity_kg ? data.capacity_kg.toString() : '',
            max_pickup_radius_km: data.max_pickup_radius_km ? data.max_pickup_radius_km.toString() : '10',
            needs_description: data.needs_description || '',
            food_categories: data.food_categories || [],
            lat: data.lat?.toString() || '',
            lng: data.lng?.toString() || ''
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLocationChange = (loc: any) => {
    setFormData(prev => ({ ...prev, lat: loc.latitude.toString(), lng: loc.longitude.toString() }));
  };

  const handleCategoryToggle = (cat: string) => {
    setFormData(prev => {
      if (prev.food_categories.includes(cat)) {
        return { ...prev, food_categories: prev.food_categories.filter(c => c !== cat) };
      }
      return { ...prev, food_categories: [...prev.food_categories, cat] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lat || !formData.lng) {
      showToast('Please select your location on the map.', 'error');
      return;
    }

    setLoading(true);
    
    const payload = {
      capacity_kg: parseFloat(formData.capacity_kg),
      max_pickup_radius_km: parseInt(formData.max_pickup_radius_km, 10),
      needs_description: formData.needs_description,
      food_categories: formData.food_categories,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng)
    };

    try {
      await api.put('/profiles/ngo', payload);
      showToast('Profile updated successfully!', 'success');
      setTimeout(() => onSuccess(), 1500);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Update Organization Needs</h3>
      <p className="text-secondary mb-6">Set your requirements to receive high-accuracy food donation recommendations.</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>Headquarters Location (Required)</label>
          <LocationPicker 
            initialLocation={formData.lat && formData.lng ? { latitude: parseFloat(formData.lat), longitude: parseFloat(formData.lng) } : undefined} 
            onChange={handleLocationChange} 
          />
        </div>
        
        <div className="flex gap-4">
          <div className="w-full">
            <label>Current Capacity (kg)</label>
            <input type="number" name="capacity_kg" value={formData.capacity_kg} onChange={handleChange} className="glass-input mt-2" required min="1" step="0.1" />
          </div>
          <div className="w-full">
            <label>Pickup Radius (km)</label>
            <input type="number" name="max_pickup_radius_km" value={formData.max_pickup_radius_km} onChange={handleChange} className="glass-input mt-2" required min="1" max="500" />
          </div>
        </div>

        <div>
          <label>Food Categories Required</label>
          <div className="grid mt-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
            {CATEGORIES.map(cat => (
              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: formData.food_categories.includes(cat) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', border: `1px solid ${formData.food_categories.includes(cat) ? 'var(--accent)' : 'transparent'}` }}>
                <input type="checkbox" checked={formData.food_categories.includes(cat)} onChange={() => handleCategoryToggle(cat)} />
                <span style={{ fontSize: '0.9rem' }}>{cat.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label>Additional Needs Description</label>
          <textarea name="needs_description" value={formData.needs_description} onChange={handleChange} className="glass-input mt-2" rows={3}></textarea>
        </div>

        <button type="submit" className="btn btn-primary mt-2" disabled={loading}>
          {loading ? 'Saving...' : 'Save Profile Needs'}
        </button>
      </form>
    </div>
  );
};
