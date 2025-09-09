import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useContracts } from '../hooks';
import { CONTRACT_STATUS_OPTIONS } from '../store/contractStore';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  PlusIcon
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
  const { 
    contracts, 
    isLoading, 
    error, 
    fetchContracts
  } = useContracts();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleTypeFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = !searchQuery || 
      contract.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || contract.status === statusFilter;
    const matchesType = !typeFilter || contract.contract_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (isLoading) {
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-600 mt-1">Manage your contracts and agreements</p>
        </div>
        <Link to="/contracts/create">
          <Button variant="primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Contract
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search contracts..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={handleStatusFilter}
              className="w-40 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Status</option>
              {CONTRACT_STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <select
              value={typeFilter}
              onChange={handleTypeFilter}
              className="w-48 px-3 py-2 border border-gray-300 rounded-md"
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
      </Card>

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
      ) : (
        <div className="space-y-4">
          {filteredContracts.map(contract => (
            <Card key={contract.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Link 
                      to={`/contracts/${contract.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {contract.name}
                    </Link>
                    <Badge 
                      variant={
                        contract.status === 'active' ? 'success' :
                        contract.status === 'draft' ? 'warning' :
                        contract.status === 'expired' ? 'danger' : 'default'
                      }
                    >
                      {contract.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Client: {contract.client_name || 'N/A'}</p>
                    <p>Type: {CONTRACT_TYPE_OPTIONS.find(t => t.value === contract.contract_type)?.label || contract.contract_type}</p>
                    {contract.contract_value && (
                      <p>Value: {contract.currency} {contract.contract_value.toLocaleString()}</p>
                    )}
                  </div>
                </div>
                
                <div className="text-right text-sm text-gray-500">
                  <p>Updated: {new Date(contract.updated_at || contract.created_at).toLocaleDateString()}</p>
                  <p>Version: {contract.version}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
