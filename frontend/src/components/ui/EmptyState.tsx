import { ReactNode } from 'react';
import { classNames } from '../../utils/classNames';
import Button from './Button';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
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
    <div className={classNames('text-center py-12', className)}>
      {Icon && (
        <Icon className="mx-auto h-12 w-12 text-neutral-400 dark:text-secondary-500 mb-4" />
      )}
      
      <h3 className="text-lg font-medium text-neutral-900 dark:text-secondary-100 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-neutral-500 dark:text-secondary-400 max-w-sm mx-auto mb-6">
          {description}
        </p>
      )}
      
      {children && (
        <div className="mb-6">
          {children}
        </div>
      )}
      
      <div className="flex items-center justify-center space-x-3">
        {action && (
          <Button
            onClick={action.onClick}
            icon={action.icon && <action.icon className="h-4 w-4" />}
          >
            {action.label}
          </Button>
        )}
        
        {secondaryAction && (
          <Button
            variant="outline"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}