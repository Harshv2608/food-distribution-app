import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import api from '../api/api';

// Mock API
vi.mock('../api/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    }
  },
}));

describe('Frontend E2E Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  const setupAuth = (role: 'DONOR' | 'NGO', token = 'fake-jwt', userId = '1') => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ id: userId, email: 'test@test.com', role }));
  };

  it('Donor creates donation and views backend risk result', async () => {
    setupAuth('DONOR');
    window.history.replaceState({}, '', '/donor/dashboard');
    
    // Mock GET /donations empty
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/donations') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });
    
    render(<App />);
    
    // Switch to Create Tab
    await userEvent.click(await screen.findByRole('button', { name: /Create Donation/i }));
    
    // Mock POST /donations success
    (api.post as any).mockResolvedValueOnce({ data: { success: true } });

    // Fill form (simplified)
    await userEvent.type(screen.getByLabelText(/Description/i), 'Fresh apples');
    await userEvent.type(screen.getByLabelText(/Quantity/i), '10');
    
    // Submit
    await userEvent.click(screen.getByRole('button', { name: /Submit Donation/i }));
    
    expect(api.post).toHaveBeenCalledWith('/donations', expect.objectContaining({
      description: 'Fresh apples',
      quantity_kg: 10
    }));

    // Mock refetch showing the created donation with RISK
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/donations') {
        return Promise.resolve({
          data: {
            data: [{
              id: 'don-1',
              food_category: 'FRUITS',
              quantity_kg: 10,
              status: 'AVAILABLE',
              risk_level: 'LOW',
              risk_reasons: ['Refrigerated']
            }]
          }
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    // Should switch back to My Donations tab
    await waitFor(() => {
      expect(screen.getByText(/🟢 LOW RISK/i)).toBeInTheDocument();
    });
  });

  it('NGO Profile setup unlocks Match score rendering', async () => {
    setupAuth('NGO');
    window.history.replaceState({}, '', '/ngo/dashboard');
    
    // 1. Mock GET /matches returning 400 (needs profile)
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/donations/matches') return Promise.reject({ response: { data: { error: { code: 'NGO_PROFILE_REQUIRED' } } } });
      return Promise.resolve({ data: { data: [] } });
    });

    render(<App />);

    expect(await screen.findByText(/You need to configure your capacity/i)).toBeInTheDocument();
    
    // Switch to Profile Tab
    await userEvent.click(screen.getByRole('button', { name: /Configure Needs/i }));

    // Mock PUT /profiles/ngo
    (api.put as any).mockResolvedValueOnce({ data: { success: true } });

    await userEvent.type(screen.getByLabelText(/Current Capacity/i), '50');
    await userEvent.click(screen.getByRole('button', { name: /Save Profile/i }));

    expect(api.put).toHaveBeenCalledWith('/profiles/ngo', expect.objectContaining({
      capacity_kg: 50
    }));

    // 2. Mock GET /matches returning a highly relevant match
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/donations/matches') {
        return Promise.resolve({
          data: {
            data: [{
              id: 'don-2',
              food_category: 'COOKED_MEALS',
              quantity_kg: 20,
              match_score: 85,
              match_reasons: ['2 km away', 'Matches required category']
            }]
          }
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    // Verify Match renders
    await waitFor(() => {
      expect(screen.getByText(/★ 85/i)).toBeInTheDocument();
      expect(screen.getByText(/2 km away/i)).toBeInTheDocument();
    });
  });

  it('Handles Claim Conflict (409) gracefully in Donation Lifecycle', async () => {
    setupAuth('NGO');
    window.history.replaceState({}, '', '/donations/don-123');
    
    // Initial fetch shows AVAILABLE
    let isClaimed = false;
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/donations/don-123') {
        return Promise.resolve({
          data: { data: { id: 'don-123', status: isClaimed ? 'CLAIMED' : 'AVAILABLE', food_category: 'BAKERY', lat: 0, lng: 0 } }
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<App />);

    expect(await screen.findByRole('button', { name: /Claim Donation/i })).toBeInTheDocument();

    // Mock POST /claim returning 409 Conflict
    (api.post as any).mockImplementation((url: string) => {
      if (url === '/donations/don-123/claim') {
        isClaimed = true; // Next GET will return CLAIMED
        return Promise.reject({ response: { status: 409, data: { error: { message: 'Donation already claimed' } } } });
      }
      return Promise.resolve({ data: { success: true } });
    });

    await userEvent.click(screen.getByRole('button', { name: /Claim Donation/i }));

    // Toast should show
    expect(await screen.findByText(/Donation already claimed/i)).toBeInTheDocument();

    // Button should change to Assign Pickup
    expect(await screen.findByRole('button', { name: /Assign Pickup/i })).toBeInTheDocument();
  });
});
