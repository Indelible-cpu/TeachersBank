import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import FAQ from './pages/FAQ';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Members from './pages/Members';
import Contributions from './pages/Contributions';
import Loans from './pages/Loans';
import Repayments from './pages/Repayments';
import Receipts from './pages/Receipts';
import Reports from './pages/Reports';
import Users from './pages/Users';
import AuditTrail from './pages/AuditTrail';
import LoanConfigurations from './pages/LoanConfigurations';
import DashboardLayout from './layouts/DashboardLayout';
import InstallPrompt from './components/InstallPrompt';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <InstallPrompt />
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/faq" element={<FAQ />} />

        {/* Protected dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="contributions" element={<Contributions />} />
          <Route path="loans" element={<Loans />} />
          <Route path="repayments" element={<Repayments />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="loan-configurations" element={<LoanConfigurations />} />
          <Route path="audit-trail" element={<AuditTrail />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
