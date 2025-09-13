import React from 'react';

export interface HeroBadgeProps {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  mobileText?: string;
  className?: string;
}

export default function HeroBadge({ 
  icon: Icon, 
  children, 
  mobileText, 
  className = '' 
}: HeroBadgeProps) {
  return (
    <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-primary-700 bg-primary-100 dark:text-primary-300 dark:bg-primary-900/30 mb-6 sm:mb-8 ring-1 ring-primary-200 dark:ring-primary-800/50 animate-fade-in shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 ${className}`}>
      {Icon && (
        <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-2 motion-safe:animate-pulse" />
      )}
      <span className="hidden sm:inline">{children}</span>
      {mobileText && <span className="sm:hidden">{mobileText}</span>}
    </div>
  );
}