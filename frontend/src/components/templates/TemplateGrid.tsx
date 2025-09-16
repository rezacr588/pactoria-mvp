// Enhanced Template Grid Component with Improved Layout
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { TemplateDisplayInfo } from '../../utils/templateMapping';
import TemplateCard from './TemplateCard';
import { classNames } from '../../utils/classNames';

interface TemplateGridProps {
  templates: TemplateDisplayInfo[];
  selectedTemplateId?: string;
  onTemplateSelect?: (templateId: string) => void;
  isLoading?: boolean;
  error?: string | null;
  showSelectButton?: boolean;
  emptyMessage?: string;
  className?: string;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (templateId: string) => void;
}

export default function TemplateGrid({
  templates,
  selectedTemplateId,
  onTemplateSelect,
  isLoading = false,
  error = null,
  showSelectButton = true,
  emptyMessage = "No templates available",
  className = "",
  favoriteIds = new Set(),
  onToggleFavorite
}: TemplateGridProps) {
  // Enhanced loading state with skeleton cards
  if (isLoading) {
    return (
      <div className={classNames(
        'grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3', 
        className
      )}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="rounded-2xl border border-neutral-200 dark:border-secondary-700 p-6 bg-white dark:bg-secondary-900">
              {/* Header skeleton */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-neutral-200 dark:bg-secondary-700 rounded-xl"></div>
                  <div className="w-20 h-6 bg-neutral-200 dark:bg-secondary-700 rounded-full"></div>
                </div>
                <div className="w-6 h-6 bg-neutral-200 dark:bg-secondary-700 rounded-full"></div>
              </div>
              
              {/* Title and description skeleton */}
              <div className="space-y-3 mb-4">
                <div className="h-6 bg-neutral-200 dark:bg-secondary-700 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-200 dark:bg-secondary-700 rounded w-full"></div>
                <div className="h-4 bg-neutral-200 dark:bg-secondary-700 rounded w-2/3"></div>
              </div>

              {/* Compliance bar skeleton */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="h-3 bg-neutral-200 dark:bg-secondary-700 rounded w-24"></div>
                  <div className="h-3 bg-neutral-200 dark:bg-secondary-700 rounded w-8"></div>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-secondary-700 rounded-full"></div>
              </div>

              {/* Tags skeleton */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="h-6 bg-neutral-200 dark:bg-secondary-700 rounded w-16"></div>
                <div className="h-6 bg-neutral-200 dark:bg-secondary-700 rounded w-20"></div>
                <div className="h-6 bg-neutral-200 dark:bg-secondary-700 rounded w-14"></div>
              </div>

              {/* Footer skeleton */}
              <div className="border-t border-neutral-200 dark:border-secondary-700 pt-4">
                <div className="flex justify-between">
                  <div className="h-4 bg-neutral-200 dark:bg-secondary-700 rounded w-16"></div>
                  <div className="h-4 bg-neutral-200 dark:bg-secondary-700 rounded w-20"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Enhanced error state
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <ExclamationTriangleIcon className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-3">
          Failed to Load Templates
        </h3>
        <p className="text-neutral-600 dark:text-secondary-400 mb-6 max-w-md mx-auto">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Enhanced empty state
  if (templates.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-20 h-20 bg-neutral-100 dark:bg-secondary-800 rounded-full flex items-center justify-center mb-6">
          <InformationCircleIcon className="h-10 w-10 text-neutral-400 dark:text-secondary-500" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-600 dark:text-secondary-300 mb-3">
          No Templates Found
        </h3>
        <p className="text-neutral-500 dark:text-secondary-400 max-w-md mx-auto">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // Enhanced templates grid with improved spacing and layout
  return (
    <div 
      data-testid="template-grid" 
      className={classNames(
        'grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4',
        className
      )}
    >
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={selectedTemplateId === template.id}
          onSelect={onTemplateSelect}
          showSelectButton={showSelectButton}
          isFavorite={favoriteIds.has(template.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
