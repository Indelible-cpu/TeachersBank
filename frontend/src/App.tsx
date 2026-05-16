import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
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
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
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
          <Route path="audit-trail" element={<AuditTrail />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
