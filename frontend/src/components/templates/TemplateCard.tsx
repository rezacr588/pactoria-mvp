// Enhanced Template Card Component with Improved UI/UX
import { 
  CheckCircleIcon, 
  ClockIcon, 
  TagIcon,
  StarIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { textColors } from '../../utils/typography';
import { TemplateDisplayInfo } from '../../utils/templateMapping';
import { classNames } from '../../utils/classNames';

interface TemplateCardProps {
  template: TemplateDisplayInfo;
  isSelected?: boolean;
  onSelect?: (templateId: string) => void;
  showSelectButton?: boolean;
  className?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (templateId: string) => void;
}

export default function TemplateCard({
  template,
  isSelected = false,
  onSelect,
  showSelectButton = true,
  className = '',
  isFavorite = false,
  onToggleFavorite
}: TemplateCardProps) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(template.id);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(template.id);
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity.toLowerCase()) {
      case 'simple':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700';
      case 'moderate':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700';
      case 'complex':
        return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const getComplianceScore = () => {
    // Calculate compliance score based on features
    const baseScore = 85;
    const featureBonus = Math.min(15, template.compliance_features.length * 3);
    return Math.min(100, baseScore + featureBonus);
  };

  const complianceScore = getComplianceScore();

  return (
    <div
      data-testid={`template-card-${template.id}`}
      className={classNames(
        'template-card group relative overflow-hidden rounded-2xl border transition-all duration-300 transform-gpu',
        'bg-white dark:bg-secondary-900',
        isSelected
          ? 'border-primary-500 shadow-lg shadow-primary-500/10 scale-[1.02] ring-2 ring-primary-100 dark:ring-primary-900/20'
          : 'border-neutral-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-xl hover:shadow-neutral-200/20 dark:hover:shadow-secondary-900/20',
        showSelectButton ? 'cursor-pointer' : '',
        !isSelected && 'hover:scale-[1.01]',
        className
      )}
      onClick={showSelectButton ? handleClick : undefined}
    >
      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-neutral-50/30 dark:to-secondary-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Content Container */}
      <div className="relative z-10 p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon and Category Badge */}
          <div className="flex items-center space-x-3">
            <div className={classNames(
              'p-3 rounded-xl transition-all duration-300',
              isSelected 
                ? 'bg-primary-100 dark:bg-primary-800/30 shadow-sm' 
                : 'bg-neutral-100 dark:bg-secondary-800 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20'
            )}>
              <template.icon className={classNames(
                'h-6 w-6 transition-colors duration-300',
                isSelected 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-neutral-600 dark:text-secondary-400 group-hover:text-primary-600 dark:group-hover:text-primary-400'
              )} />
            </div>
            <div className="flex flex-col">
              <span className={classNames(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-300',
                getComplexityColor(template.complexity)
              )}>
                {template.complexity}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Favorite Button */}
            {onToggleFavorite && (
              <button
                onClick={handleFavoriteClick}
                className="p-2 rounded-lg transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-secondary-800"
              >
                {isFavorite ? (
                  <StarSolidIcon className="h-5 w-5 text-amber-500" />
                ) : (
                  <StarIcon className="h-5 w-5 text-neutral-400 hover:text-amber-500" />
                )}
              </button>
            )}
            
            {/* Selection Indicator */}
            {isSelected && showSelectButton && (
              <div className="bg-primary-600 text-white rounded-full p-1.5 shadow-lg">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
            )}
          </div>
        </div>

        {/* Title and Description */}
        <div className="mb-4">
          <h3 className={classNames(
            'text-lg font-semibold mb-2 transition-colors duration-300 leading-tight',
            isSelected 
              ? 'text-primary-700 dark:text-primary-300' 
              : textColors.primary
          )}>
            {template.name}
          </h3>
          <p className={classNames(
            'text-sm leading-relaxed line-clamp-2',
            textColors.secondary
          )}>
            {template.description}
          </p>
        </div>

        {/* Compliance Score Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1">
              <ShieldCheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-neutral-600 dark:text-secondary-400">
                UK Compliance
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {complianceScore}%
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-secondary-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${complianceScore}%` }}
            />
          </div>
        </div>

        {/* Features Tags */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1.5">
            {template.compliance_features.slice(0, 3).map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-neutral-100 dark:bg-secondary-800 text-neutral-700 dark:text-secondary-300 rounded-md border border-neutral-200 dark:border-secondary-700"
              >
                <TagIcon className="h-3 w-3 mr-1" />
                {feature.length > 15 ? `${feature.substring(0, 15)}...` : feature}
              </span>
            ))}
            {template.compliance_features.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-md border border-primary-200 dark:border-primary-700">
                +{template.compliance_features.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-secondary-700">
          {/* Time Estimate */}
          <div className="flex items-center text-sm text-neutral-500 dark:text-secondary-400">
            <ClockIcon className="h-4 w-4 mr-1.5" />
            <span>{template.estimatedTime}</span>
          </div>

          {/* Fields Count */}
          <div className="flex items-center text-sm text-neutral-500 dark:text-secondary-400">
            <DocumentTextIcon className="h-4 w-4 mr-1.5" />
            <span>{template.fields.length} fields</span>
          </div>

          {/* Select Status */}
          {showSelectButton && (
            <div className={classNames(
              'text-sm font-medium transition-colors duration-300',
              isSelected 
                ? 'text-primary-600 dark:text-primary-400 flex items-center space-x-1' 
                : 'text-neutral-600 dark:text-secondary-300 opacity-0 group-hover:opacity-100'
            )}>
              {isSelected ? (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  <span>Selected</span>
                </>
              ) : (
                <span>Select Template</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Selection Glow Effect */}
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-primary-500/10 rounded-2xl pointer-events-none" />
      )}

      {/* Hover Highlight */}
      {!isSelected && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/3 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
      )}
    </div>
  );
}
