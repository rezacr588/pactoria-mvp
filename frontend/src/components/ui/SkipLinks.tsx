import React from 'react';
import { useSkipLinks } from '../../hooks/useAccessibility';
import { classNames } from '../../utils/classNames';

export interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

const SkipLink: React.FC<SkipLinkProps> = ({ href, children }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      // Make element focusable if it's not already
      const element = target as HTMLElement;
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '-1');
      }
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={classNames(
        'sr-only focus:not-sr-only',
        'absolute top-4 left-4 z-50',
        'bg-primary-600 text-white px-4 py-2 rounded-md font-medium',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
        'transform -translate-y-full focus:translate-y-0',
        'transition-transform duration-200 ease-in-out'
      )}
    >
      {children}
    </a>
  );
};

const SkipLinks: React.FC = () => {
  return (
    <div className="skip-links">
      <SkipLink href="#main-content">
        Skip to main content
      </SkipLink>
      <SkipLink href="#navigation">
        Skip to navigation
      </SkipLink>
      <SkipLink href="#search">
        Skip to search
      </SkipLink>
    </div>
  );
};

export default SkipLinks;