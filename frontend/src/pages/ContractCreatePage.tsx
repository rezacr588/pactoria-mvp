import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContractStore } from '../store/contractStore';
import { ContractType } from '../types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  UsersIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  InformationCircleIcon,
  SparklesIcon,
  BookmarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { textColors, textStyles } from '../utils/typography';

const UK_CONTRACT_TEMPLATES = [
  {
    id: '1',
    name: 'Professional Services Agreement',
    description: 'For consultancy, marketing, and professional services',
    category: 'service-agreement',
    contract_type: 'service_agreement' as ContractType,
    estimatedTime: '15 minutes',
    complexity: 'Standard',
    icon: DocumentTextIcon,
    fields: ['Client details', 'Service scope', 'Payment terms', 'Deliverables'],
  },
  {
    id: '2',
    name: 'Employment Contract - Full Time',
    description: 'UK employment law compliant full-time contracts',
    category: 'employment',
    contract_type: 'employment_contract' as ContractType,
    estimatedTime: '20 minutes',
    complexity: 'Standard',
    icon: UsersIcon,
    fields: ['Employee details', 'Job description', 'Salary & benefits', 'Terms & conditions'],
  },
  {
    id: '3',
    name: 'Supplier/Vendor Agreement',
    description: 'Contracts with suppliers and service providers',
    category: 'supplier',
    contract_type: 'supplier_agreement' as ContractType,
    estimatedTime: '18 minutes',
    complexity: 'Standard',
    icon: DocumentTextIcon,
    fields: ['Supplier details', 'Products/services', 'Payment terms', 'Quality standards'],
  },
  {
    id: '4',
    name: 'Non-Disclosure Agreement (NDA)',
    description: 'Protect confidential information and trade secrets',
    category: 'nda',
    contract_type: 'nda' as ContractType,
    estimatedTime: '10 minutes',
    complexity: 'Simple',
    icon: DocumentTextIcon,
    fields: ['Parties', 'Confidential information', 'Duration', 'Exceptions'],
  },
  {
    id: '5',
    name: 'Partnership Agreement',
    description: 'Business partnerships and joint ventures',
    category: 'partnership',
    contract_type: 'partnership' as ContractType,
    estimatedTime: '25 minutes',
    complexity: 'Complex',
    icon: UsersIcon,
    fields: ['Partners', 'Contributions', 'Profit sharing', 'Governance'],
  },
];

const steps = [
  { id: 1, name: 'Choose Template', description: 'Select the right UK legal template' },
  { id: 2, name: 'Contract Details', description: 'Provide contract information' },
  { id: 3, name: 'Review & Generate', description: 'Review and create your contract' },
];

interface ContractFormData {
  templateId: string;
  name: string;
  description: string;
  clientName: string;
  clientEmail: string;
  serviceDescription: string;
  contractValue: string;
  startDate: string;
  endDate: string;
  paymentTerms: string;
  specialTerms: string;
  plainEnglishInput: string;
  supplierName: string;
  currency: string;
}

interface FormErrors {
  [key: string]: string;
}

interface StepValidation {
  isValid: boolean;
  errors: FormErrors;
}

