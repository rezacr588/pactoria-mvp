import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Contract } from '../../types';
import { ContractFormData, FormErrors } from '../../types/contract-form';
import { ContractFormField } from './ContractFormField';
import { textColors } from '../../utils/typography';
import {
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  CurrencyPoundIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

interface ContractEditFormProps {
  contract: Contract;
  onUpdate: (data: Partial<Contract>) => Promise<void>;
  isUpdating: boolean;
  errors?: FormErrors;
}

export function ContractEditForm({ 
  contract, 
  onUpdate, 
  isUpdating, 
  errors: externalErrors = {} 
}: ContractEditFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ContractFormData>({
    templateId: contract.template_id || '',
    name: contract.title || '',
    description: '',
    clientName: contract.client_name || '',
    clientEmail: contract.client_email || '',
    serviceDescription: contract.plain_english_input || '',
    contractValue: contract.contract_value?.toString() || '',
    startDate: contract.start_date ? contract.start_date.split('T')[0] : '',
    endDate: contract.end_date ? contract.end_date.split('T')[0] : '',
    paymentTerms: '30',
    specialTerms: '',
    plainEnglishInput: contract.plain_english_input || '',
    supplierName: contract.supplier_name || '',
    currency: contract.currency || 'GBP',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Combine external and internal errors
  const allErrors = { ...errors, ...externalErrors };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
    
    // Clear error for this field if it exists
    if (allErrors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTooltip = (key: string | null) => {
    setShowTooltip(showTooltip === key ? null : key);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Contract name is required';
    }

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (formData.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      newErrors.clientEmail = 'Please enter a valid email address';
    }

    if (!formData.plainEnglishInput.trim()) {
      newErrors.plainEnglishInput = 'Plain English description is required';
    }

    if (!formData.serviceDescription.trim()) {
      newErrors.serviceDescription = 'Service description is required';
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const updateData: Partial<Contract> = {
      title: formData.name,
      client_name: formData.clientName,
      client_email: formData.clientEmail || undefined,
      supplier_name: formData.supplierName || undefined,
      contract_value: formData.contractValue ? parseFloat(formData.contractValue) : undefined,
      currency: formData.currency,
      start_date: formData.startDate || undefined,
      end_date: formData.endDate || undefined,
      plain_english_input: formData.plainEnglishInput,
    };

    await onUpdate(updateData);
    setHasUnsavedChanges(false);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        navigate(`/contracts/${contract.id}`);
      }
    } else {
      navigate(`/contracts/${contract.id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information Section */}
      <div className="card-elevated">
        <div className="flex items-center mb-6">
          <DocumentTextIcon className="h-6 w-6 text-primary-500 mr-3" />
          <h3 className={`text-xl font-semibold ${textColors.primary}`}>
            Basic Information
          </h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContractFormField
            label="Contract Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            error={allErrors.name}
            required
            placeholder="e.g., Marketing Services - Acme Corp"
            tooltip="Choose a descriptive name that helps you identify this contract easily"
            showTooltip={showTooltip}
            onTooltipClick={handleTooltip}
            data-testid="contract-name-input"
          />

          <div>
            <label htmlFor="contractValue" className="form-label">
              Contract Value (£)
              <button
                type="button"
                className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-secondary-300"
                onClick={() => handleTooltip('contractValue')}
              >
                <svg className="h-4 w-4 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
            </label>
            <div className="relative">
              <CurrencyPoundIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500 dark:text-secondary-400" />
              <input
                type="number"
                name="contractValue"
                id="contractValue"
                className={`form-input-lg pl-10 ${allErrors.contractValue ? 'border-danger-300 focus:ring-danger-500 focus:border-danger-500' : ''}`}
                placeholder="50,000"
                value={formData.contractValue}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
            </div>
            {allErrors.contractValue && <div className="form-error">{allErrors.contractValue}</div>}
            {showTooltip === 'contractValue' && (
              <div className="form-help">
                Enter the total contract value in British Pounds. This helps with contract management and reporting.
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <ContractFormField
              label="Contract Description"
              name="description"
              type="textarea"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Brief description of the contract purpose and scope (optional)"
              helpText="Provide a high-level overview of what this contract covers"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Parties Section */}
      <div className="card-elevated">
        <div className="flex items-center mb-6">
          <UserGroupIcon className="h-6 w-6 text-primary-500 mr-3" />
          <h3 className={`text-xl font-semibold ${textColors.primary}`}>
            Parties Information
          </h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContractFormField
            label="Client/Company Name"
            name="clientName"
            type="text"
            value={formData.clientName}
            onChange={handleInputChange}
            error={allErrors.clientName}
            required
            placeholder="Acme Corporation Ltd"
            tooltip="Enter the full legal name of the client or company"
            showTooltip={showTooltip}
            onTooltipClick={handleTooltip}
            data-testid="client-name-input"
          />

          <ContractFormField
            label="Client Email"
            name="clientEmail"
            type="email"
            value={formData.clientEmail}
            onChange={handleInputChange}
            error={allErrors.clientEmail}
            placeholder="contact@acme.com"
            tooltip="Primary contact email for contract communications"
            showTooltip={showTooltip}
            onTooltipClick={handleTooltip}
            data-testid="client-email-input"
          />

          <ContractFormField
            label="Your Company/Supplier Name"
            name="supplierName"
            type="text"
            value={formData.supplierName}
            onChange={handleInputChange}
            error={allErrors.supplierName}
            placeholder="Your Company Ltd"
            tooltip="Enter your company name as it should appear in the contract"
            showTooltip={showTooltip}
            onTooltipClick={handleTooltip}
            data-testid="supplier-name-input"
          />

          <ContractFormField
            label="Currency"
            name="currency"
            type="select"
            value={formData.currency}
            onChange={handleInputChange}
            tooltip="Contract currency (GBP is default for UK compliance)"
            showTooltip={showTooltip}
            onTooltipClick={handleTooltip}
          >
            <option value="GBP">GBP (£)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </ContractFormField>
        </div>
      </div>

      {/* Contract Terms Section */}
      <div className="card-elevated">
        <div className="flex items-center mb-6">
          <ClipboardDocumentListIcon className="h-6 w-6 text-primary-500 mr-3" />
          <h3 className={`text-xl font-semibold ${textColors.primary}`}>
            Contract Terms & Details
          </h3>
        </div>
        
        <div className="space-y-6">
          <ContractFormField
            label="Plain English Description"
            name="plainEnglishInput"
            type="textarea"
            value={formData.plainEnglishInput}
            onChange={handleInputChange}
            error={allErrors.plainEnglishInput}
            required
            placeholder="Describe what you need in plain English, e.g., 'I need a contract for website design services for my restaurant. The work includes creating a new website with online ordering system. Payment will be monthly over 6 months.'"
            tooltip="Describe your contract needs in simple, everyday language. Our AI uses this to generate professional legal terms."
            showTooltip={showTooltip}
            onTooltipClick={handleTooltip}
            data-testid="plain-english-input"
            rows={4}
          />

          <ContractFormField
            label="Service/Work Description"
            name="serviceDescription"
            type="textarea"
            value={formData.serviceDescription}
            onChange={handleInputChange}
            error={allErrors.serviceDescription}
            required
            placeholder="Detailed description of the services or work to be performed"
            tooltip="Provide a clear and detailed description of the work to be performed"
            showTooltip={showTooltip}
            onTooltipClick={handleTooltip}
            data-testid="service-description-input"
            rows={4}
          />

          <ContractFormField
            label="Special Terms & Conditions"
            name="specialTerms"
            type="textarea"
            value={formData.specialTerms}
            onChange={handleInputChange}
            placeholder="Any additional terms, conditions, or requirements"
            tooltip="Include any specific requirements, milestones, or conditions unique to this contract"
            showTooltip={showTooltip}
            onTooltipClick={handleTooltip}
            rows={3}
          />
        </div>
      </div>

      {/* Dates & Payment Section */}
      <div className="card-elevated">
        <div className="flex items-center mb-6">
          <CalendarIcon className="h-6 w-6 text-primary-500 mr-3" />
          <h3 className={`text-xl font-semibold ${textColors.primary}`}>
            Dates & Payment Terms
          </h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ContractFormField
            label="Start Date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleInputChange}
            tooltip="When will the contract work begin? Leave blank if not applicable"
            showTooltip={showTooltip}
            onTooltipClick={handleTooltip}
            data-testid="start-date-input"
          />

          <ContractFormField
            label="End Date"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleInputChange}
            error={allErrors.endDate}
            tooltip="When will the contract work be completed? Must be after start date if both are specified"
            showTooltip={showTooltip}
            onTooltipClick={handleTooltip}
            data-testid="end-date-input"
          />

          <ContractFormField
            label="Payment Terms (days)"
            name="paymentTerms"
            type="select"
            value={formData.paymentTerms}
            onChange={handleInputChange}
            tooltip="How many days after invoicing should payment be made? 30 days is standard for UK business contracts"
            showTooltip={showTooltip}
            onTooltipClick={handleTooltip}
          >
            <option value="15">15 days</option>
            <option value="30">30 days</option>
            <option value="45">45 days</option>
            <option value="60">60 days</option>
          </ContractFormField>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-neutral-200 dark:border-secondary-700">
        <div className="flex items-center mb-4 sm:mb-0">
          {hasUnsavedChanges && (
            <div className="text-sm text-amber-600 dark:text-amber-400 mr-4">
              You have unsaved changes
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary btn-lg"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isUpdating}
            className="btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
          >
            <div className="relative flex items-center">
              {isUpdating ? (
                <span className="flex items-center">
                  <ArrowPathIcon className="h-5 w-5 mr-3 animate-spin" />
                  Updating Contract...
                </span>
              ) : (
                <span className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                  Update Contract
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
    </form>
  );
}