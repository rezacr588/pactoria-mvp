import { useState, useEffect, useCallback } from 'react';
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
import { IntegrationsService } from '../services/api';
import { getErrorMessage } from '../utils/errorHandling';
import { useToast } from '../contexts/ToastContext';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  logo_url?: string;
  features: string[];
  status: string;
  is_popular: boolean;
  is_premium: boolean;
  setup_time_minutes: number;
  last_sync?: string;
  sync_status?: string;
  connections_count: number;
  rating: number;
  price_tier: string;
  documentation_url?: string;
  webhook_url?: string;
  api_key_required: boolean;
}


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
  const { showToast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationStats, setIntegrationStats] = useState({
    total_available: 0,
    connected_count: 0,
    available_count: 0,
    error_count: 0,
    pending_count: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');

  // Fetch integrations
  const fetchIntegrations = useCallback(async (params: {
    category?: string;
    status?: string;
    price_tier?: string;
    popular_only?: boolean;
    search?: string;
  } = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await IntegrationsService.getIntegrations(params);
      setIntegrations(response);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Fetch integration stats
  const fetchIntegrationStats = useCallback(async () => {
    try {
      const stats = await IntegrationsService.getIntegrationStats();
      setIntegrationStats(stats);
    } catch (err) {
      console.error('Failed to fetch integration stats:', getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
    fetchIntegrationStats();
  }, [fetchIntegrations, fetchIntegrationStats]);

  useEffect(() => {
    const params: any = {};
    
    if (searchQuery) params.search = searchQuery;
    if (categoryFilter) params.category = categoryFilter;
    if (statusFilter) params.status = statusFilter;
    if (priceFilter) params.price_tier = priceFilter;
    
    fetchIntegrations(params);
  }, [searchQuery, categoryFilter, statusFilter, priceFilter, fetchIntegrations]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleConnect = useCallback(async (id: string) => {
    try {
      // Update local state optimistically
      setIntegrations(prev => prev.map(integration =>
        integration.id === id ? { ...integration, status: 'pending' } : integration
      ));

      const response = await IntegrationsService.connectIntegration(id, {});
      
      // Update with actual response
      setIntegrations(prev => prev.map(integration =>
        integration.id === id ? { 
          ...integration, 
          status: 'connected',
          last_sync: new Date().toISOString(),
          sync_status: 'success'
        } : integration
      ));
      
      showToast(`${integrations.find(i => i.id === id)?.name} connected successfully`, 'success');
      fetchIntegrationStats(); // Refresh stats
    } catch (err) {
      // Revert on error
      setIntegrations(prev => prev.map(integration =>
        integration.id === id ? { ...integration, status: 'available' } : integration
      ));
      showToast(getErrorMessage(err), 'error');
    }
  }, [integrations, showToast, fetchIntegrationStats]);

  const handleDisconnect = useCallback(async (id: string) => {
    try {
      await IntegrationsService.disconnectIntegration(id);
      
      setIntegrations(prev => prev.map(integration =>
        integration.id === id ? { 
          ...integration, 
          status: 'available',
          last_sync: undefined,
          sync_status: undefined
        } : integration
      ));
      
      showToast(`${integrations.find(i => i.id === id)?.name} disconnected`, 'success');
      fetchIntegrationStats(); // Refresh stats
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  }, [integrations, showToast, fetchIntegrationStats]);

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
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{integrationStats.connected_count}</p>
            </div>
            <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Available</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{integrationStats.available_count}</p>
            </div>
            <PuzzlePieceIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Need Attention</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{integrationStats.error_count}</p>
            </div>
            <ExclamationTriangleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Available</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{integrationStats.total_available}</p>
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

      {/* Error Display */}
      {error && (
        <div className="mb-4 text-red-600 text-sm">
          Error: {error}
          <button 
            onClick={clearError} 
            className="ml-2 text-blue-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {integrations.length} integrations
        </p>
      </div>

      {/* Integrations Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : integrations.length === 0 ? (
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
          {integrations.map((integration) => (
            <Card key={integration.id} variant="bordered" className="flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                      {integration.logo_url ? (
                        <img 
                          src={integration.logo_url} 
                          alt={integration.name} 
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        getCategoryIcon(integration.category)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {integration.name}
                        </h3>
                        {integration.is_popular && (
                          <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-700">
                            Popular
                          </Badge>
                        )}
                        {integration.is_premium && (
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
                      <span className="font-medium">{integration.setup_time_minutes} min</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Price</span>
                    <span className="font-medium">{getPriceLabel(integration.price_tier)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Rating</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{integration.rating}</span>
                      <span className="text-yellow-400">★</span>
                      <span className="text-gray-400">({integration.connections_count?.toLocaleString()})</span>
                    </div>
                  </div>

                  {integration.status === 'connected' && integration.last_sync && (
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