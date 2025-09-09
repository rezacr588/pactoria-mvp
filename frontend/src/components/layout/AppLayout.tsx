import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useContracts } from '../../hooks';
import { useTemplates } from '../../hooks/useTemplates';

export default function AppLayout() {
  const { fetchContracts } = useContracts();
  const { fetchTemplates } = useTemplates();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize data when layout mounts
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Fetch contracts and templates separately to handle failures independently
        const results = await Promise.allSettled([
          fetchContracts().catch((err: Error) => {
            console.warn('Failed to load contracts:', err);
            return null;
          }),
          fetchTemplates().catch((err: Error) => {
            console.warn('Failed to load templates (non-critical):', err);
            return null;
          })
        ]);

        // Log any failures but don't block the app
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.warn(`App initialization item ${index} failed:`, result.reason);
          }
        });
      } catch (error) {
        console.error('Failed to initialize app data:', error);
      }
    };

    initializeApp();
  }, [fetchContracts, fetchTemplates]);

  return (
    <div className="h-screen flex bg-neutral-50 dark:bg-secondary-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-neutral-600 dark:bg-secondary-900 opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <nav
        id="navigation"
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
          lg:static lg:inset-auto lg:translate-x-0 lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Main navigation"
      >
        <Sidebar />
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main id="main-content" className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}