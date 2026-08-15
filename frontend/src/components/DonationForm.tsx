import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { LocationPicker } from './LocationPicker';

export const DonationForm: React.FC<{ onSuccess: () => void, initialData?: any }> = ({ onSuccess, initialData }) => {
  const [formData, setFormData] = useState({
    food_category: initialData?.food_category || 'COOKED_MEALS',
    description: initialData?.description || '',
    quantity_kg: initialData?.quantity_kg || '',
    storage_condition: initialData?.storage_condition || 'ROOM_TEMP',
    lat: initialData?.lat || '',
    lng: initialData?.lng || '',
    prepared_at: '', // Always reset times
    usable_until: '',
    available_from: '',
    available_until: ''
  });
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If no initialData (not a re-donate), try intelligent prefill
    if (!initialData) {
      api.get('/donations/prefill').then(res => {
        if (res.data.success && res.data.data.predicted_kg) {
          setFormData(prev => ({ ...prev, quantity_kg: res.data.data.predicted_kg.toString() }));
        }
      }).catch(console.error);
    }
  }, [initialData]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLocationChange = (loc: any) => {
    setFormData(prev => ({ ...prev, lat: loc.latitude.toString(), lng: loc.longitude.toString() }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (selected.length > 3) {
        setError('Maximum 3 photos allowed.');
        return;
      }
      setImages(selected);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lat || !formData.lng) {
      setError('Please select a pickup location on the map.');
      return;
    }
    setLoading(true);
    setError('');
    
    // Parse numeric fields
    const payload = {
      ...formData,
      quantity_kg: parseFloat(formData.quantity_kg),
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng),
      prepared_at: new Date(formData.prepared_at).toISOString(),
      usable_until: new Date(formData.usable_until).toISOString(),
      available_from: new Date(formData.available_from).toISOString(),
      available_until: new Date(formData.available_until).toISOString(),
    };

    try {
      const res = await api.post('/donations', payload);
      const donationId = res.data.data.id;

      // Upload images if any
      if (images.length > 0) {
        setSuccessMsg('Donation created! Uploading photos...');
        const formDataObj = new FormData();
        images.forEach(img => formDataObj.append('images', img));
        
        await api.post(`/donations/${donationId}/images`, formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setSuccessMsg('Donation created successfully!');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create donation. Check validation rules.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '8px' }}>{initialData ? 'Donate Again' : 'Create New Donation'}</h3>
      {initialData && <p className="text-secondary" style={{ marginBottom: '24px' }}>We've pre-filled your previous donation details. Review them before submitting.</p>}
      {!initialData && <div style={{ marginBottom: '24px' }}></div>}
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        <div className="flex gap-4">
          <div className="w-full">
            <label>Food Category</label>
            <select name="food_category" value={formData.food_category} onChange={handleChange} className="glass-input mt-4" required>
              <option value="COOKED_MEALS">Cooked Meals</option>
              <option value="RICE">Rice</option>
              <option value="VEGETABLES">Vegetables</option>
              <option value="FRUITS">Fruits</option>
              <option value="BAKERY">Bakery</option>
              <option value="PACKAGED_FOOD">Packaged Food</option>
              <option value="DAIRY">Dairy</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="w-full">
            <label>Quantity (kg)</label>
            <input type="number" name="quantity_kg" value={formData.quantity_kg} onChange={handleChange} className="glass-input mt-4" required min="0.1" step="0.1" />
          </div>
        </div>

        <div>
          <label>Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} className="glass-input mt-4" required rows={3}></textarea>
        </div>

        <div className="flex gap-4">
          <div className="w-full">
            <label>Prepared At</label>
            <input type="datetime-local" name="prepared_at" value={formData.prepared_at} onChange={handleChange} className="glass-input mt-4" required />
          </div>
          <div className="w-full">
            <label>Usable Until</label>
            <input type="datetime-local" name="usable_until" value={formData.usable_until} onChange={handleChange} className="glass-input mt-4" required />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-full">
            <label>Available From</label>
            <input type="datetime-local" name="available_from" value={formData.available_from} onChange={handleChange} className="glass-input mt-4" required />
          </div>
          <div className="w-full">
            <label>Available Until</label>
            <input type="datetime-local" name="available_until" value={formData.available_until} onChange={handleChange} className="glass-input mt-4" required />
          </div>
        </div>

        <div className="mt-4">
          <label style={{ display: 'block', marginBottom: '8px' }}>Pickup Location</label>
          <LocationPicker 
            onChange={handleLocationChange} 
            initialLocation={initialData?.lat ? { latitude: initialData.lat, longitude: initialData.lng } : undefined} 
          />
        </div>

        <div className="flex gap-4 mt-4">
          <div className="w-full">
            <label>Storage Condition</label>
            <select name="storage_condition" value={formData.storage_condition} onChange={handleChange} className="glass-input mt-4" required>
              <option value="ROOM_TEMP">Room Temperature</option>
              <option value="FRIDGE">Fridge (Refrigerated)</option>
              <option value="FREEZER">Freezer</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label style={{ display: 'block', marginBottom: '8px' }}>Food Verification Photos (Optional, max 3)</label>
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            onChange={handleImageChange} 
            className="glass-input" 
            style={{ padding: '8px' }} 
          />
          {images.length > 0 && <p style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '4px' }}>{images.length} photo(s) selected.</p>}
        </div>

        {error && <div className="text-danger mt-4" style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}
        {successMsg && <div style={{ color: 'var(--success)', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>{successMsg}</div>}

        <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
          {loading ? 'Validating Risk Assessment...' : 'Submit Donation'}
        </button>
      </form>
    </div>
  );
};
