import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import DashboardPage from './pages/DashboardPage';
import ContractCreatePage from './pages/ContractCreatePage';
import ContractViewPage from './pages/ContractViewPage';
import TeamPage from './pages/TeamPage';
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
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/contracts/new" element={
            <ProtectedRoute>
              <ContractCreatePage />
            </ProtectedRoute>
          } />
          <Route path="/contracts/:id" element={
            <ProtectedRoute>
              <ContractViewPage />
            </ProtectedRoute>
          } />
          <Route path="/team" element={
            <ProtectedRoute>
              <TeamPage />
            </ProtectedRoute>
          } />
          <Route path="/help" element={
            <ProtectedRoute>
              <HelpPage />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App
