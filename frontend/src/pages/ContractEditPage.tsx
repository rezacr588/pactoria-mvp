import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContracts } from '../hooks';
import { Contract } from '../types';
import { textStyles } from '../utils/typography';
import {
  ChevronLeftIcon,
  ExclamationCircleIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

// Import our new single-page form component
import { ContractEditForm } from '../components/forms/ContractEditForm';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function ContractEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { updateContract, fetchContract, selectedContract } = useContracts();

  // Local state for UI
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Load contract data on mount
  useEffect(() => {
    if (!id) {
      setLoadError('Contract ID is required');
      setIsLoading(false);
      return;
    }

    const loadContract = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        await fetchContract(id);
        
      } catch (error) {
        console.error('Failed to load contract:', error);
        setLoadError('Failed to load contract data');
        setIsLoading(false);
      }
    };

    loadContract();
  }, [id, fetchContract]);

  // Update local contract state when selectedContract changes
  useEffect(() => {
    if (selectedContract) {
      setContract(selectedContract);
      setIsLoading(false);
    }
  }, [selectedContract]);

  const handleUpdate = async (updateData: Partial<Contract>) => {
    if (!id || !contract) return;
    
    setIsUpdating(true);
    setUpdateError(null);

    try {
      await updateContract(id, updateData);
      navigate(`/contracts/${id}`);
    } catch (error) {
      console.error('Failed to update contract:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to update contract';
      if (error instanceof Error) {
        // Check if it's an ApiError with validation details
        const apiError = error as any;
        if (apiError.data?.detail) {
          const details = apiError.data.detail;
          if (Array.isArray(details)) {
            // Handle validation errors
            const validationErrors = details.map((detail: { loc?: string[]; msg: string }) => 
              `${detail.loc?.join('.') || 'Field'}: ${detail.msg}`
            ).join('; ');
            errorMessage = `Validation errors: ${validationErrors}`;
          } else if (typeof details === 'string') {
            errorMessage = details;
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      setUpdateError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/contracts')}
            className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-secondary-400 dark:hover:text-secondary-200"
          >
            <ChevronLeftIcon className="mr-1 h-5 w-5" />
            Back to Contracts
          </button>
        </div>
        
        <div className="text-center py-12">
          <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Error Loading Contract
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {loadError}
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/contracts')}
              className="btn-primary"
            >
              Back to Contracts
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No contract found
  if (!contract) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Contract Not Found
          </h3>
          <div className="mt-6">
            <button
              onClick={() => navigate('/contracts')}
              className="btn-primary"
            >
              Back to Contracts
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-4">
              <button
                onClick={() => navigate(`/contracts/${id}`)}
                className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-secondary-400 dark:hover:text-secondary-200 mr-4"
              >
                <ChevronLeftIcon className="mr-1 h-5 w-5" />
                Back to Contract
              </button>
            </div>
            
            <div className="flex items-center">
              <PencilIcon className="h-8 w-8 text-primary-500 mr-3" />
              <div>
                <h1 className={`${textStyles.pageTitle}`}>Edit Contract</h1>
                <p className="mt-2 text-neutral-600 dark:text-secondary-400">
                  Modify contract details and update your UK-compliant contract
                </p>
              </div>
            </div>
          </div>

          {/* Contract info */}
          <div className="text-right">
            <div className="text-sm text-neutral-500 dark:text-secondary-400">
              Contract: {contract.title}
            </div>
            <div className="text-xs text-neutral-400 dark:text-secondary-500">
              ID: {contract.id}
            </div>
            <div className="text-xs text-neutral-400 dark:text-secondary-500">
              Status: <span className="capitalize">{contract.status?.toLowerCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {updateError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 dark:text-red-200">
                {updateError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Single-page Contract Edit Form */}
      <ContractEditForm
        contract={contract}
        onUpdate={handleUpdate}
        isUpdating={isUpdating}
      />
    </div>
  );
}