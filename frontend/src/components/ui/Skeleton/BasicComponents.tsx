import React from 'react';
import { classNames } from '../../../utils/classNames';
import Skeleton from './Skeleton';
import { SkeletonCardProps, SkeletonTableProps, SkeletonListProps } from './types';

// Specialized skeleton components for common UI patterns
export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className }) => (
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

export const SkeletonTable: React.FC<SkeletonTableProps> = ({ 
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

export const SkeletonList: React.FC<SkeletonListProps> = ({ 
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