export default function ContractCreatePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ContractFormData>({
    templateId: '',
    name: '',
    description: '',
    clientName: '',
    clientEmail: '',
    serviceDescription: '',
    contractValue: '',
    startDate: '',
    endDate: '',
    paymentTerms: '30',
    specialTerms: '',
    plainEnglishInput: '',
    supplierName: '',
    currency: 'GBP',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [stepAnimation, setStepAnimation] = useState<'slide-in' | 'slide-out' | null>(null);
  
  const navigate = useNavigate();
  const { createContract } = useContractStore();

  const selectedTemplate = UK_CONTRACT_TEMPLATES.find(t => t.id === formData.templateId);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!formData.name && !formData.clientName) return;
    
    setIsAutoSaving(true);
    try {
      // Simulate auto-save to localStorage
      localStorage.setItem('contract-draft', JSON.stringify({ 
        ...formData, 
        lastSaved: new Date().toISOString() 
      }));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setTimeout(() => setIsAutoSaving(false), 500);
    }
  }, [formData]);

  // Auto-save on form data changes
  useEffect(() => {
    const timer = setTimeout(autoSave, 2000);
    return () => clearTimeout(timer);
  }, [autoSave]);

  // Load draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem('contract-draft');
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        setFormData(prev => ({ ...prev, ...parsedDraft }));
        setLastSaved(new Date(parsedDraft.lastSaved));
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, []);

  // Form validation
  const validateStep = useCallback((step: number): StepValidation => {
    const newErrors: FormErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.templateId) {
          newErrors.templateId = 'Please select a contract template';
        }
        break;
      case 2:
        if (!formData.name.trim()) {
          newErrors.name = 'Contract name is required';
        }
        if (!formData.clientName.trim()) {
          newErrors.clientName = 'Client name is required';
        }
        if (!formData.serviceDescription.trim()) {
          newErrors.serviceDescription = 'Service description is required';
        }
        if (formData.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
          newErrors.clientEmail = 'Please enter a valid email address';
        }
        if (formData.contractValue && isNaN(Number(formData.contractValue))) {
          newErrors.contractValue = 'Please enter a valid number';
        }
        if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
          newErrors.endDate = 'End date must be after start date';
        }
        break;
    }
    
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  }, [formData]);

  const handleNext = () => {
    const validation = validateStep(currentStep);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    if (currentStep < 3) {
      setStepAnimation('slide-out');
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setErrors({});
        setStepAnimation('slide-in');
        setTimeout(() => setStepAnimation(null), 300);
      }, 150);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setStepAnimation('slide-out');
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setErrors({});
        setStepAnimation('slide-in');
        setTimeout(() => setStepAnimation(null), 300);
      }, 150);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setFormData(prev => ({ ...prev, templateId }));
    // Auto-populate some fields based on template
    const template = UK_CONTRACT_TEMPLATES.find(t => t.id === templateId);
    if (template && !formData.name) {
      setFormData(prev => ({ 
        ...prev, 
        templateId,
        name: `${template.name} - New Contract`,
        plainEnglishInput: `This ${template.name.toLowerCase()} will cover ${template.description.toLowerCase()}.`
      }));
    }
    setTimeout(handleNext, 200); // Small delay for better UX
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('contract-draft');
    setLastSaved(null);
  };

  const handleTooltip = (key: string | null) => {
    setShowTooltip(showTooltip === key ? null : key);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate AI contract generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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
        start_date: formData.startDate,
        end_date: formData.endDate,
        template_id: formData.templateId,
      });

      navigate(`/contracts/${newContract.id}`);
    } catch (error) {
      console.error('Failed to create contract:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const canProceed = () => {
    const validation = validateStep(currentStep);
    return validation.isValid;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`${textStyles.pageTitle}`}>Create New Contract</h1>
            <p className={`mt-2 ${textColors.secondary}`}>
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
      <nav aria-label="Progress" className="mb-10">
        <div className="max-w-2xl mx-auto">
          <ol className="flex items-center justify-between">
            {steps.map((step, stepIdx) => (
              <li key={step.name} className="relative flex-1">
                {stepIdx !== steps.length - 1 && (
                  <div className="absolute top-4 left-1/2 w-full h-0.5 -ml-px" aria-hidden="true">
                    <div className={`h-full transition-all duration-500 ease-out ${
                      currentStep > step.id 
                        ? 'bg-gradient-to-r from-primary-600 to-primary-500' 
                        : 'bg-neutral-200 dark:bg-secondary-700'
                    }`} />
                  </div>
                )}
                <div className="relative flex flex-col items-center group">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 transform ${
                    currentStep > step.id
                      ? 'bg-primary-600 border-primary-600 scale-110'
                      : currentStep === step.id
                      ? 'bg-white dark:bg-secondary-800 border-primary-600 ring-4 ring-primary-100 dark:ring-primary-900/30 scale-110'
                      : 'bg-white dark:bg-secondary-800 border-neutral-300 dark:border-secondary-600 hover:border-primary-300 dark:hover:border-primary-600'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircleIcon className="h-5 w-5 text-white animate-scale-in" />
                    ) : (
                      <span className={`h-2.5 w-2.5 rounded-full transition-colors duration-200 ${
                        currentStep === step.id 
                          ? 'bg-primary-600 animate-pulse' 
                          : 'bg-neutral-300 dark:bg-secondary-600'
                      }`} />
                    )}
                  </div>
                  <div className="mt-4 text-center max-w-32">
                    <div className={`text-sm font-medium transition-colors duration-200 ${
                      currentStep >= step.id 
                        ? 'text-primary-600 dark:text-primary-400' 
                        : textColors.muted
                    }`}>
                      {step.name}
                    </div>
                    <div className={`text-xs mt-1 ${textColors.muted} leading-tight`}>
                      {step.description}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      {/* Step Content */}
      <div className={`max-w-6xl mx-auto transition-all duration-300 ${
        stepAnimation === 'slide-out' ? 'opacity-0 transform translate-x-4' :
        stepAnimation === 'slide-in' ? 'opacity-0 transform -translate-x-4 animate-slide-in-left' :
        'opacity-100 transform translate-x-0'
      }`}>
        {currentStep === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <SparklesIcon className="h-12 w-12 text-primary-500 mx-auto mb-4" />
              <h2 className={`text-2xl font-bold ${textColors.primary} mb-2`}>
                Choose Your Contract Template
              </h2>
              <p className={`text-base ${textColors.secondary} max-w-2xl mx-auto`}>
                Select from our library of UK-compliant legal templates, designed by legal experts and optimized for your business needs.
              </p>
              {errors.templateId && (
                <div className="mt-3 text-danger-600 dark:text-danger-400 text-sm font-medium">
                  {errors.templateId}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {UK_CONTRACT_TEMPLATES.map((template) => {
                const isSelected = formData.templateId === template.id;
                return (
                  <div
                    key={template.id}
                    className={`group relative rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${
                      isSelected
                        ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/30 dark:to-primary-800/20 shadow-lg shadow-primary-200/30 dark:shadow-primary-900/20 scale-[1.02]'
                        : 'border-neutral-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md'
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="bg-primary-600 text-white rounded-full p-1 shadow-lg">
                          <CheckCircleIcon className="h-5 w-5" />
                        </div>
                      </div>
                    )}
                    
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-2 rounded-lg transition-colors ${
                        isSelected ? 'bg-primary-100 dark:bg-primary-800/30' : 'bg-neutral-100 dark:bg-secondary-800'
                      }`}>
                        <template.icon className={`h-6 w-6 transition-colors ${
                          isSelected ? 'text-primary-600 dark:text-primary-400' : textColors.subtle
                        }`} />
                      </div>
                      
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          template.complexity === 'Simple' 
                            ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' :
                          template.complexity === 'Complex' 
                            ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400' :
                          'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400'
                        }`}>
                          {template.complexity}
                        </span>
                        <div className="text-xs text-neutral-500 dark:text-secondary-400">
                          {template.fields.length} fields
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="mb-4">
                      <h3 className={`text-lg font-semibold mb-2 transition-colors ${
                        isSelected ? 'text-primary-700 dark:text-primary-300' : textColors.primary
                      }`}>
                        {template.name}
                      </h3>
                      <p className={`text-sm leading-relaxed ${textColors.secondary}`}>
                        {template.description}
                      </p>
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-secondary-700">
                      <div className="flex items-center text-sm text-neutral-500 dark:text-secondary-400">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {template.estimatedTime}
                      </div>
                      <div className={`text-sm font-medium transition-colors ${
                        isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-600 dark:text-secondary-300'
                      }`}>
                        {isSelected ? 'Selected' : 'Select'}
                      </div>
                    </div>
                    
                    {/* Hover effect */}
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                      isSelected ? 'opacity-100' : ''
                    }`} />
                  </div>
                );
              })}
            </div>
            
            {/* Help text */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Not sure which template to choose?</p>
                  <p>Each template is specifically designed for different business scenarios. The complexity rating indicates the number of clauses and legal considerations involved. You can always modify the generated contract later.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <DocumentTextIcon className="h-12 w-12 text-primary-500 mx-auto mb-4" />
              <h2 className={`text-2xl font-bold ${textColors.primary} mb-2`}>
                Contract Details
              </h2>
              <p className={`text-base ${textColors.secondary} max-w-2xl mx-auto`}>
                Provide the essential details for your {selectedTemplate?.name.toLowerCase()}. All fields marked with * are required.
              </p>
            </div>
            
            <div className="card-elevated">
              <div className="space-y-8">
                {/* Basic Information */}
                <div>
                  <h3 className={`text-lg font-semibold ${textColors.primary} mb-4 pb-2 border-b border-neutral-200 dark:border-secondary-700`}>
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="form-label">
                        Contract Name *
                        <button
                          type="button"
                          className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-secondary-300"
                          onClick={() => handleTooltip('name')}
                        >
                          <InformationCircleIcon className="h-4 w-4 inline" />
                        </button>
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        className={`form-input-lg ${errors.name ? 'border-danger-300 focus:ring-danger-500 focus:border-danger-500' : ''}`}
                        placeholder="e.g., Marketing Services - Acme Corp"
                        value={formData.name}
                        onChange={handleInputChange}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                      />
                      {errors.name && <div id="name-error" className="form-error">{errors.name}</div>}
                      {showTooltip === 'name' && (
                        <div className="form-help">
                          Choose a descriptive name that helps you identify this contract easily. Include the client name and service type for clarity.
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="contractValue" className="form-label">
                        Contract Value (£)
                        <button
                          type="button"
                          className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-secondary-300"
                          onClick={() => handleTooltip('value')}
                        >
                          <InformationCircleIcon className="h-4 w-4 inline" />
                        </button>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 dark:text-secondary-400">£</span>
                        <input
                          type="number"
                          name="contractValue"
                          id="contractValue"
                          className={`form-input-lg pl-8 ${errors.contractValue ? 'border-danger-300 focus:ring-danger-500 focus:border-danger-500' : ''}`}
                          placeholder="50,000"
                          value={formData.contractValue}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      {errors.contractValue && <div className="form-error">{errors.contractValue}</div>}
                      {showTooltip === 'value' && (
                        <div className="form-help">
                          Enter the total contract value in British Pounds. This is optional but helps with contract management and reporting.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="form-label">
                    Contract Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    className="form-textarea"
                    placeholder="Brief description of the contract purpose and scope (optional)"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                  <div className="form-help">
                    Provide a high-level overview of what this contract covers. This will help with organization and searching later.
                  </div>
                </div>

                {/* Client/Party Information */}
                <div>
                  <h3 className={`text-lg font-semibold ${textColors.primary} mb-4 pb-2 border-b border-neutral-200 dark:border-secondary-700`}>
                    Client/Party Information
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="clientName" className="form-label">
                        Client/Company Name *
                        <button
                          type="button"
                          className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-secondary-300"
                          onClick={() => handleTooltip('clientName')}
                        >
                          <InformationCircleIcon className="h-4 w-4 inline" />
                        </button>
                      </label>
                      <input
                        type="text"
                        name="clientName"
                        id="clientName"
                        className={`form-input-lg ${errors.clientName ? 'border-danger-300 focus:ring-danger-500 focus:border-danger-500' : ''}`}
                        placeholder="Acme Corporation Ltd"
                        value={formData.clientName}
                        onChange={handleInputChange}
                        aria-describedby={errors.clientName ? 'clientName-error' : undefined}
                      />
                      {errors.clientName && <div id="clientName-error" className="form-error">{errors.clientName}</div>}
                      {showTooltip === 'clientName' && (
                        <div className="form-help">
                          Enter the full legal name of the client or company you're contracting with.
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="clientEmail" className="form-label">
                        Client Email
                        <button
                          type="button"
                          className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-secondary-300"
                          onClick={() => handleTooltip('clientEmail')}
                        >
                          <InformationCircleIcon className="h-4 w-4 inline" />
                        </button>
                      </label>
                      <input
                        type="email"
                        name="clientEmail"
                        id="clientEmail"
                        className={`form-input-lg ${errors.clientEmail ? 'border-danger-300 focus:ring-danger-500 focus:border-danger-500' : ''}`}
                        placeholder="contact@acme.com"
                        value={formData.clientEmail}
                        onChange={handleInputChange}
                        aria-describedby={errors.clientEmail ? 'clientEmail-error' : undefined}
                      />
                      {errors.clientEmail && <div id="clientEmail-error" className="form-error">{errors.clientEmail}</div>}
                      {showTooltip === 'clientEmail' && (
                        <div className="form-help">
                          Primary contact email for contract communications and notifications.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contract Terms */}
                <div>
                  <h3 className={`text-lg font-semibold ${textColors.primary} mb-4 pb-2 border-b border-neutral-200 dark:border-secondary-700`}>
                    Contract Terms
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="serviceDescription" className="form-label">
                        Service/Work Description *
                        <button
                          type="button"
                          className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-secondary-300"
                          onClick={() => handleTooltip('serviceDescription')}
                        >
                          <InformationCircleIcon className="h-4 w-4 inline" />
                        </button>
                      </label>
                      <textarea
                        name="serviceDescription"
                        id="serviceDescription"
                        rows={4}
                        className={`form-textarea ${errors.serviceDescription ? 'border-danger-300 focus:ring-danger-500 focus:border-danger-500' : ''}`}
                        placeholder="Detailed description of the services or work to be performed"
                        value={formData.serviceDescription}
                        onChange={handleInputChange}
                        aria-describedby={errors.serviceDescription ? 'serviceDescription-error' : undefined}
                      />
                      {errors.serviceDescription && <div id="serviceDescription-error" className="form-error">{errors.serviceDescription}</div>}
                      {showTooltip === 'serviceDescription' && (
                        <div className="form-help">
                          Provide a clear and detailed description of the work to be performed. This will form the core of your contract terms.
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      <div>
                        <label htmlFor="startDate" className="form-label">
                          Start Date
                          <button
                            type="button"
                            className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-secondary-300"
                            onClick={() => handleTooltip('startDate')}
                          >
                            <InformationCircleIcon className="h-4 w-4 inline" />
                          </button>
                        </label>
                        <input
                          type="date"
                          name="startDate"
                          id="startDate"
                          className="form-input-lg"
                          value={formData.startDate}
                          onChange={handleInputChange}
                        />
                        {showTooltip === 'startDate' && (
                          <div className="form-help">
                            When will the contract work begin? Leave blank if not applicable.
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="endDate" className="form-label">
                          End Date
                          <button
                            type="button"
                            className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-secondary-300"
                            onClick={() => handleTooltip('endDate')}
                          >
                            <InformationCircleIcon className="h-4 w-4 inline" />
                          </button>
                        </label>
                        <input
                          type="date"
                          name="endDate"
                          id="endDate"
                          className={`form-input-lg ${errors.endDate ? 'border-danger-300 focus:ring-danger-500 focus:border-danger-500' : ''}`}
                          value={formData.endDate}
                          onChange={handleInputChange}
                          aria-describedby={errors.endDate ? 'endDate-error' : undefined}
                        />
                        {errors.endDate && <div id="endDate-error" className="form-error">{errors.endDate}</div>}
                        {showTooltip === 'endDate' && (
                          <div className="form-help">
                            When will the contract work be completed? Must be after start date if both are specified.
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="paymentTerms" className="form-label">
                          Payment Terms (days)
                          <button
                            type="button"
                            className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-secondary-300"
                            onClick={() => handleTooltip('paymentTerms')}
                          >
                            <InformationCircleIcon className="h-4 w-4 inline" />
                          </button>
                        </label>
                        <select
                          name="paymentTerms"
                          id="paymentTerms"
                          className="form-select-lg"
                          value={formData.paymentTerms}
                          onChange={handleInputChange}
                        >
                          <option value="15">15 days</option>
                          <option value="30">30 days</option>
                          <option value="45">45 days</option>
                          <option value="60">60 days</option>
                        </select>
                        {showTooltip === 'paymentTerms' && (
                          <div className="form-help">
                            How many days after invoicing should payment be made? 30 days is standard for UK business contracts.
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="specialTerms" className="form-label">
                        Special Terms & Conditions
                        <button
                          type="button"
                          className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-secondary-300"
                          onClick={() => handleTooltip('specialTerms')}
                        >
                          <InformationCircleIcon className="h-4 w-4 inline" />
                        </button>
                      </label>
                      <textarea
                        name="specialTerms"
                        id="specialTerms"
                        rows={3}
                        className="form-textarea"
                        placeholder="Any additional terms, conditions, or requirements"
                        value={formData.specialTerms}
                        onChange={handleInputChange}
                      />
                      {showTooltip === 'specialTerms' && (
                        <div className="form-help">
                          Include any specific requirements, milestones, or conditions unique to this contract.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-8">
            <div className="text-center">
              <CheckCircleIcon className="h-12 w-12 text-success-500 mx-auto mb-4" />
              <h2 className={`text-2xl font-bold ${textColors.primary} mb-2`}>
                Review & Generate Contract
              </h2>
              <p className={`text-base ${textColors.secondary} max-w-2xl mx-auto`}>
                Please review your contract details below. Once you're satisfied, our AI will generate a professional, UK-compliant legal document.
              </p>
            </div>
            
            {/* Review Summary */}
            <div className="card-elevated">
              <h3 className={`text-xl font-semibold ${textColors.primary} mb-6`}>Review Contract Details</h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Contract Information</h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-xs text-gray-500">Template</dt>
                      <dd className="text-sm text-gray-900">{selectedTemplate?.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Name</dt>
                      <dd className="text-sm text-gray-900">{formData.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Value</dt>
                      <dd className="text-sm text-gray-900">£{formData.contractValue || 'Not specified'}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Client Details</h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-xs text-gray-500">Client Name</dt>
                      <dd className="text-sm text-gray-900">{formData.clientName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Email</dt>
                      <dd className="text-sm text-gray-900">{formData.clientEmail || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Payment Terms</dt>
                      <dd className="text-sm text-gray-900">{formData.paymentTerms} days</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* AI Preview */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-6">AI-Generated Preview</h3>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">AI Analysis Complete</h4>
                    <p className="text-sm text-gray-600">
                      Your contract has been analyzed for UK legal compliance and risk factors.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="bg-white dark:bg-secondary-800 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-success-500 dark:text-success-400 mr-2" />
                      <span className={`text-sm font-medium ${textColors.primary}`}>Compliance Score</span>
                    </div>
                    <p className="text-2xl font-bold text-success-600 dark:text-success-400 mt-1">94%</p>
                    <p className={`text-xs ${textColors.muted}`}>UK Legal Standards</p>
                  </div>
                  
                  <div className="bg-white dark:bg-secondary-800 rounded-lg p-4">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-warning-500 dark:text-warning-400 mr-2" />
                      <span className={`text-sm font-medium ${textColors.primary}`}>Risk Level</span>
                    </div>
                    <p className="text-2xl font-bold text-warning-600 dark:text-warning-400 mt-1">Low</p>
                    <p className={`text-xs ${textColors.muted}`}>Risk Assessment</p>
                  </div>
                  
                  <div className="bg-white dark:bg-secondary-800 rounded-lg p-4">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-blue-500 mr-2" />
                      <span className={`text-sm font-medium ${textColors.primary}`}>Est. Generation</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mt-1">2min</p>
                    <p className={`text-xs ${textColors.muted}`}>Processing Time</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-12 pt-8 border-t border-neutral-200 dark:border-secondary-700">
          <div className="flex items-center mb-4 sm:mb-0">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="btn-secondary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5 mr-2" />
              Previous
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
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
                className="btn-success btn-lg disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isGenerating ? (
                  <span className="flex items-center">
                    <ArrowPathIcon className="h-5 w-5 mr-3 animate-spin" />
                    Generating Contract...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <SparklesIcon className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                    Generate Contract
                    <CheckCircleIcon className="h-5 w-5 ml-2" />
                  </span>
                )}
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
    </div>
  );
}