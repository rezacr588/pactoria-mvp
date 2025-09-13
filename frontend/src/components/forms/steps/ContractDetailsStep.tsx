import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { ContractFormField } from '../ContractFormField';
import { ContractFormData, FormErrors } from '../../../types/contract-form';
import { textColors } from '../../../utils/typography';

interface ContractDetailsStepProps {
  formData: ContractFormData;
  errors: FormErrors;
  showTooltip: string | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onTooltipClick: (key: string) => void;
  selectedTemplateName?: string;
}

export function ContractDetailsStep({
  formData,
  errors,
  showTooltip,
  onInputChange,
  onTooltipClick,
  selectedTemplateName,
}: ContractDetailsStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <DocumentTextIcon className="h-12 w-12 text-primary-500 mx-auto mb-4" />
        <h2 className={`text-2xl font-bold ${textColors.primary} mb-2`}>
          Contract Details
        </h2>
        <p className={`text-base ${textColors.secondary} max-w-2xl mx-auto`}>
          Provide the essential details for your {selectedTemplateName?.toLowerCase()}. All fields marked with * are required.
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
              <ContractFormField
                label="Contract Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={onInputChange}
                error={errors.name}
                required
                placeholder="e.g., Marketing Services - Acme Corp"
                tooltip="Choose a descriptive name that helps you identify this contract easily. Include the client name and service type for clarity."
                showTooltip={showTooltip}
                onTooltipClick={onTooltipClick}
                data-testid="contract-name-input"
              />

              <div>
                <label htmlFor="contractValue" className="form-label">
                  Contract Value (£)
                  <button
                    type="button"
                    className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-secondary-300"
                    onClick={() => onTooltipClick('contractValue')}
                  >
                    <svg className="h-4 w-4 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </button>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 dark:text-secondary-400">£</span>
                  <input
                    type="number"
                    name="contractValue"
                    id="contractValue"
                    data-testid="contract-value-input"
                    className={`form-input-lg pl-8 ${errors.contractValue ? 'border-danger-300 focus:ring-danger-500 focus:border-danger-500' : ''}`}
                    placeholder="50,000"
                    value={formData.contractValue}
                    onChange={onInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                {errors.contractValue && <div className="form-error">{errors.contractValue}</div>}
                {showTooltip === 'contractValue' && (
                  <div className="form-help">
                    Enter the total contract value in British Pounds. This is optional but helps with contract management and reporting.
                  </div>
                )}
              </div>
            </div>
          </div>

          <ContractFormField
            label="Contract Description"
            name="description"
            type="textarea"
            value={formData.description}
            onChange={onInputChange}
            placeholder="Brief description of the contract purpose and scope (optional)"
            helpText="Provide a high-level overview of what this contract covers. This will help with organization and searching later."
          />

          {/* Client/Party Information */}
          <div>
            <h3 className={`text-lg font-semibold ${textColors.primary} mb-4 pb-2 border-b border-neutral-200 dark:border-secondary-700`}>
              Client/Party Information
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <ContractFormField
                label="Client/Company Name"
                name="clientName"
                type="text"
                value={formData.clientName}
                onChange={onInputChange}
                error={errors.clientName}
                required
                placeholder="Acme Corporation Ltd"
                tooltip="Enter the full legal name of the client or company you're contracting with."
                showTooltip={showTooltip}
                onTooltipClick={onTooltipClick}
                data-testid="client-name-input"
              />

              <ContractFormField
                label="Client Email"
                name="clientEmail"
                type="email"
                value={formData.clientEmail}
                onChange={onInputChange}
                error={errors.clientEmail}
                placeholder="contact@acme.com"
                tooltip="Primary contact email for contract communications and notifications."
                showTooltip={showTooltip}
                onTooltipClick={onTooltipClick}
                data-testid="client-email-input"
              />
            </div>
          </div>

          {/* Contract Terms */}
          <div>
            <h3 className={`text-lg font-semibold ${textColors.primary} mb-4 pb-2 border-b border-neutral-200 dark:border-secondary-700`}>
              Contract Terms
            </h3>
            <div className="space-y-6">
              <ContractFormField
                label="Service/Work Description"
                name="serviceDescription"
                type="textarea"
                value={formData.serviceDescription}
                onChange={onInputChange}
                error={errors.serviceDescription}
                required
                placeholder="Detailed description of the services or work to be performed"
                tooltip="Provide a clear and detailed description of the work to be performed. This will form the core of your contract terms."
                showTooltip={showTooltip}
                onTooltipClick={onTooltipClick}
                data-testid="service-description-input"
              />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <ContractFormField
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={onInputChange}
                  tooltip="When will the contract work begin? Leave blank if not applicable."
                  showTooltip={showTooltip}
                  onTooltipClick={onTooltipClick}
                  data-testid="start-date-input"
                />

                <ContractFormField
                  label="End Date"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={onInputChange}
                  error={errors.endDate}
                  tooltip="When will the contract work be completed? Must be after start date if both are specified."
                  showTooltip={showTooltip}
                  onTooltipClick={onTooltipClick}
                  data-testid="end-date-input"
                />

                <ContractFormField
                  label="Payment Terms (days)"
                  name="paymentTerms"
                  type="select"
                  value={formData.paymentTerms}
                  onChange={onInputChange}
                  tooltip="How many days after invoicing should payment be made? 30 days is standard for UK business contracts."
                  showTooltip={showTooltip}
                  onTooltipClick={onTooltipClick}
                >
                  <option value="15">15 days</option>
                  <option value="30">30 days</option>
                  <option value="45">45 days</option>
                  <option value="60">60 days</option>
                </ContractFormField>
              </div>

              <ContractFormField
                label="Special Terms & Conditions"
                name="specialTerms"
                type="textarea"
                value={formData.specialTerms}
                onChange={onInputChange}
                placeholder="Any additional terms, conditions, or requirements"
                tooltip="Include any specific requirements, milestones, or conditions unique to this contract."
                showTooltip={showTooltip}
                onTooltipClick={onTooltipClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
