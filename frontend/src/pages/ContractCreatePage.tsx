import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../hooks';
import { ContractType } from '../types';
import { textStyles } from '../utils/typography';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  ArrowPathIcon,
  BookmarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// Import our new hooks
import { useContractForm } from '../hooks/useContractForm';
import { useContractSteps } from '../hooks/useContractSteps';
import { useContractAutoSave } from '../hooks/useContractAutoSave';
import { useContractTemplates } from '../hooks/useContractTemplates';

// Import our new components
import { ProgressIndicator } from '../components/forms/ProgressIndicator';
import { TemplateSelectionStep } from '../components/forms/steps/TemplateSelectionStep';
import { ContractDetailsStep } from '../components/forms/steps/ContractDetailsStep';
import { ReviewStep } from '../components/forms/steps/ReviewStep';

export default function ContractCreatePage() {
  const navigate = useNavigate();
  const { createContract } = useContracts();

  // Use our custom hooks
  const { formData, errors, handleInputChange, validateStep, resetForm } = useContractForm();
  const { isAutoSaving, lastSaved, clearDraft } = useContractAutoSave(formData);
  const { templates, isLoading, error } = useContractTemplates();
  const { currentStep, handleNext, handlePrevious, canProceed, isFirstStep, isLastStep, steps } = useContractSteps(validateStep);

  // Local state for UI
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [stepAnimation, setStepAnimation] = useState<'slide-in' | 'slide-out' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Computed values
  const selectedTemplate = templates.find(t => t.id === formData.templateId);

  const handleTooltip = (key: string | null) => {
    setShowTooltip(showTooltip === key ? null : key);
  };

  const handleTemplateSelect = (templateId: string) => {
    // Update form data with template selection
    const template = templates.find(t => t.id === templateId);
    if (template && !formData.name) {
      handleInputChange({
        target: {
          name: 'name',
          value: `${template.name} - New Contract`
        }
      } as any);

      // Set plain English input based on template
      handleInputChange({
        target: {
          name: 'plainEnglishInput',
          value: `This ${template.name.toLowerCase()} will cover ${template.description.toLowerCase()}.`
        }
      } as any);
    }

    // Update template ID
    handleInputChange({
      target: { name: 'templateId', value: templateId }
    } as any);

    // Auto-advance to next step with animation
    setTimeout(() => {
      setStepAnimation('slide-out');
      setTimeout(() => {
        handleNext();
        setStepAnimation('slide-in');
        setTimeout(() => setStepAnimation(null), 300);
      }, 150);
    }, 200);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const newContract = await createContract({
        title: formData.name || `${selectedTemplate?.name} - ${formData.clientName}`,
        contract_type: (selectedTemplate?.contract_type || 'service_agreement') as ContractType,
        plain_english_input: formData.plainEnglishInput,
        client_name: formData.clientName,
        client_email: formData.clientEmail,
        supplier_name: formData.supplierName,
        contract_value: formData.contractValue ? parseFloat(formData.contractValue) : undefined,
        currency: formData.currency || 'GBP',
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        template_id: formData.templateId,
      });

      // Clear the draft after successful generation
      clearDraft();
      resetForm();

      navigate(`/contracts/${newContract.id}`);
    } catch (error) {
      console.error('Failed to create contract:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to create contract';
      if (error instanceof Error) {
        // Check if it's an ApiError with validation details
        if ((error as any).data?.detail) {
          const details = (error as any).data.detail;
          if (Array.isArray(details)) {
            // Handle validation errors
            const validationErrors = details.map((detail: any) => 
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
      console.error('Contract creation error:', errorMessage);
    } finally {
      setIsGenerating(false);
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
            isLoading={isLoading}
            error={error}
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
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`${textStyles.pageTitle}`}>Create New Contract</h1>
            <p className="mt-2 text-neutral-600 dark:text-secondary-400">
              Generate UK-compliant contracts with AI assistance in 3 simple steps
            </p>
          </div>

          {/* Auto-save indicator */}
          <div className="flex items-center space-x-4">
            {isAutoSaving && (
              <div className="flex items-center text-sm text-neutral-500 dark:text-secondary-400">
                <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                Saving draft...
              </div>
            )}
            {lastSaved && !isAutoSaving && (
              <div className="flex items-center text-sm text-neutral-500 dark:text-secondary-400">
                <BookmarkIcon className="h-4 w-4 mr-1" />
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
            {lastSaved && (
              <button
                onClick={clearDraft}
                className="btn-ghost btn-sm"
                title="Clear draft"
              >
                Clear Draft
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <ProgressIndicator steps={steps} currentStep={currentStep} />

      {/* Step Content */}
      <div className={`max-w-6xl mx-auto transition-all duration-300 ${
        stepAnimation === 'slide-out' ? 'opacity-0 transform translate-x-4' :
        stepAnimation === 'slide-in' ? 'opacity-0 transform -translate-x-4 animate-slide-in-left' :
        'opacity-100 transform translate-x-0'
      }`}>
        {renderCurrentStep()}
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-12 pt-8 border-t border-neutral-200 dark:border-secondary-700">
        <div className="flex items-center mb-4 sm:mb-0">
          <button
            type="button"
            onClick={() => {
              setStepAnimation('slide-out');
              setTimeout(() => {
                handlePrevious();
                setStepAnimation('slide-in');
                setTimeout(() => setStepAnimation(null), 300);
              }, 150);
            }}
            disabled={isFirstStep}
            className="btn-secondary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-2" />
            Previous
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {!isLastStep ? (
            <button
              type="button"
              onClick={() => {
                setStepAnimation('slide-out');
                setTimeout(() => {
                  handleNext();
                  setStepAnimation('slide-in');
                  setTimeout(() => setStepAnimation(null), 300);
                }, 150);
              }}
              disabled={!canProceed()}
              data-testid="continue-button"
              className="btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span className="flex items-center">
                Continue to {steps.find(s => s.id === currentStep + 1)?.name}
                <ChevronRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canProceed() || isGenerating}
              data-testid="generate-contract-button"
              className="btn-success btn-lg disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-success-600 to-emerald-600 transition-opacity duration-300 group-hover:opacity-90"></div>
              <div className="relative flex items-center">
                {isGenerating ? (
                  <span className="flex items-center">
                    <ArrowPathIcon className="h-5 w-5 mr-3 animate-spin" />
                    Generating Contract...
                    <div className="ml-3 flex space-x-1">
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </span>
                ) : (
                  <span className="flex items-center">
                    <SparklesIcon className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                    Generate Contract with AI
                    <CheckCircleIcon className="h-5 w-5 ml-2 opacity-75 group-hover:opacity-100 transition-opacity" />
                  </span>
                )}
              </div>
            </button>
          )}

          {/* Progress indicator */}
          <div className="hidden sm:flex items-center text-sm text-neutral-500 dark:text-secondary-400">
            Step {currentStep} of {steps.length}
          </div>
        </div>
      </div>

      {/* Mobile step indicator */}
      <div className="flex sm:hidden justify-center mt-4">
        <div className="text-sm text-neutral-500 dark:text-secondary-400">
          Step {currentStep} of {steps.length}
        </div>
      </div>
    </div>
  );
}
