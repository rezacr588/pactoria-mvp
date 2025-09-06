import { useState, useCallback } from 'react';
import {
  EnvelopeIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Card, Button } from '../components/ui';
import { useToast } from '../contexts/ToastContext';

interface BasicIntegration {
  id: string;
  name: string;
  description: string;
  category: 'email' | 'calendar' | 'export';
  status: 'connected' | 'available' | 'setup_required';
  icon: React.ComponentType<any>;
  setupTime: string;
  features: string[];
}


// MVP Basic Integrations for UK SMEs
const MVP_INTEGRATIONS: BasicIntegration[] = [
  {
    id: 'email-notifications',
    name: 'Email Notifications',
    description: 'Automated email alerts for contract deadlines and updates',
    category: 'email',
    status: 'available',
    icon: EnvelopeIcon,
    setupTime: '2 minutes',
    features: ['Deadline reminders', 'Status updates', 'UK business hours']
  },
  {
    id: 'calendar-sync',
    name: 'Calendar Integration',
    description: 'Sync important contract dates with your calendar',
    category: 'calendar',
    status: 'available',
    icon: CalendarIcon,
    setupTime: '3 minutes',
    features: ['Contract deadlines', 'Review dates', 'Outlook & Google support']
  },
  {
    id: 'csv-export',
    name: 'CSV Export',
    description: 'Export contract data for record keeping and reporting',
    category: 'export',
    status: 'connected',
    icon: DocumentArrowDownIcon,
    setupTime: '1 minute',
    features: ['Contract summaries', 'Compliance reports', 'UK date formats']
  }
];

function getStatusColor(status: BasicIntegration['status']) {
  switch (status) {
    case 'connected':
      return 'text-green-700 bg-green-100';
    case 'available':
      return 'text-blue-700 bg-blue-100';
    case 'setup_required':
      return 'text-amber-700 bg-amber-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

export default function IntegrationsPage() {
  const { showToast } = useToast();
  const [integrations, setIntegrations] = useState<BasicIntegration[]>(MVP_INTEGRATIONS);

  const handleConnect = useCallback(async (id: string) => {
    try {
      setIntegrations(prev => prev.map(integration =>
        integration.id === id ? { ...integration, status: 'connected' as const } : integration
      ));
      
      const integration = integrations.find(i => i.id === id);
      showToast(`${integration?.name} connected successfully`, 'success');
    } catch (err) {
      showToast('Failed to connect integration', 'error');
    }
  }, [integrations, showToast]);

  const handleDisconnect = useCallback(async (id: string) => {
    try {
      setIntegrations(prev => prev.map(integration =>
        integration.id === id ? { ...integration, status: 'available' as const } : integration
      ));
      
      const integration = integrations.find(i => i.id === id);
      showToast(`${integration?.name} disconnected`, 'success');
    } catch (err) {
      showToast('Failed to disconnect integration', 'error');
    }
  }, [integrations, showToast]);

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const availableCount = integrations.filter(i => i.status === 'available').length;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Essential Integrations</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Basic integrations to streamline your UK contract management
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 mb-8">
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Connected</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{connectedCount}</p>
            </div>
            <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Available</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{availableCount}</p>
            </div>
            <Cog6ToothIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{integrations.length}</p>
            </div>
            <ExclamationTriangleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* MVP Integrations Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const IconComponent = integration.icon;
          return (
            <Card key={integration.id} variant="bordered" className="flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <IconComponent className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {integration.name}
                      </h3>
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${getStatusColor(integration.status)}`}>
                    {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  {integration.description}
                </p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Setup Time</span>
                    <span className="font-medium">{integration.setupTime}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Category</span>
                    <span className="font-medium capitalize">{integration.category}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
                  <div className="flex flex-wrap gap-1">
                    {integration.features.map((feature) => (
                      <span
                        key={feature}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 mt-auto">
                <div className="flex space-x-2">
                  {integration.status === 'connected' ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        icon={<Cog6ToothIcon className="h-4 w-4" />}
                      >
                        Configure
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDisconnect(integration.id)}
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleConnect(integration.id)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}