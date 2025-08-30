import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useContractStore } from '../../store/contractStore';

export default function AppLayout() {
  const { fetchContracts, fetchContractTypes, fetchTemplates, fetchTeamMembers } = useContractStore();

  // Initialize data when layout mounts
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Promise.all([
          fetchContracts(),
          fetchContractTypes(),
          fetchTemplates(),
          fetchTeamMembers()
        ]);
      } catch (error) {
        console.error('Failed to initialize app data:', error);
      }
    };

    initializeApp();
  }, [fetchContracts, fetchContractTypes, fetchTemplates, fetchTeamMembers]);

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}