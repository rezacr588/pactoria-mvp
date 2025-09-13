import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import Button from '../Button';
import { typography } from '../../../utils/typography';

export interface HeroActionsProps {
  user?: any;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  className?: string;
}

export default function HeroActions({
  user,
  primaryButtonText = 'Start Free Trial',
  primaryButtonHref = '/login',
  secondaryButtonText = 'Sign In',
  secondaryButtonHref = '/login',
  className = ''
}: HeroActionsProps) {
  const primaryHref = user ? "/dashboard" : primaryButtonHref;
  
  return (
    <div className={`mt-10 sm:mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-x-6 motion-safe:animate-fade-in ${className}`} style={{ animationDelay: '300ms' }}>
      <Link to={primaryHref} className="w-full sm:w-auto">
        <Button size="lg" className="px-8 py-4 w-full sm:w-auto text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group">
          {user ? (
            <>
              <HomeIcon className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
              Go to Dashboard
            </>
          ) : (
            <>
              {primaryButtonText}
              <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
            </>
          )}
        </Button>
      </Link>
      {!user && (
        <Link to={secondaryButtonHref} className={`${typography.body.large} font-semibold leading-6 text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 flex items-center justify-center sm:justify-start group hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg px-3 py-2 min-h-[44px]`}>
          {secondaryButtonText} <ArrowRightIcon className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
        </Link>
      )}
    </div>
  );
}