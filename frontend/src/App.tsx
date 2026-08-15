import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DonorDashboard } from './pages/DonorDashboard';
import { NgoDashboard } from './pages/NgoDashboard';
import { DonationDetails } from './pages/DonationDetails';
import { Landing } from './pages/Landing';
import { AdminDashboard } from './pages/AdminDashboard';

const App = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes - DONOR */}
          <Route element={<ProtectedRoute allowedRoles={['DONOR']} />}>
            <Route path="/donor/dashboard" element={<DonorDashboard />} />
          </Route>

          {/* Protected Routes - NGO */}
          <Route element={<ProtectedRoute allowedRoles={['NGO']} />}>
            <Route path="/ngo/dashboard" element={<NgoDashboard />} />
          </Route>

          {/* Protected Routes - ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Protected Routes - SHARED */}
          <Route element={<ProtectedRoute allowedRoles={['DONOR', 'NGO']} />}>
            <Route path="/donations/:id" element={<DonationDetails />} />
          </Route>

          {/* Fallback routing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
  );
};

export default App;
