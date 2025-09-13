import { SparklesIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
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
        <SparklesIcon className="h-12 w-12 text-primary-500 mx-auto mb-4" />
        <h2 className={`text-2xl font-bold ${textColors.primary} mb-2`}>
          Choose Your Contract Template
        </h2>
        <p className={`text-base ${textColors.secondary} max-w-2xl mx-auto`}>
          Select from our library of UK-compliant legal templates, designed by legal experts and optimized for your business needs.
        </p>
        {validationError && (
          <div className="mt-3 text-danger-600 dark:text-danger-400 text-sm font-medium">
            {validationError}
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
  );
}
