import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContracts } from '../hooks';
import { useAuthStore } from '../store/authStore';
import { Contract } from '../types';
import { CONTRACT_STATUS_OPTIONS } from '../store/contractStore';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  Squares2X2Icon,
  TableCellsIcon,
  CalendarIcon,
  CurrencyPoundIcon,
  UserIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { Badge, Input } from '../components/ui';

const CONTRACT_TYPE_OPTIONS = [
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'employment', label: 'Employment' },
  { value: 'supplier', label: 'Supplier Agreement' },
  { value: 'nda', label: 'NDA' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'commercial', label: 'Commercial' }
];

export default function ContractsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { 
    contracts = [], 
    isLoading, 
    error, 
    fetchContracts,
    deleteContract
  } = useContracts({
    autoFetch: false, // Don't auto-fetch until we confirm authentication
    filters: {}
  });
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch contracts if user is authenticated
    if (!isAuthenticated || !user) {
      return;
    }

    const loadContracts = async () => {
      try {
        await fetchContracts({
          page: 1,
          size: 100,
          status: statusFilter || undefined,
          contract_type: typeFilter || undefined,
          search: searchQuery || undefined
        });
      } catch (err) {
        console.error('Failed to load contracts:', err);
        // Don't rethrow error to prevent infinite loading states
      }
    };

    // Add a small delay to ensure auth state is fully settled
    const timeoutId = setTimeout(() => {
      loadContracts();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user, fetchContracts, statusFilter, typeFilter, searchQuery]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleTypeFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  };

  // Action handlers
  const handleView = (contractId: string) => {
    navigate(`/contracts/${contractId}`);
  };

  const handleEdit = (contractId: string) => {
    navigate(`/contracts/${contractId}/edit`);
  };

  const handleDelete = async (contractId: string) => {
    if (deleteConfirm === contractId) {
      try {
        await deleteContract(contractId);
        setDeleteConfirm(null);
      } catch (error) {
        console.error('Failed to delete contract:', error);
      }
    } else {
      setDeleteConfirm(contractId);
    }
  };

  const formatCurrency = (value: number | null, currency: string = 'GBP') => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'warning';
      case 'expired': return 'danger';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract: Contract) => {
      const matchesSearch = !searchQuery || 
        (contract.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.client_name?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = !statusFilter || contract.status === statusFilter;
      const matchesType = !typeFilter || contract.contract_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [contracts, searchQuery, statusFilter, typeFilter]);

  // Show loading if not authenticated or if contracts are loading
  if (!isAuthenticated || !user) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="contracts-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-600 mt-1">
            Manage your contracts and agreements
          </p>
        </div>
        <Link to="/contracts/create">
          <Button className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            New Contract
          </Button>
        </Link>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search contracts..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={handleStatusFilter}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">All Status</option>
                {CONTRACT_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <select
              value={typeFilter}
              onChange={handleTypeFilter}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">All Types</option>
              {CONTRACT_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'cards'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Squares2X2Icon className="h-4 w-4" />
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TableCellsIcon className="h-4 w-4" />
            Table
          </button>
        </div>
      </div>

      {/* Contracts List */}
      {filteredContracts.length === 0 ? (
        <EmptyState
          title="No contracts found"
          description="Get started by creating your first contract."
          action={{
            label: "Create Contract",
            href: "/contracts/create"
          }}
        />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredContracts.map((contract: Contract) => (
            <Card key={contract.id} className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {contract.title}
                    </h3>
                    <Badge variant={getStatusColor(contract.status)}>
                      {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                    </Badge>
                  </div>
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>

                {/* Contract Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium">{contract.client_name || 'N/A'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">
                      {CONTRACT_TYPE_OPTIONS.find(t => t.value === contract.contract_type)?.label || contract.contract_type}
                    </span>
                  </div>

                  {contract.contract_value && (
                    <div className="flex items-center gap-2">
                      <CurrencyPoundIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Value:</span>
                      <span className="font-medium">{formatCurrency(contract.contract_value, contract.currency)}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Updated:</span>
                    <span className="font-medium">{formatDate(contract.updated_at || contract.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Version {contract.version}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(contract.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <EyeIcon className="h-3 w-3" />
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(contract.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <PencilIcon className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(contract.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        deleteConfirm === contract.id
                          ? 'text-white bg-red-600 hover:bg-red-700'
                          : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      }`}
                    >
                      <TrashIcon className="h-3 w-3" />
                      {deleteConfirm === contract.id ? 'Confirm' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContracts.map((contract: Contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {contract.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            Version {contract.version}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{contract.client_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {CONTRACT_TYPE_OPTIONS.find(t => t.value === contract.contract_type)?.label || contract.contract_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CurrencyPoundIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {formatCurrency(contract.contract_value || null, contract.currency)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getStatusColor(contract.status)}>
                        {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {formatDate(contract.updated_at || contract.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(contract.id)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          title="View Contract"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(contract.id)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded-md hover:bg-gray-50 transition-colors"
                          title="Edit Contract"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contract.id)}
                          className={`p-1 rounded-md transition-colors ${
                            deleteConfirm === contract.id
                              ? 'text-white bg-red-600 hover:bg-red-700'
                              : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                          }`}
                          title={deleteConfirm === contract.id ? 'Confirm Delete' : 'Delete Contract'}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
