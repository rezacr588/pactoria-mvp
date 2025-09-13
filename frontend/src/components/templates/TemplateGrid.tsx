// Reusable Template Grid Component
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { TemplateDisplayInfo } from '../../utils/templateMapping';
import TemplateCard from './TemplateCard';

interface TemplateGridProps {
  templates: TemplateDisplayInfo[];
  selectedTemplateId?: string;
  onTemplateSelect?: (templateId: string) => void;
  isLoading?: boolean;
  error?: string | null;
  showSelectButton?: boolean;
  emptyMessage?: string;
  className?: string;
}

export default function TemplateGrid({
  templates,
  selectedTemplateId,
  onTemplateSelect,
  isLoading = false,
  error = null,
  showSelectButton = true,
  emptyMessage = "No templates available",
  className = ""
}: TemplateGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="rounded-xl border-2 border-neutral-200 dark:border-secondary-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-neutral-200 dark:bg-secondary-700 rounded-lg"></div>
                <div className="w-16 h-6 bg-neutral-200 dark:bg-secondary-700 rounded-full"></div>
              </div>
              <div className="space-y-3">
                <div className="h-6 bg-neutral-200 dark:bg-secondary-700 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-200 dark:bg-secondary-700 rounded w-full"></div>
                <div className="h-4 bg-neutral-200 dark:bg-secondary-700 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-danger-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-danger-600 dark:text-danger-400 mb-2">
          Failed to Load Templates
        </h3>
        <p className="text-neutral-600 dark:text-secondary-400 mb-4">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // Empty state
  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <InformationCircleIcon className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-neutral-600 dark:text-secondary-300 mb-2">
          No Templates Found
        </h3>
        <p className="text-neutral-500 dark:text-secondary-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // Templates grid
  return (
    <div data-testid="template-grid" className={`grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={selectedTemplateId === template.id}
          onSelect={onTemplateSelect}
          showSelectButton={showSelectButton}
        />
      ))}
    </div>
  );
}
