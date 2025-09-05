import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useContractStore } from '../../store/contractStore';

export default function AppLayout() {
  const { fetchContracts, fetchTemplates } = useContractStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize data when layout mounts
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Promise.all([
          fetchContracts(),
          fetchTemplates()
        ]);
      } catch (error) {
        console.error('Failed to initialize app data:', error);
      }
    };

    initializeApp();
  }, [fetchContracts, fetchContractTypes, fetchTemplates, fetchTeamMembers]);

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
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
          lg:static lg:inset-auto lg:translate-x-0 lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}