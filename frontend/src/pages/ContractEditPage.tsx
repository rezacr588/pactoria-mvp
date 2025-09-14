import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContracts } from '../hooks';
import { Contract } from '../types';
import { textStyles } from '../utils/typography';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// Import our hooks
import { useContractForm } from '../hooks/useContractForm';
import { useContractSteps } from '../hooks/useContractSteps';
import { useContractTemplates } from '../hooks/useContractTemplates';

// Import our components
import { ProgressIndicator } from '../components/forms/ProgressIndicator';
import { TemplateSelectionStep } from '../components/forms/steps/TemplateSelectionStep';
import { ContractDetailsStep } from '../components/forms/steps/ContractDetailsStep';
import { ReviewStep } from '../components/forms/steps/ReviewStep';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function ContractEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { updateContract, fetchContract, selectedContract } = useContracts();

  // Use our custom hooks
  const { formData, errors, handleInputChange, validateStep, setFormData } = useContractForm();
  const { templates, isLoading: templatesLoading, error: templatesError } = useContractTemplates();
  const { currentStep, handleNext, handlePrevious, canProceed, isFirstStep, isLastStep, steps } = useContractSteps(validateStep);

  // Local state for UI
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);

  // Computed values
  const selectedTemplate = templates.find(t => t.id === formData.templateId);

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

  // Update form when selectedContract changes
  useEffect(() => {
    if (selectedContract) {
      setContract(selectedContract);
      
      // Pre-fill form data with contract data
      setFormData({
        templateId: selectedContract.template_id || '',
        name: selectedContract.title || '',
        description: '', // This might need to be extracted from content
        clientName: selectedContract.client_name || '',
        clientEmail: selectedContract.client_email || '',
        serviceDescription: selectedContract.plain_english_input || '',
        contractValue: selectedContract.contract_value?.toString() || '',
        startDate: selectedContract.start_date ? selectedContract.start_date.split('T')[0] : '',
        endDate: selectedContract.end_date ? selectedContract.end_date.split('T')[0] : '',
        paymentTerms: '30', // Default value
        specialTerms: '',
        plainEnglishInput: selectedContract.plain_english_input || '',
        supplierName: selectedContract.supplier_name || '',
        currency: selectedContract.currency || 'GBP',
      });
      
      setIsLoading(false);
    }
  }, [selectedContract, setFormData]);

  const handleTooltip = (key: string | null) => {
    setShowTooltip(showTooltip === key ? null : key);
  };

  const handleTemplateSelect = (templateId: string) => {
    // Update form data with template selection
    handleInputChange({
      target: { name: 'templateId', value: templateId }
    } as React.ChangeEvent<HTMLInputElement>);

    // Auto-advance to next step
    setTimeout(() => {
      handleNext();
    }, 200);
  };

  const handleUpdate = async () => {
    if (!id || !contract) return;
    
    setIsUpdating(true);

    try {
      await updateContract(id, {
        title: formData.name || contract.title,
        client_name: formData.clientName,
        client_email: formData.clientEmail,
        supplier_name: formData.supplierName,
        contract_value: formData.contractValue ? parseFloat(formData.contractValue) : undefined,
        currency: formData.currency || 'GBP',
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
      });

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
      
      // Display error to user (you might want to use a toast notification here)
      console.error('Contract update error:', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <TemplateSelectionStep
            key={currentStep}
            templates={templates}
            selectedTemplateId={formData.templateId}
            onTemplateSelect={handleTemplateSelect}
            isLoading={templatesLoading}
            error={templatesError}
            validationError={errors.templateId}
          />
        );

      case 2:
        return (
          <ContractDetailsStep
            key={currentStep}
            formData={formData}
            errors={errors}
            showTooltip={showTooltip}
            onInputChange={handleInputChange}
            onTooltipClick={handleTooltip}
            selectedTemplateName={selectedTemplate?.name}
          />
        );

      case 3:
        return (
          <ReviewStep
            key={currentStep}
            formData={formData}
            selectedTemplateName={selectedTemplate?.name}
            onGenerate={handleUpdate}
            isGenerating={isUpdating}
          />
        );

      default:
        return null;
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
            
            <h1 className={`${textStyles.pageTitle}`}>Edit Contract</h1>
            <p className="mt-2 text-neutral-600 dark:text-secondary-400">
              Modify the contract details and update your UK-compliant contract
            </p>
          </div>

          {/* Contract info */}
          <div className="text-right">
            <div className="text-sm text-neutral-500 dark:text-secondary-400">
              Contract: {contract?.title}
            </div>
            <div className="text-xs text-neutral-400 dark:text-secondary-500">
              ID: {contract?.id}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <ProgressIndicator 
          steps={steps} 
          currentStep={currentStep} 
        />
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {renderCurrentStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-neutral-200 dark:border-secondary-700 pt-6">
        <button
          onClick={handlePrevious}
          disabled={isFirstStep}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-secondary-800 dark:text-secondary-200 dark:border-secondary-600 dark:hover:bg-secondary-700"
        >
          <ChevronLeftIcon className="mr-2 h-4 w-4" />
          Previous
        </button>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/contracts/${id}`)}
            className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-secondary-400 dark:hover:text-secondary-200"
          >
            Cancel
          </button>

          {!isLastStep ? (
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="ml-2 h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleUpdate}
              disabled={!canProceed || isUpdating}
              className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <>
                  <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                  Updating Contract...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="mr-2 h-4 w-4" />
                  Update Contract
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}