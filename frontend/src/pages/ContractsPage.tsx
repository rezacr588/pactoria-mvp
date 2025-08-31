import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { useContractStore } from '../store/contractStore';
import { Contract } from '../types';
import { Button, Card, Badge, Input, Select, EmptyState } from '../components/ui';
import { classNames } from '../utils/classNames';
import { textStyles, textColors } from '../utils/typography';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'signed', label: 'Signed' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' }
];

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'professional-services', label: 'Professional Services' },
  { value: 'employment', label: 'Employment Contract' },
  { value: 'supplier', label: 'Supplier Agreement' },
  { value: 'nda', label: 'Non-Disclosure Agreement' }
];

function getStatusBadgeVariant(status: Contract['status']): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'active':
    case 'signed':
      return 'success';
    case 'review':
    case 'approved':
      return 'warning';
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
  const { contracts, fetchContracts, isLoading } = useContractStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Debounced search to improve performance
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Filter and sort contracts with memoization for performance
  const filteredContracts = useMemo(() => contracts
    .filter(contract => {
      const matchesSearch = contract.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                           contract.type.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                           contract.parties.some(party => 
                             party.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
                           );
      const matchesStatus = !statusFilter || contract.status === statusFilter;
      const matchesType = !typeFilter || contract.type.id === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      const aValue = sortBy === 'name' ? a.name : 
                     sortBy === 'status' ? a.status :
                     sortBy === 'type' ? a.type.name :
                     sortBy === 'updatedAt' ? new Date(a.updatedAt).getTime() :
                     new Date(a.createdAt).getTime();
      
      const bValue = sortBy === 'name' ? b.name : 
                     sortBy === 'status' ? b.status :
                     sortBy === 'type' ? b.type.name :
                     sortBy === 'updatedAt' ? new Date(b.updatedAt).getTime() :
                     new Date(b.createdAt).getTime();

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    }), [contracts, debouncedSearchQuery, statusFilter, typeFilter, sortBy, sortOrder]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Name', 'Type', 'Status', 'Created', 'Updated', 'Compliance Score', 'Risk Level'];
    const csvContent = [
      headers.join(','),
      ...filteredContracts.map(contract => [
        `"${contract.name}"`,
        `"${contract.type.name}"`,
        contract.status,
        new Date(contract.createdAt).toLocaleDateString(),
        new Date(contract.updatedAt).toLocaleDateString(),
        contract.complianceScore.overall,
        contract.riskAssessment.overall <= 30 ? 'Low' :
        contract.riskAssessment.overall <= 60 ? 'Medium' : 'High'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contracts-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredContracts]);
  
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
              { value: 'updatedAt', label: 'Last Updated' },
              { value: 'createdAt', label: 'Date Created' },
              { value: 'name', label: 'Name' },
              { value: 'status', label: 'Status' },
              { value: 'type', label: 'Type' }
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
            Showing {filteredContracts.length} of {contracts.length} contracts
          </p>
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
      ) : filteredContracts.length === 0 ? (
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
          {filteredContracts.map((contract) => (
            <Card key={contract.id} variant="bordered" className="hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-200 group">
              <Link to={`/contracts/${contract.id}`} className="block">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-950/30 rounded-lg flex items-center justify-center">
                        <span className={`${textColors.interactive} font-semibold text-sm`}>
                          {contract.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className={`${textStyles.cardTitle} truncate group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors`}>
                          {contract.name}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(contract.status)}>
                          {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                        </Badge>
                      </div>
                      <div className={`mt-1 flex items-center space-x-4 ${textStyles.metadata}`}>
                        <span>{contract.type.name}</span>
                        <span>•</span>
                        <span>Version {contract.version}</span>
                        <span>•</span>
                        <span>Updated {new Date(contract.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2 flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className={classNames(
                            'w-2 h-2 rounded-full',
                            contract.complianceScore.overall >= 90 ? 'bg-success-500' :
                            contract.complianceScore.overall >= 80 ? 'bg-warning-500' :
                            'bg-danger-500'
                          )} />
                          <span className={textStyles.timestamp}>
                            {contract.complianceScore.overall}% Compliant
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={classNames(
                            'w-2 h-2 rounded-full',
                            contract.riskAssessment.overall <= 30 ? 'bg-success-500' :
                            contract.riskAssessment.overall <= 60 ? 'bg-warning-500' :
'bg-danger-500'
                          )} />
                          <span className={textStyles.timestamp}>
                            {contract.riskAssessment.overall <= 30 ? 'Low' :
                             contract.riskAssessment.overall <= 60 ? 'Medium' : 'High'} Risk
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right hidden sm:block">
                      <div className={`text-sm font-medium ${textColors.primary}`}>
                        {contract.parties.length} {contract.parties.length === 1 ? 'Party' : 'Parties'}
                      </div>
                      <div className={textStyles.metadata}>
                        {contract.deadlines.length} {contract.deadlines.length === 1 ? 'Deadline' : 'Deadlines'}
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