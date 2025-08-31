import { useState } from 'react';
import {
  PuzzlePieceIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  Cog6ToothIcon,
  LinkIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, Input, Select, Badge } from '../components/ui';
import { classNames } from '../utils/classNames';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'crm' | 'accounting' | 'storage' | 'communication' | 'hr' | 'productivity' | 'legal' | 'analytics';
  provider: string;
  logo: string;
  status: 'connected' | 'available' | 'pending' | 'error';
  isPopular: boolean;
  isPremium: boolean;
  features: string[];
  setupTime: number; // minutes
  lastSync?: string;
  syncStatus?: 'success' | 'error' | 'warning';
  connectionsCount?: number;
  rating: number;
  price: 'free' | 'premium' | 'enterprise';
}

const mockIntegrations: Integration[] = [
  {
    id: '1',
    name: 'Xero',
    description: 'Sync contract data with your Xero accounting system for seamless financial management',
    category: 'accounting',
    provider: 'Xero Limited',
    logo: '💼',
    status: 'connected',
    isPopular: true,
    isPremium: false,
    features: ['Invoice Generation', 'Payment Tracking', 'Financial Reporting', 'Tax Calculations'],
    setupTime: 10,
    lastSync: '2025-08-30T14:30:00Z',
    syncStatus: 'success',
    connectionsCount: 1247,
    rating: 4.8,
    price: 'free'
  },
  {
    id: '2',
    name: 'HubSpot CRM',
    description: 'Connect contracts to your CRM deals and automatically update customer records',
    category: 'crm',
    provider: 'HubSpot Inc.',
    logo: '🎯',
    status: 'connected',
    isPopular: true,
    isPremium: false,
    features: ['Deal Tracking', 'Contact Sync', 'Pipeline Management', 'Revenue Analytics'],
    setupTime: 15,
    lastSync: '2025-08-30T13:45:00Z',
    syncStatus: 'warning',
    connectionsCount: 2156,
    rating: 4.7,
    price: 'free'
  },
  {
    id: '3',
    name: 'DocuSign',
    description: 'Enable electronic signatures directly from Pactoria for faster contract execution',
    category: 'legal',
    provider: 'DocuSign Inc.',
    logo: '✍️',
    status: 'available',
    isPopular: true,
    isPremium: true,
    features: ['E-Signatures', 'Identity Verification', 'Audit Trail', 'Mobile Signing'],
    setupTime: 20,
    connectionsCount: 5423,
    rating: 4.9,
    price: 'premium'
  },
  {
    id: '4',
    name: 'Google Drive',
    description: 'Store and organize your contracts in Google Drive with automatic backups',
    category: 'storage',
    provider: 'Google LLC',
    logo: '📁',
    status: 'connected',
    isPopular: true,
    isPremium: false,
    features: ['File Storage', 'Version Control', 'Team Sharing', 'Search Integration'],
    setupTime: 5,
    lastSync: '2025-08-30T15:00:00Z',
    syncStatus: 'success',
    connectionsCount: 8932,
    rating: 4.6,
    price: 'free'
  },
  {
    id: '5',
    name: 'Slack',
    description: 'Get contract notifications and updates directly in your Slack channels',
    category: 'communication',
    provider: 'Slack Technologies',
    logo: '💬',
    status: 'available',
    isPopular: true,
    isPremium: false,
    features: ['Instant Notifications', 'Team Collaboration', 'Status Updates', 'File Sharing'],
    setupTime: 8,
    connectionsCount: 3421,
    rating: 4.5,
    price: 'free'
  },
  {
    id: '6',
    name: 'Microsoft Teams',
    description: 'Collaborate on contracts within your Microsoft Teams workspace',
    category: 'communication',
    provider: 'Microsoft Corporation',
    logo: '👥',
    status: 'pending',
    isPopular: false,
    isPremium: false,
    features: ['Team Collaboration', 'Meeting Integration', 'File Sync', 'Calendar Events'],
    setupTime: 12,
    connectionsCount: 1876,
    rating: 4.3,
    price: 'free'
  },
  {
    id: '7',
    name: 'Salesforce',
    description: 'Integrate contract lifecycle with your Salesforce opportunities and accounts',
    category: 'crm',
    provider: 'Salesforce Inc.',
    logo: '☁️',
    status: 'available',
    isPopular: true,
    isPremium: true,
    features: ['Opportunity Sync', 'Account Management', 'Revenue Forecasting', 'Custom Fields'],
    setupTime: 25,
    connectionsCount: 4567,
    rating: 4.8,
    price: 'enterprise'
  },
  {
    id: '8',
    name: 'BambooHR',
    description: 'Sync employment contracts with your HR system for streamlined onboarding',
    category: 'hr',
    provider: 'BambooHR LLC',
    logo: '🌿',
    status: 'error',
    isPopular: false,
    isPremium: false,
    features: ['Employee Onboarding', 'Document Management', 'Compliance Tracking', 'Reporting'],
    setupTime: 18,
    lastSync: '2025-08-29T10:30:00Z',
    syncStatus: 'error',
    connectionsCount: 892,
    rating: 4.4,
    price: 'premium'
  }
];

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'crm', label: 'CRM & Sales' },
  { value: 'accounting', label: 'Accounting & Finance' },
  { value: 'storage', label: 'Storage & Backup' },
  { value: 'communication', label: 'Communication' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'legal', label: 'Legal & Compliance' },
  { value: 'analytics', label: 'Analytics' },
];

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'connected', label: 'Connected' },
  { value: 'available', label: 'Available' },
  { value: 'pending', label: 'Pending' },
  { value: 'error', label: 'Error' },
];

