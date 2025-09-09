import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { classNames } from '../../utils/classNames';
import { textStyles, textColors } from '../../utils/typography';
import Button from './Button';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ComponentType<{ className?: string }>;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className
}: EmptyStateProps) {
  return (
    <div className={classNames('text-center py-12 px-4', className)}>
      {Icon && (
        <div className="mx-auto w-16 h-16 bg-neutral-100 dark:bg-secondary-800 rounded-full flex items-center justify-center mb-6">
          <Icon className={`h-8 w-8 ${textColors.subtle}`} />
        </div>
      )}
      
      <h3 className={`${textStyles.emptyStateTitle} mb-3`}>
        {title}
      </h3>
      
      {description && (
        <p className={`${textStyles.emptyStateDescription} max-w-md mx-auto mb-8 leading-relaxed`}>
          {description}
        </p>
      )}
      
      {children && (
        <div className="mb-8">
          {children}
        </div>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex items-center justify-center space-x-3 flex-wrap gap-3">
          {action && (
            action.href ? (
              <Link to={action.href}>
                <Button
                  icon={action.icon && <action.icon className="h-4 w-4" />}
                  size="md"
                >
                  {action.label}
                </Button>
              </Link>
            ) : (
              <Button
                onClick={action.onClick}
                icon={action.icon && <action.icon className="h-4 w-4" />}
                size="md"
              >
                {action.label}
              </Button>
            )
          )}
          
          {secondaryAction && (
            <Button
              variant="secondary"
              onClick={secondaryAction.onClick}
              size="md"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}