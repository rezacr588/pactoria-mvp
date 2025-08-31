import { ReactNode } from 'react';
import { classNames } from '../../utils/classNames';
import Button from './Button';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export default function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className
}: PageHeaderProps) {
  return (
    <div className={classNames('bg-white dark:bg-secondary-900 border-b border-neutral-200 dark:border-secondary-700', className)}>
      <div className="px-4 sm:px-6 lg:px-8">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="py-3" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((item, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <svg
                      className="flex-shrink-0 h-4 w-4 text-neutral-400 dark:text-secondary-500 mx-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-neutral-500 dark:text-secondary-400 hover:text-neutral-700 dark:hover:text-secondary-200 transition-colors"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className="text-neutral-900 dark:text-secondary-100 font-medium">
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="py-6 md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-neutral-900 dark:text-secondary-100 sm:text-3xl sm:truncate">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-sm text-neutral-500 dark:text-secondary-400">
                {description}
              </p>
            )}
          </div>
          
          {actions && (
            <div className="mt-4 flex md:mt-0 md:ml-4">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  actions,
  className
}: SectionHeaderProps) {
  return (
    <div className={classNames('flex items-center justify-between', className)}>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-secondary-100">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-secondary-400">
            {description}
          </p>
        )}
      </div>
      
      {actions && (
        <div className="flex items-center space-x-3">
          {actions}
        </div>
      )}
    </div>
  );
}