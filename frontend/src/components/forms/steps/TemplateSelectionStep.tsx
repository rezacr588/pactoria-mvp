import { SparklesIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import TemplateGrid from '../../templates/TemplateGrid';
import { TemplateDisplayInfo } from '../../../utils/templateMapping';
import { textColors } from '../../../utils/typography';

interface TemplateSelectionStepProps {
  templates: TemplateDisplayInfo[];
  selectedTemplateId: string;
  onTemplateSelect: (templateId: string) => void;
  isLoading: boolean;
  error: string | null;
  validationError?: string;
}

export function TemplateSelectionStep({
  templates,
  selectedTemplateId,
  onTemplateSelect,
  isLoading,
  error,
  validationError,
}: TemplateSelectionStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="relative inline-block">
          <SparklesIcon className="h-12 w-12 text-primary-500 mx-auto mb-4 animate-pulse" />
          <div className="absolute -top-1 -right-1 h-4 w-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-ping"></div>
        </div>
        <h2 className={`text-2xl font-bold ${textColors.primary} mb-2`}>
          Choose Your Contract Template
        </h2>
        <p className={`text-base ${textColors.secondary} max-w-2xl mx-auto`}>
          Select from our library of UK-compliant legal templates, designed by legal experts and optimized for your business needs.
        </p>
        {validationError && (
          <div className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
            <div className="flex items-center justify-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-danger-600 dark:text-danger-400 mr-2" />
              <span className="text-danger-600 dark:text-danger-400 text-sm font-medium">
                {validationError}
              </span>
            </div>
          </div>
        )}
      </div>

      <TemplateGrid
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onTemplateSelect={onTemplateSelect}
        isLoading={isLoading}
        error={error}
      />

      {/* Enhanced Help Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <InformationCircleIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Not sure which template to choose?</h3>
            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
              <p>Each template is specifically designed for different business scenarios:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Service Agreements:</strong> Perfect for consulting, design, or professional services</li>
                <li><strong>Employment Contracts:</strong> Compliant with UK employment law for hiring staff</li>
                <li><strong>Supplier Agreements:</strong> For purchasing goods or services from vendors</li>
                <li><strong>NDAs:</strong> Protect confidential information in business discussions</li>
              </ul>
              <p className="mt-3 text-xs bg-blue-100 dark:bg-blue-900/40 p-2 rounded border border-blue-200 dark:border-blue-700">
                💡 <strong>Tip:</strong> The complexity rating indicates legal considerations involved. You can always modify the generated contract later.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
