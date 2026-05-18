import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import DashboardLayout from './layouts/DashboardLayout';
import InstallPrompt from './components/InstallPrompt';
import LoadingScreen from './components/LoadingScreen';

// Lazy-loaded public pages for instant initial paint
const Login = lazy(() => import('./pages/Login'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const FAQ = lazy(() => import('./pages/FAQ'));

// Lazy-loaded administrative/dashboard modules (isolates large libraries like jsPDF and html2canvas)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Members = lazy(() => import('./pages/Members'));
const Contributions = lazy(() => import('./pages/Contributions'));
const Loans = lazy(() => import('./pages/Loans'));
const Repayments = lazy(() => import('./pages/Repayments'));
const Receipts = lazy(() => import('./pages/Receipts'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const AuditTrail = lazy(() => import('./pages/AuditTrail'));
const LoanConfigurations = lazy(() => import('./pages/LoanConfigurations'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <InstallPrompt />
      <Suspense fallback={<LoadingScreen />}>
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
      </Suspense>
    </Router>
  );
}

export default App;