const priceOptions = [
  { value: '', label: 'All Plans' },
  { value: 'free', label: 'Free' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Enterprise' },
];

function getCategoryIcon(category: Integration['category']) {
  switch (category) {
    case 'crm':
      return '🎯';
    case 'accounting':
      return '💼';
    case 'storage':
      return '📁';
    case 'communication':
      return '💬';
    case 'hr':
      return '👥';
    case 'productivity':
      return '⚡';
    case 'legal':
      return '⚖️';
    case 'analytics':
      return '📊';
    default:
      return '🔧';
  }
}

function getStatusColor(status: Integration['status']) {
  switch (status) {
    case 'connected':
      return 'text-green-700 bg-green-100';
    case 'available':
      return 'text-blue-700 bg-blue-100';
    case 'pending':
      return 'text-yellow-700 bg-yellow-100';
    case 'error':
      return 'text-red-700 bg-red-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

function getSyncStatusColor(status: Integration['syncStatus']) {
  switch (status) {
    case 'success':
      return 'text-green-600';
    case 'warning':
      return 'text-yellow-600';
    case 'error':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

function getPriceLabel(price: Integration['price']) {
  switch (price) {
    case 'free':
      return 'Free';
    case 'premium':
      return 'Premium';
    case 'enterprise':
      return 'Enterprise';
    default:
      return price;
  }
}

function formatLastSync(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else {
    return date.toLocaleDateString('en-GB');
  }
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');

  // Filter integrations
  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = 
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.provider.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !categoryFilter || integration.category === categoryFilter;
    const matchesStatus = !statusFilter || integration.status === statusFilter;
    const matchesPrice = !priceFilter || integration.price === priceFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesPrice;
  });

  const connectedIntegrations = integrations.filter(i => i.status === 'connected');
  const availableIntegrations = integrations.filter(i => i.status === 'available');
  const errorIntegrations = integrations.filter(i => i.status === 'error');

  const handleConnect = (id: string) => {
    setIntegrations(prev => prev.map(integration =>
      integration.id === id ? { ...integration, status: 'pending' as const } : integration
    ));
    // Simulate connection process
    setTimeout(() => {
      setIntegrations(prev => prev.map(integration =>
        integration.id === id ? { 
          ...integration, 
          status: 'connected' as const,
          lastSync: new Date().toISOString(),
          syncStatus: 'success' as const
        } : integration
      ));
    }, 2000);
  };

  const handleDisconnect = (id: string) => {
    setIntegrations(prev => prev.map(integration =>
      integration.id === id ? { 
        ...integration, 
        status: 'available' as const,
        lastSync: undefined,
        syncStatus: undefined
      } : integration
    ));
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Connect Pactoria with your favorite business tools and services
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<LinkIcon className="h-4 w-4" />}
          >
            API Documentation
          </Button>
          <Button
            variant="primary"
            icon={<PlusIcon className="h-4 w-4" />}
          >
            Request Integration
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 mb-8">
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Connected</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{connectedIntegrations.length}</p>
            </div>
            <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Available</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{availableIntegrations.length}</p>
            </div>
            <PuzzlePieceIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Need Attention</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{errorIntegrations.length}</p>
            </div>
            <ExclamationTriangleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Available</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{integrations.length}</p>
            </div>
            <CloudIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6" padding="md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input
            placeholder="Search integrations..."
            leftIcon={<MagnifyingGlassIcon />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            placeholder="Category"
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
          <Select
            placeholder="Status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <Select
            placeholder="Plan"
            options={priceOptions}
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {filteredIntegrations.length} of {integrations.length} integrations
        </p>
      </div>

      {/* Integrations Grid */}
      {filteredIntegrations.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <PuzzlePieceIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No integrations found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredIntegrations.map((integration) => (
            <Card key={integration.id} variant="bordered" className="flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                      {integration.logo}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {integration.name}
                        </h3>
                        {integration.isPopular && (
                          <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-700">
                            Popular
                          </Badge>
                        )}
                        {integration.isPremium && (
                          <Badge variant="default" className="text-xs bg-purple-100 text-purple-700">
                            Premium
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{integration.provider}</p>
                    </div>
                  </div>
                  <Badge className={classNames('text-xs', getStatusColor(integration.status))}>
                    {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  {integration.description}
                </p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Category</span>
                    <div className="flex items-center space-x-1">
                      <span>{getCategoryIcon(integration.category)}</span>
                      <span className="font-medium capitalize">
                        {integration.category === 'crm' ? 'CRM' : integration.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Setup Time</span>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{integration.setupTime} min</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Price</span>
                    <span className="font-medium">{getPriceLabel(integration.price)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Rating</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{integration.rating}</span>
                      <span className="text-yellow-400">★</span>
                      <span className="text-gray-400">({integration.connectionsCount?.toLocaleString()})</span>
                    </div>
                  </div>

                  {integration.status === 'connected' && integration.lastSync && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Last Sync</span>
                      <div className="flex items-center space-x-1">
                        <div className={classNames(
                          'w-2 h-2 rounded-full',
                          integration.syncStatus === 'success' ? 'bg-green-500' :
                          integration.syncStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        )} />
                        <span className={classNames(
                          'font-medium text-xs',
                          getSyncStatusColor(integration.syncStatus)
                        )}>
                          {formatLastSync(integration.lastSync)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Features</h4>
                  <div className="flex flex-wrap gap-1">
                    {integration.features.slice(0, 3).map((feature) => (
                      <span
                        key={feature}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                    {integration.features.length > 3 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{integration.features.length - 3} more
                      </span>
                    )}
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
                  ) : integration.status === 'pending' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      disabled
                      icon={<ClockIcon className="h-4 w-4 animate-spin" />}
                    >
                      Connecting...
                    </Button>
                  ) : integration.status === 'error' ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleConnect(integration.id)}
                      >
                        Reconnect
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ExclamationTriangleIcon className="h-4 w-4" />}
                      >
                        View Error
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleConnect(integration.id)}
                      icon={<LinkIcon className="h-4 w-4" />}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}