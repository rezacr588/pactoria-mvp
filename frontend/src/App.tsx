import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout';
import ThemeProvider from './contexts/ThemeContext';
import DashboardPage from './pages/DashboardPage';
import ContractsPage from './pages/ContractsPage';
import ContractCreatePage from './pages/ContractCreatePage';
import ContractViewPage from './pages/ContractViewPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TemplatesPage from './pages/TemplatesPage';
import IntegrationsPage from './pages/IntegrationsPage';
import AuditTrailPage from './pages/AuditTrailPage';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import HelpPage from './pages/HelpPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const { user } = useAuthStore();

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes with layout */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="contracts/new" element={<ContractCreatePage />} />
            <Route path="contracts/:id" element={<ContractViewPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="audit" element={<AuditTrailPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App
