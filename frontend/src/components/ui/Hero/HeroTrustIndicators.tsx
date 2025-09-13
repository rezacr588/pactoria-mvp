import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { typography } from '../../../utils/typography';

export interface HeroTrustIndicatorsProps {
  indicators?: string[];
  className?: string;
}

const defaultIndicators = [
  'No credit card required',
  '14-day free trial', 
  'Cancel anytime'
];

export default function HeroTrustIndicators({
  indicators = defaultIndicators,
  className = ''
}: HeroTrustIndicatorsProps) {
  return (
    <div className={`mt-8 sm:mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-x-8 ${typography.body.small} text-secondary-600 dark:text-secondary-400 motion-safe:animate-fade-in ${className}`} style={{ animationDelay: '500ms' }}>
      {indicators.map((text, index) => (
        <div key={text} className="flex items-center motion-safe:animate-fade-in" style={{ animationDelay: `${600 + index * 100}ms` }}>
          <CheckIcon className="h-5 w-5 text-success-600 dark:text-success-400 mr-2 flex-shrink-0" />
          {text}
        </div>
      ))}
    </div>
  );
}