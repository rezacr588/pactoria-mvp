import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ContractFormData } from '../../../types/contract-form';
import { textColors } from '../../../utils/typography';

interface ReviewStepProps {
  formData: ContractFormData;
  selectedTemplateName?: string;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
}

export function ReviewStep({
  formData,
  selectedTemplateName,
  onGenerate,
  isGenerating,
}: ReviewStepProps) {
  return (
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
                <dd className="text-sm text-gray-900">{selectedTemplateName}</dd>
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
  );
}
