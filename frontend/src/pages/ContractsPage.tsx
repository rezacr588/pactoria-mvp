import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { useContractStore, CONTRACT_STATUS_OPTIONS, CONTRACT_TYPE_OPTIONS } from '../store/contractStore';
import { Contract } from '../types';
import { getErrorMessage } from '../utils/errorHandling';
import { debounce } from '../utils/loadingStates';
import { Button, Card, Badge, Input, Select, EmptyState } from '../components/ui';
import { classNames } from '../utils/classNames';
import { textStyles, textColors } from '../utils/typography';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  ...CONTRACT_STATUS_OPTIONS
];

const typeOptions = [
  { value: '', label: 'All Types' },
  ...CONTRACT_TYPE_OPTIONS
];

function getStatusBadgeVariant(status: Contract['status']): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'active':
      return 'success';
    case 'completed':
      return 'success';
    case 'draft':
      return 'info';
    case 'expired':
    case 'terminated':
      return 'danger';
    default:
      return 'default';
  }
}

export default function ContractsPage() {
  const { 
    contracts, 
    pagination,
    fetchContracts, 
    isLoading, 
    error,
    clearError 
  } = useContractStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Debounced search to improve performance
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounced API call
  const debouncedFetchContracts = useCallback(
    debounce((params: {
      search?: string;
      contract_type?: string;
      status?: string;
      page?: number;
    }) => {
      fetchContracts(params).catch((error) => {
        console.error('Failed to fetch contracts:', getErrorMessage(error));
      });
    }, 500),
    [fetchContracts]
  );

  useEffect(() => {
    debouncedFetchContracts({});
  }, [debouncedFetchContracts]);

  useEffect(() => {
    const params: any = {};
    
    if (debouncedSearchQuery) params.search = debouncedSearchQuery;
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.contract_type = typeFilter;
    
    debouncedFetchContracts(params);
  }, [debouncedSearchQuery, statusFilter, typeFilter, debouncedFetchContracts]);

  // Sort contracts client-side (filtering is now done server-side)
  const sortedContracts = useMemo(() => contracts
    .sort((a, b) => {
      const aValue = sortBy === 'title' ? a.title : 
                     sortBy === 'status' ? a.status :
                     sortBy === 'contract_type' ? a.contract_type :
                     sortBy === 'updated_at' ? new Date(a.updated_at || a.created_at).getTime() :
                     new Date(a.created_at).getTime();
      
      const bValue = sortBy === 'title' ? b.title : 
                     sortBy === 'status' ? b.status :
                     sortBy === 'contract_type' ? b.contract_type :
                     sortBy === 'updated_at' ? new Date(b.updated_at || b.created_at).getTime() :
                     new Date(b.created_at).getTime();

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    }), [contracts, sortBy, sortOrder]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Title', 'Type', 'Status', 'Client', 'Supplier', 'Value', 'Currency', 'Created', 'Updated'];
    const csvContent = [
      headers.join(','),
      ...sortedContracts.map(contract => [
        `"${contract.title}"`,
        `"${contract.contract_type}"`,
        contract.status,
        `"${contract.client_name || ''}"`,
        `"${contract.supplier_name || ''}"`,
        contract.contract_value || '',
        contract.currency,
        new Date(contract.created_at).toLocaleDateString(),
        new Date(contract.updated_at || contract.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contracts-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sortedContracts]);
  
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
  }, []);
  
  const hasActiveFilters = searchQuery || statusFilter || typeFilter;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={textStyles.pageTitle}>Contracts</h1>
          <p className={`mt-2 ${textStyles.pageSubtitle}`}>
            Manage and track all your contracts in one place
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            icon={<ArrowDownTrayIcon className="h-4 w-4" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Link to="/contracts/new">
            <Button icon={<PlusIcon className="h-4 w-4" />}>
              New Contract
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6" padding="md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input
            placeholder="Search contracts..."
            leftIcon={<MagnifyingGlassIcon />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            placeholder="Filter by status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <Select
            placeholder="Filter by type"
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
          <Select
            placeholder="Sort by"
            options={[
              { value: 'updated_at', label: 'Last Updated' },
              { value: 'created_at', label: 'Date Created' },
              { value: 'title', label: 'Title' },
              { value: 'status', label: 'Status' },
              { value: 'contract_type', label: 'Type' }
            ]}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          />
        </div>
      </Card>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <p className={textStyles.metadata}>
            Showing {sortedContracts.length} of {pagination.total} contracts
          </p>
          {error && (
            <div className="text-red-600 text-sm">
              Error: {getErrorMessage(error)}
              <button 
                onClick={clearError} 
                className="ml-2 text-blue-600 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              Clear filters
            </Button>
          )}
        </div>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className={`inline-flex items-center space-x-1 text-sm ${textColors.interactive} ${textColors.interactiveHover} font-medium px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-colors`}
        >
          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
          <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
        </button>
      </div>

      {/* Contracts List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="flex items-center space-x-4 p-4">
                <div className="h-10 w-10 bg-neutral-200 dark:bg-secondary-700 rounded-xl"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-neutral-200 dark:bg-secondary-700 rounded-lg w-3/4"></div>
                  <div className="flex space-x-4">
                    <div className="h-3 bg-neutral-200 dark:bg-secondary-700 rounded w-16"></div>
                    <div className="h-3 bg-neutral-200 dark:bg-secondary-700 rounded w-20"></div>
                    <div className="h-3 bg-neutral-200 dark:bg-secondary-700 rounded w-24"></div>
                  </div>
                  <div className="flex space-x-6">
                    <div className="h-3 bg-neutral-200 dark:bg-secondary-700 rounded w-20"></div>
                    <div className="h-3 bg-neutral-200 dark:bg-secondary-700 rounded w-16"></div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="h-4 bg-neutral-200 dark:bg-secondary-700 rounded w-16"></div>
                  <div className="h-3 bg-neutral-200 dark:bg-secondary-700 rounded w-20"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : sortedContracts.length === 0 ? (
        <Card>
          <EmptyState
            icon={FunnelIcon}
            title="No contracts found"
            description={
              hasActiveFilters
                ? 'No contracts match your current filters. Try adjusting your search criteria or clearing filters.'
                : 'Get started by creating your first contract to begin managing your agreements.'
            }
            action={!hasActiveFilters ? {
              label: 'Create Contract',
              onClick: () => window.location.href = '/contracts/new',
              icon: PlusIcon
            } : undefined}
            secondaryAction={hasActiveFilters ? {
              label: 'Clear Filters',
              onClick: clearFilters
            } : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedContracts.map((contract) => (
            <Card key={contract.id} variant="bordered" className="hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-200 group">
              <Link to={`/contracts/${contract.id}`} className="block">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-950/30 rounded-lg flex items-center justify-center">
                        <span className={`${textColors.interactive} font-semibold text-sm`}>
                          {contract.title.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className={`${textStyles.cardTitle} truncate group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors`}>
                          {contract.title}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(contract.status)}>
                          {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                        </Badge>
                      </div>
                      <div className={`mt-1 flex items-center space-x-4 ${textStyles.metadata}`}>
                        <span>{contract.contract_type.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>Version {contract.version}</span>
                        <span>•</span>
                        <span>Updated {new Date(contract.updated_at || contract.created_at).toLocaleDateString()}</span>
                        {contract.contract_value && (
                          <>
                            <span>•</span>
                            <span>{contract.currency} {contract.contract_value.toLocaleString()}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-2 flex items-center space-x-4">
                        {contract.client_name && (
                          <div className="flex items-center space-x-1">
                            <span className={textStyles.timestamp}>Client:</span>
                            <span className={textStyles.timestamp}>{contract.client_name}</span>
                          </div>
                        )}
                        {contract.supplier_name && (
                          <div className="flex items-center space-x-1">
                            <span className={textStyles.timestamp}>Supplier:</span>
                            <span className={textStyles.timestamp}>{contract.supplier_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right hidden sm:block">
                      <div className={`text-sm font-medium ${textColors.primary}`}>
                        {new Date(contract.created_at).toLocaleDateString()}
                      </div>
                      <div className={textStyles.metadata}>
                        Created
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}