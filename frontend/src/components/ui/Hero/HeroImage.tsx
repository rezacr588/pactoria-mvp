import React from 'react';

export interface HeroImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  withDecorations?: boolean;
  className?: string;
}

export default function HeroImage({
  src,
  alt,
  width = 2432,
  height = 1442,
  withDecorations = true,
  className = ''
}: HeroImageProps) {
  return (
    <div className={`mt-16 sm:mt-20 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 lg:w-screen lg:max-w-none ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-primary-600/10 rounded-3xl transform rotate-1" />
        <div className="relative bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl ring-1 ring-secondary-900/10 dark:ring-secondary-700/50 overflow-hidden">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950/40 dark:to-primary-900/40 px-6 pt-8 sm:px-10 sm:pt-10">
            <div className="relative">
              <img
                src={src}
                alt={alt}
                className="w-full rounded-t-xl shadow-xl ring-1 ring-secondary-900/10 dark:ring-secondary-700/50 transform hover:scale-105 transition-transform duration-300 motion-reduce:transform-none motion-reduce:hover:scale-100"
                width={width}
                height={height}
                loading="lazy"
              />
              {withDecorations && (
                <>
                  {/* Floating elements for visual appeal */}
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary-500 rounded-full opacity-20 motion-safe:animate-pulse" />
                  <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-primary-300 rounded-full opacity-30 motion-safe:animate-bounce" style={{ animationDelay: '1s' }} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}