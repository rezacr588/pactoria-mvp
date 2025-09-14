import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout';
import ThemeProvider from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ToastContainer from './components/ui/ToastContainer';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Lazy load pages for better performance
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ContractsPage = lazy(() => import('./pages/ContractsPage'));
const ContractCreatePage = lazy(() => import('./pages/ContractCreatePage'));
const ContractEditPage = lazy(() => import('./pages/ContractEditPage'));
const ContractViewPage = lazy(() => import('./pages/ContractViewPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));
const AuditTrailPage = lazy(() => import('./pages/AuditTrailPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
import CommandPalette from './components/ui/CommandPalette';
import KeyboardShortcutsHelp from './components/ui/KeyboardShortcutsHelp';
import SkipLinks from './components/ui/SkipLinks';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { useGlobalKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuthStore();
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Component that handles keyboard shortcuts within Router context
function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  
  // Always call the hook but only enable for authenticated users
  useGlobalKeyboardShortcuts(!!user);
  
  return <>{children}</>;
}

function App() {
  const { user } = useAuthStore();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);

  // Listen for global events
  useEffect(() => {
    const handleOpenCommandPalette = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    const handleShowKeyboardHelp = () => {
      setIsKeyboardHelpOpen(true);
    };

    const handleCloseModals = () => {
      setIsCommandPaletteOpen(false);
      setIsKeyboardHelpOpen(false);
    };

    // Add keyboard event listener for command palette
    document.addEventListener('keydown', handleOpenCommandPalette);
    
    // Add custom event listeners
    document.addEventListener('showKeyboardHelp', handleShowKeyboardHelp);
    document.addEventListener('closeModals', handleCloseModals);

    return () => {
      document.removeEventListener('keydown', handleOpenCommandPalette);
      document.removeEventListener('showKeyboardHelp', handleShowKeyboardHelp);
      document.removeEventListener('closeModals', handleCloseModals);
    };
  }, []);

  return (
    <ErrorBoundary level="critical" showErrorDetails={process.env.NODE_ENV === 'development'}>
      <ThemeProvider defaultTheme="light">
        <NotificationProvider>
          <ToastProvider>
            <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <KeyboardShortcutsProvider>
                {/* Skip Links for accessibility */}
                <SkipLinks />
                
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                  {/* Public routes - Landing page accessible to all users */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                
                {/* Protected routes with layout */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <ErrorBoundary level="page">
                      <AppLayout />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }>
                  <Route path="dashboard" element={
                    <ErrorBoundary level="component">
                      <DashboardPage />
                    </ErrorBoundary>
                  } />
                  <Route path="contracts" element={
                    <ErrorBoundary level="component">
                      <ContractsPage />
                    </ErrorBoundary>
                  } />
                  <Route path="contracts/new" element={
                    <ErrorBoundary level="component">
                      <ContractCreatePage />
                    </ErrorBoundary>
                  } />
                  <Route path="contracts/create" element={<Navigate to="/contracts/new" replace />} />
                  <Route path="contracts/:id" element={
                    <ErrorBoundary level="component">
                      <ContractViewPage />
                    </ErrorBoundary>
                  } />
                  <Route path="contracts/:id/edit" element={
                    <ErrorBoundary level="component">
                      <ContractEditPage />
                    </ErrorBoundary>
                  } />
                  <Route path="analytics" element={
                    <ErrorBoundary level="component">
                      <AnalyticsPage />
                    </ErrorBoundary>
                  } />
                  <Route path="templates" element={
                    <ErrorBoundary level="component">
                      <TemplatesPage />
                    </ErrorBoundary>
                  } />
                  <Route path="integrations" element={
                    <ErrorBoundary level="component">
                      <IntegrationsPage />
                    </ErrorBoundary>
                  } />
                  <Route path="audit" element={
                    <ErrorBoundary level="component">
                      <AuditTrailPage />
                    </ErrorBoundary>
                  } />
                  <Route path="team" element={
                    <ErrorBoundary level="component">
                      <TeamPage />
                    </ErrorBoundary>
                  } />
                  <Route path="settings" element={
                    <ErrorBoundary level="component">
                      <SettingsPage />
                    </ErrorBoundary>
                  } />
                  <Route path="notifications" element={
                    <ErrorBoundary level="component">
                      <NotificationsPage />
                    </ErrorBoundary>
                  } />
                  <Route path="help" element={
                    <ErrorBoundary level="component">
                      <HelpPage />
                    </ErrorBoundary>
                  } />
                </Route>
                  </Routes>
                </Suspense>

              {/* Global Modals and Components - Only show for authenticated users */}
              {user && (
                <>
                  <CommandPalette
                    isOpen={isCommandPaletteOpen}
                    onClose={() => setIsCommandPaletteOpen(false)}
                  />
                  <KeyboardShortcutsHelp
                    isOpen={isKeyboardHelpOpen}
                    onClose={() => setIsKeyboardHelpOpen(false)}
                  />
                  <ToastContainer />
                </>
              )}
              </KeyboardShortcutsProvider>
            </Router>
          </ToastProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
