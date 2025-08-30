import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { useContractStore } from '../store/contractStore';
import { Contract } from '../types';
import { Button, Card, Badge, Input, Select } from '../components/ui';
import { classNames } from '../utils/classNames';

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

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Filter and sort contracts
  const filteredContracts = contracts
    .filter(contract => {
      const matchesSearch = contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           contract.type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           contract.parties.some(party => 
                             party.name.toLowerCase().includes(searchQuery.toLowerCase())
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
    });

  const handleExportCSV = () => {
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
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contracts</h1>
          <p className="mt-2 text-gray-600">
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
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {filteredContracts.length} of {contracts.length} contracts
        </p>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {sortOrder === 'asc' ? '↑' : '↓'} {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </button>
      </div>

      {/* Contracts List */}
      {isLoading ? (
        <Card>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : filteredContracts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No contracts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter || typeFilter
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first contract.'}
            </p>
            {!searchQuery && !statusFilter && !typeFilter && (
              <div className="mt-6">
                <Link to="/contracts/new">
                  <Button icon={<PlusIcon className="h-4 w-4" />}>
                    Create Contract
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract) => (
            <Card key={contract.id} variant="bordered" className="hover:shadow-md transition-shadow">
              <Link to={`/contracts/${contract.id}`} className="block">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <span className="text-primary-600 font-semibold text-sm">
                          {contract.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {contract.name}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(contract.status)}>
                          {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
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
                            contract.complianceScore.overall >= 90 ? 'bg-green-500' :
                            contract.complianceScore.overall >= 80 ? 'bg-yellow-500' :
                            'bg-red-500'
                          )} />
                          <span className="text-xs text-gray-500">
                            {contract.complianceScore.overall}% Compliant
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={classNames(
                            'w-2 h-2 rounded-full',
                            contract.riskAssessment.overall <= 30 ? 'bg-green-500' :
                            contract.riskAssessment.overall <= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          )} />
                          <span className="text-xs text-gray-500">
                            {contract.riskAssessment.overall <= 30 ? 'Low' :
                             contract.riskAssessment.overall <= 60 ? 'Medium' : 'High'} Risk
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-gray-900">
                        {contract.parties.length} {contract.parties.length === 1 ? 'Party' : 'Parties'}
                      </div>
                      <div className="text-sm text-gray-500">
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