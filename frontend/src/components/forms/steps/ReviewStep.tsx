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
  onGenerate: _onGenerate, // Marked as unused for now
  isGenerating: _isGenerating, // Marked as unused for now
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column - Contract Details */}
        <div className="space-y-6">
          <div className="card-elevated">
            <h3 className={`text-xl font-semibold ${textColors.primary} mb-6`}>Contract Overview</h3>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg p-4 border border-primary-200 dark:border-primary-800">
                <div className="flex items-center mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-primary-600 dark:text-primary-400 mr-2" />
                  <span className="font-medium text-primary-800 dark:text-primary-200">Template Selected</span>
                </div>
                <p className="text-primary-700 dark:text-primary-300 font-semibold">{selectedTemplateName}</p>
                <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">UK-compliant legal template</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-secondary-300 mb-3">Basic Information</h4>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-secondary-400">Contract Name</dt>
                    <dd className="text-sm text-gray-900 dark:text-secondary-100 font-medium max-w-xs text-right">{formData.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-secondary-400">Contract Value</dt>
                    <dd className="text-sm text-gray-900 dark:text-secondary-100 font-medium">
                      {formData.contractValue ? `£${Number(formData.contractValue).toLocaleString()}` : 'Not specified'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-secondary-400">Duration</dt>
                    <dd className="text-sm text-gray-900 dark:text-secondary-100 font-medium">
                      {formData.startDate && formData.endDate 
                        ? `${new Date(formData.startDate).toLocaleDateString()} - ${new Date(formData.endDate).toLocaleDateString()}`
                        : formData.startDate 
                          ? `From ${new Date(formData.startDate).toLocaleDateString()}`
                          : 'Not specified'
                      }
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-secondary-400">Payment Terms</dt>
                    <dd className="text-sm text-gray-900 dark:text-secondary-100 font-medium">{formData.paymentTerms} days</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-secondary-300 mb-3">Parties</h4>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-secondary-400">Client</dt>
                    <dd className="text-sm text-gray-900 dark:text-secondary-100 font-medium max-w-xs text-right">{formData.clientName}</dd>
                  </div>
                  {formData.clientEmail && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-secondary-400">Client Email</dt>
                      <dd className="text-sm text-gray-900 dark:text-secondary-100 font-medium max-w-xs text-right">{formData.clientEmail}</dd>
                    </div>
                  )}
                  {formData.supplierName && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-secondary-400">Supplier</dt>
                      <dd className="text-sm text-gray-900 dark:text-secondary-100 font-medium max-w-xs text-right">{formData.supplierName}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>

          {/* Plain English Requirements */}
          <div className="card">
            <h4 className="text-lg font-medium text-gray-900 dark:text-secondary-100 mb-4">Your Requirements</h4>
            <div className="bg-gray-50 dark:bg-secondary-800 rounded-lg p-4 border">
              <p className="text-sm text-gray-700 dark:text-secondary-300 leading-relaxed">
                {formData.plainEnglishInput || 'No specific requirements provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - AI Analysis */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 dark:text-secondary-100 mb-6">AI Analysis Preview</h3>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">AI Ready for Generation</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your contract will be analyzed for UK legal compliance and risk factors.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="bg-white dark:bg-secondary-800 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center mb-2">
                    <CheckCircleIcon className="h-5 w-5 text-success-500 dark:text-success-400 mr-2" />
                    <span className={`text-sm font-medium ${textColors.primary}`}>Compliance Score</span>
                  </div>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-bold text-success-600 dark:text-success-400">95%</p>
                    <span className="ml-2 text-xs text-success-600 dark:text-success-400">Expected</span>
                  </div>
                  <p className={`text-xs ${textColors.muted} mt-1`}>UK Legal Compliance</p>
                </div>

                <div className="bg-white dark:bg-secondary-800 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-warning-500 dark:text-warning-400 mr-2" />
                    <span className={`text-sm font-medium ${textColors.primary}`}>Risk Level</span>
                  </div>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">Low</p>
                  </div>
                  <p className={`text-xs ${textColors.muted} mt-1`}>Risk Assessment</p>
                </div>

                <div className="bg-white dark:bg-secondary-800 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center mb-2">
                    <ClockIcon className="h-5 w-5 text-blue-500 mr-2" />
                    <span className={`text-sm font-medium ${textColors.primary}`}>Generation Time</span>
                  </div>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-bold text-blue-600">~2min</p>
                  </div>
                  <p className={`text-xs ${textColors.muted} mt-1`}>Estimated Duration</p>
                </div>

                <div className="bg-white dark:bg-secondary-800 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center mb-2">
                    <svg className="h-5 w-5 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                    <span className={`text-sm font-medium ${textColors.primary}`}>AI Model</span>
                  </div>
                  <div className="flex items-baseline">
                    <p className="text-sm font-bold text-purple-600">Groq Llama</p>
                  </div>
                  <p className={`text-xs ${textColors.muted} mt-1`}>Ultra-fast AI</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  ✨ <strong>AI Enhancement:</strong> Your contract will include GDPR compliance clauses, 
                  IP protection terms, and UK-specific legal requirements automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
