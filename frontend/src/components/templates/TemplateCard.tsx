// Reusable Template Card Component
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { textColors } from '../../utils/typography';
import { TemplateDisplayInfo } from '../../utils/templateMapping';

interface TemplateCardProps {
  template: TemplateDisplayInfo;
  isSelected?: boolean;
  onSelect?: (templateId: string) => void;
  showSelectButton?: boolean;
  className?: string;
}

export default function TemplateCard({
  template,
  isSelected = false,
  onSelect,
  showSelectButton = true,
  className = ''
}: TemplateCardProps) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(template.id);
    }
  };

  return (
    <div
      className={`group relative rounded-xl border-2 p-6 transition-all duration-200 transform hover:scale-[1.02] ${
        isSelected
          ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/30 dark:to-primary-800/20 shadow-lg shadow-primary-200/30 dark:shadow-primary-900/20 scale-[1.02]'
          : 'border-neutral-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md'
      } ${showSelectButton ? 'cursor-pointer' : ''} ${className}`}
      onClick={showSelectButton ? handleClick : undefined}
    >
      {/* Selection indicator */}
      {isSelected && showSelectButton && (
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
        {showSelectButton && (
          <div className={`text-sm font-medium transition-colors ${
            isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-600 dark:text-secondary-300'
          }`}>
            {isSelected ? 'Selected' : 'Select'}
          </div>
        )}
      </div>
      
      {/* Hover effect */}
      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
        isSelected ? 'opacity-100' : ''
      }`} />
    </div>
  );
}
