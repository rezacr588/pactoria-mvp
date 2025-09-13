import React from 'react';
import { typography } from '../../../utils/typography';

export interface HeroSectionProps {
  title: React.ReactNode;
  description: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  trustIndicators?: React.ReactNode;
  image?: React.ReactNode;
  showTrustIndicators?: boolean;
  className?: string;
}

export default function HeroSection({
  title,
  description,
  badge,
  actions,
  trustIndicators,
  image,
  showTrustIndicators = true,
  className = ''
}: HeroSectionProps) {
  return (
    <div className={`relative isolate overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-50/30 dark:from-secondary-950 dark:via-secondary-900 dark:to-secondary-950 ${className}`}>
      {/* Background decoration */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary-400 to-primary-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
      
      <div className="mx-auto max-w-7xl pb-20 pt-20 sm:pb-28 sm:pt-28 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:px-8 lg:py-36">
        <div className="px-6 lg:px-0 lg:pt-4">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <div className="max-w-xl">
              {badge}
              
              <h1 className={`${typography.display.large} font-bold tracking-tight text-secondary-900 dark:text-secondary-100 leading-tight`}>
                {title}
              </h1>
              
              <p className={`mt-6 sm:mt-8 ${typography.body.large} leading-8 sm:leading-9 text-secondary-600 dark:text-secondary-400 max-w-2xl`}>
                {description}
              </p>
              
              {actions}

              {showTrustIndicators && trustIndicators}
            </div>
          </div>
        </div>
        
        {image}
      </div>
    </div>
  );
}