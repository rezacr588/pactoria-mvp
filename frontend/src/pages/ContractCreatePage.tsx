import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContractStore } from '../store/contractStore';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  UsersIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { textColors } from '../utils/typography';

const UK_CONTRACT_TEMPLATES = [
  {
    id: '1',
    name: 'Professional Services Agreement',
    description: 'For consultancy, marketing, and professional services',
    category: 'service-agreement',
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
  });
  const [isGenerating, setIsGenerating] = useState(false);
  
  const navigate = useNavigate();
  const { createContract } = useContractStore();

  const selectedTemplate = UK_CONTRACT_TEMPLATES.find(t => t.id === formData.templateId);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setFormData(prev => ({ ...prev, templateId }));
    handleNext();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate AI contract generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const newContract = await createContract({
        name: formData.name || `${selectedTemplate?.name} - ${formData.clientName}`,
        type: {
          id: formData.templateId,
          name: selectedTemplate?.name || 'Unknown',
          category: (selectedTemplate?.category as string) || 'other',
          description: selectedTemplate?.description || '',
          template: formData.templateId
        },
        status: 'draft',
        parties: [
          {
            id: '1',
            name: formData.clientName,
            email: formData.clientEmail,
            role: 'client',
            signatureStatus: 'pending'
          }
        ],
        createdBy: '1',
        content: `# ${formData.name}\n\n## Contract Details\n${formData.description}\n\n## Services\n${formData.serviceDescription}\n\n## Terms\n- Value: £${formData.contractValue}\n- Start Date: ${formData.startDate}\n- End Date: ${formData.endDate}\n- Payment Terms: ${formData.paymentTerms} days\n\n${formData.specialTerms}`,
        complianceScore: {
          overall: Math.floor(Math.random() * 20) + 80, // 80-100
          gdprCompliance: Math.floor(Math.random() * 10) + 90,
          employmentLaw: Math.floor(Math.random() * 15) + 85,
          commercialTerms: Math.floor(Math.random() * 10) + 90,
          consumerRights: Math.floor(Math.random() * 15) + 85,
          issues: []
        },
        riskAssessment: {
          overall: Math.floor(Math.random() * 40) + 10, // 10-50
          factors: [
            {
              name: 'Payment Risk',
              score: Math.floor(Math.random() * 30) + 10,
              impact: 'medium',
              likelihood: 'low',
              description: 'Standard payment terms with established processes'
            }
          ],
          recommendations: [
            'Consider milestone-based payments for larger projects',
            'Include clear scope definition to prevent disputes'
          ],
          lastUpdated: new Date()
        },
        deadlines: [
          {
            id: '1',
            title: 'Contract Start',
            date: new Date(formData.startDate),
            type: 'review',
            status: 'upcoming'
          }
        ],
        tags: [selectedTemplate?.category || 'general']
      });

      navigate(`/contracts/${newContract.id}`);
    } catch (error) {
      console.error('Failed to create contract:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.templateId !== '';
      case 2:
        return formData.name && formData.clientName && formData.serviceDescription;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${textColors.primary}`}>Create New Contract</h1>
        <p className={`mt-2 ${textColors.secondary}`}>
          Generate UK-compliant contracts with AI assistance in 3 simple steps
        </p>
      </div>

      {/* Progress Steps */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center justify-center">
          {steps.map((step, stepIdx) => (
            <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
              {stepIdx !== steps.length - 1 && (
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className={`h-0.5 w-full ${currentStep > step.id ? 'bg-primary-600' : 'bg-neutral-200 dark:bg-secondary-700'}`} />
                </div>
              )}
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white dark:bg-secondary-800 border-neutral-300 dark:border-secondary-600">
                {currentStep > step.id ? (
                  <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                ) : (
                  <span className={`h-2.5 w-2.5 rounded-full ${currentStep === step.id ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-secondary-600'}`} />
                )}
              </div>
              <div className="mt-3 text-center">
                <div className={`text-sm font-medium ${currentStep >= step.id ? 'text-primary-600 dark:text-primary-400' : textColors.muted}`}>
                  {step.name}
                </div>
                <div className={`text-xs ${textColors.muted}`}>{step.description}</div>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto">
        {currentStep === 1 && (
          <div className="card">
            <h3 className={`text-lg font-medium ${textColors.primary} mb-6`}>Choose Your Contract Template</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {UK_CONTRACT_TEMPLATES.map((template) => {
                const isSelected = formData.templateId === template.id;
                return (
                  <div
                    key={template.id}
                    className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600'
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <template.icon className={`h-8 w-8 ${isSelected ? 'text-primary-600 dark:text-primary-400' : textColors.subtle}`} />
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        template.complexity === 'Simple' ? 'bg-success-100 dark:bg-success-900/20 text-success-800 dark:text-success-300' :
                        template.complexity === 'Complex' ? 'bg-danger-100 dark:bg-danger-900/20 text-danger-800 dark:text-danger-300' :
                        'bg-warning-100 dark:bg-warning-900/20 text-warning-800 dark:text-warning-300'
                      }`}>
                        {template.complexity}
                      </span>
                    </div>
                    <h4 className={`text-base font-medium ${textColors.primary} mb-2`}>{template.name}</h4>
                    <p className="text-sm text-gray-500 mb-4">{template.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {template.estimatedTime}
                      </div>
                      <div>{template.fields.length} fields</div>
                    </div>
                    
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircleIcon className="h-6 w-6 text-primary-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Contract Details</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="e.g., Marketing Services - Acme Corp"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contractValue" className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Value (£)
                  </label>
                  <input
                    type="number"
                    name="contractValue"
                    id="contractValue"
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="50000"
                    value={formData.contractValue}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Brief description of the contract purpose and scope"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-base font-medium text-gray-900 mb-4">Client/Party Information</h4>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
                      Client/Company Name *
                    </label>
                    <input
                      type="text"
                      name="clientName"
                      id="clientName"
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="Acme Corporation Ltd"
                      value={formData.clientName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Client Email
                    </label>
                    <input
                      type="email"
                      name="clientEmail"
                      id="clientEmail"
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="contact@acme.com"
                      value={formData.clientEmail}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-base font-medium text-gray-900 mb-4">Contract Terms</h4>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="serviceDescription" className="block text-sm font-medium text-gray-700 mb-1">
                      Service/Work Description *
                    </label>
                    <textarea
                      name="serviceDescription"
                      id="serviceDescription"
                      rows={4}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="Detailed description of the services or work to be performed"
                      value={formData.serviceDescription}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        id="startDate"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        value={formData.startDate}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        id="endDate"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        value={formData.endDate}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Terms (days)
                      </label>
                      <select
                        name="paymentTerms"
                        id="paymentTerms"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        value={formData.paymentTerms}
                        onChange={handleInputChange}
                      >
                        <option value="15">15 days</option>
                        <option value="30">30 days</option>
                        <option value="45">45 days</option>
                        <option value="60">60 days</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="specialTerms" className="block text-sm font-medium text-gray-700 mb-1">
                      Special Terms & Conditions
                    </label>
                    <textarea
                      name="specialTerms"
                      id="specialTerms"
                      rows={3}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="Any additional terms, conditions, or requirements"
                      value={formData.specialTerms}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Review Summary */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Review Contract Details</h3>
              
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
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-2" />
            Previous
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canProceed() || isGenerating}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Contract...
                </>
              ) : (
                <>
                  Generate Contract
                  <CheckCircleIcon className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}