import React from 'react';
import { classNames } from '../../utils/classNames';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  animation = 'pulse',
  width,
  height,
  lines = 1,
}) => {
  const baseClasses = 'bg-neutral-200 dark:bg-secondary-700';
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-secondary-700 dark:via-secondary-600 dark:to-secondary-700 bg-[length:400%_100%]',
    none: ''
  };

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg'
  };

  const sizeStyles = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={classNames('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={classNames(
              baseClasses,
              animationClasses[animation],
              variantClasses[variant],
              index === lines - 1 ? 'w-3/4' : 'w-full'
            )}
            style={{
              height: height ? (typeof height === 'number' ? `${height}px` : height) : '1rem',
              width: index === lines - 1 ? '75%' : (width ? (typeof width === 'number' ? `${width}px` : width) : undefined)
            }}
          />
        ))}
      </div>
    );
  }

  const defaultSizes = {
    text: { height: '1rem' },
    circular: { width: '2rem', height: '2rem' },
    rectangular: { width: '100%', height: '8rem' },
    rounded: { width: '100%', height: '8rem' }
  };

  return (
    <div
      className={classNames(
        baseClasses,
        animationClasses[animation],
        variantClasses[variant],
        className
      )}
      style={{
        ...defaultSizes[variant],
        ...sizeStyles
      }}
    />
  );
};

// Specialized skeleton components for common UI patterns
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={classNames('p-6 space-y-4', className)}>
    <Skeleton variant="rectangular" height={200} animation="wave" />
    <div className="space-y-2">
      <Skeleton variant="text" width="60%" height={20} />
      <Skeleton variant="text" lines={2} />
    </div>
    <div className="flex items-center space-x-3">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1">
        <Skeleton variant="text" width="40%" height={16} />
        <Skeleton variant="text" width="60%" height={14} />
      </div>
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({ 
  rows = 5, 
  columns = 4, 
  className 
}) => (
  <div className={classNames('space-y-4', className)}>
    {/* Header */}
    <div className="grid grid-cols-4 gap-4 p-4 bg-neutral-50 dark:bg-secondary-800 rounded-lg">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={`header-${index}`} variant="text" width="70%" height={16} />
      ))}
    </div>
    {/* Rows */}
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-4 p-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" height={14} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonList: React.FC<{ items?: number; showAvatar?: boolean; className?: string }> = ({ 
  items = 5, 
  showAvatar = true, 
  className 
}) => (
  <div className={classNames('space-y-4', className)}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4">
        {showAvatar && <Skeleton variant="circular" width={48} height={48} />}
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="80%" height={16} />
          <Skeleton variant="text" width="60%" height={14} />
        </div>
        <Skeleton variant="rectangular" width={60} height={24} />
      </div>
    ))}
  </div>
);

export const SkeletonStats: React.FC<{ items?: number; className?: string }> = ({ 
  items = 4, 
  className 
}) => (
  <div className={classNames('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="p-6 bg-white dark:bg-secondary-800 rounded-xl border border-neutral-200 dark:border-secondary-700">
        <div className="flex items-center space-x-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" height={14} />
            <Skeleton variant="text" width="50%" height={24} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonDashboard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={classNames('space-y-8', className)}>
    {/* Header */}
    <div className="space-y-2">
      <Skeleton variant="text" width="40%" height={32} />
      <Skeleton variant="text" width="60%" height={16} />
    </div>
    
    {/* Stats */}
    <SkeletonStats />
    
    {/* Main Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-neutral-200 dark:border-secondary-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton variant="text" width="30%" height={20} />
            <Skeleton variant="text" width="20%" height={16} />
          </div>
          <SkeletonList items={3} />
        </div>
      </div>
      
      {/* Sidebar */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-neutral-200 dark:border-secondary-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="text" width="50%" height={18} />
            <Skeleton variant="circular" width={20} height={20} />
          </div>
          <SkeletonList items={3} showAvatar={false} />
        </div>
        
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-neutral-200 dark:border-secondary-700 p-6">
          <Skeleton variant="text" width="40%" height={18} className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-3 bg-neutral-50 dark:bg-secondary-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton variant="circular" width={24} height={24} />
                  <div className="flex-1">
                    <Skeleton variant="text" width="70%" height={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const SkeletonForm: React.FC<{ fields?: number; className?: string }> = ({ 
  fields = 6, 
  className 
}) => (
  <div className={classNames('space-y-6', className)}>
    <div className="space-y-2">
      <Skeleton variant="text" width="40%" height={24} />
      <Skeleton variant="text" width="70%" height={16} />
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton variant="text" width="30%" height={14} />
          <Skeleton variant="rectangular" height={44} className="rounded-lg" />
        </div>
      ))}
    </div>
    
    <div className="space-y-4">
      <Skeleton variant="text" width="25%" height={14} />
      <Skeleton variant="rectangular" height={120} className="rounded-lg" />
    </div>
    
    <div className="flex justify-between">
      <Skeleton variant="rectangular" width={100} height={40} className="rounded-lg" />
      <Skeleton variant="rectangular" width={120} height={40} className="rounded-lg" />
    </div>
  </div>
);

export default Skeleton;