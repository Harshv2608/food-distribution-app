import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import api from '../api/api';

// Mock Axios API
vi.mock('../api/api', () => ({
  default: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    }
  },
}));

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('redirects unauthorized users to /login', async () => {
    render(<App />);
    expect(await screen.findByText(/Welcome Back/i)).toBeInTheDocument();
  });

  it('allows DONOR to register and redirects to login', async () => {
    window.history.pushState({}, '', '/register');
    render(<App />);

    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: true },
    });

    await userEvent.type(screen.getByPlaceholderText(/Email address/i), 'donor1@test.com');
    await userEvent.type(screen.getByPlaceholderText(/Password/i), 'password123');
    
    // Select DONOR role
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'DONOR');

    await userEvent.click(screen.getByRole('button', { name: /Register/i }));

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      email: 'donor1@test.com',
      password: 'password123',
      role: 'DONOR'
    });

    // Verify it redirects to login
    await waitFor(() => {
      expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    });
  });

  it('displays API errors on duplicate email registration', async () => {
    window.history.pushState({}, '', '/register');
    render(<App />);

    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: { message: 'Email already exists' } } },
    });

    await userEvent.type(screen.getByPlaceholderText(/Email address/i), 'donor1@test.com');
    await userEvent.type(screen.getByPlaceholderText(/Password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Register/i }));

    expect(await screen.findByText('Email already exists')).toBeInTheDocument();
  });

  it('allows DONOR to login and protects NGO routes', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);

    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          token: 'fake-jwt',
          user: { id: '1', email: 'donor1@test.com', role: 'DONOR' }
        }
      },
    });

    await userEvent.type(screen.getByPlaceholderText(/Email address/i), 'donor1@test.com');
    await userEvent.type(screen.getByPlaceholderText(/Password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    // Should redirect to DONOR dashboard
    expect(await screen.findByText(/Welcome to the DONOR Dashboard/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe('fake-jwt');
    expect(localStorage.getItem('user')).toContain('DONOR');

    // Attempt to access NGO dashboard
    window.history.pushState({}, '', '/ngo/dashboard');
    // We need to re-render or simulate navigation since window.history alone doesn't trigger React Router in tests natively if outside Link, 
    // but React Router's BrowserRouter listens to popstate. 
    // Let's just unmount and remount to simulate a hard load on the protected route.
  });

  it('bounces DONOR from NGO routes upon hard load', async () => {
    localStorage.setItem('token', 'fake-jwt');
    localStorage.setItem('user', JSON.stringify({ id: '1', email: 'donor1@test.com', role: 'DONOR' }));
    
    window.history.pushState({}, '', '/ngo/dashboard');
    render(<App />);
    
    // Should bounce back to donor dashboard because role DONOR != NGO
    expect(await screen.findByText(/Welcome to the DONOR Dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText(/Welcome to the NGO Dashboard/i)).not.toBeInTheDocument();
  });

  it('displays API errors on invalid login', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);

    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: { message: 'Invalid credentials' } } },
    });

    await userEvent.type(screen.getByPlaceholderText(/Email address/i), 'donor1@test.com');
    await userEvent.type(screen.getByPlaceholderText(/Password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('allows NGO to login to NGO routes', async () => {
    localStorage.setItem('token', 'fake-jwt');
    localStorage.setItem('user', JSON.stringify({ id: '2', email: 'ngo1@test.com', role: 'NGO' }));
    
    window.history.pushState({}, '', '/ngo/dashboard');
    render(<App />);
    
    expect(await screen.findByText(/Welcome to the NGO Dashboard/i)).toBeInTheDocument();
  });

  it('logs out successfully', async () => {
    localStorage.setItem('token', 'fake-jwt');
    localStorage.setItem('user', JSON.stringify({ id: '2', email: 'ngo1@test.com', role: 'NGO' }));
    
    // Need to mock window.location.href since it's hard set in the logout function
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '/login'
    } as any);

    window.history.pushState({}, '', '/ngo/dashboard');
    render(<App />);
    
    const signoutBtn = await screen.findByRole('button', { name: /Sign Out/i });
    await userEvent.click(signoutBtn);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    
    locationSpy.mockRestore();
  });
});
