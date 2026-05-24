import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import DashboardLayout from './layouts/DashboardLayout';
import InstallPrompt from './components/InstallPrompt';
import LoadingScreen from './components/LoadingScreen';

const safeLazy = (importFn: () => Promise<any>) => {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error("Failed to load chunk, performing a full reload to fetch latest assets:", error);
      window.location.reload();
      return new Promise(() => {}); // Keep loading state active during reload
    }
  });
};

// Lazy-loaded public pages for instant initial paint
const Login = safeLazy(() => import('./pages/Login'));
const About = safeLazy(() => import('./pages/About'));
const Privacy = safeLazy(() => import('./pages/Privacy'));
const Terms = safeLazy(() => import('./pages/Terms'));
const FAQ = safeLazy(() => import('./pages/FAQ'));

// Lazy-loaded administrative/dashboard modules (isolates large libraries like jsPDF and html2canvas)
const Dashboard = safeLazy(() => import('./pages/Dashboard'));
const Settings = safeLazy(() => import('./pages/Settings'));
const Members = safeLazy(() => import('./pages/Members'));
const Contributions = safeLazy(() => import('./pages/Contributions'));
const Loans = safeLazy(() => import('./pages/Loans'));
const Repayments = safeLazy(() => import('./pages/Repayments'));

const Reports = safeLazy(() => import('./pages/Reports'));
const Users = safeLazy(() => import('./pages/Users'));
const AuditTrail = safeLazy(() => import('./pages/AuditTrail'));
const LoanConfigurations = safeLazy(() => import('./pages/LoanConfigurations'));
const TotalEarnings = safeLazy(() => import('./pages/TotalEarnings'));
const Emergency = safeLazy(() => import('./pages/Emergency'));

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

            <Route path="reports" element={<Reports />} />
            <Route path="total-earnings" element={<TotalEarnings />} />
            <Route path="emergency" element={<Emergency />} />
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
