import React from 'react';
import { classNames } from '../../../utils/classNames';
import Skeleton from './Skeleton';
import { SkeletonFormProps, SkeletonGridProps } from './types';

export const SkeletonForm: React.FC<SkeletonFormProps> = ({ 
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

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ 
  count = 6, 
  columns = 3, 
  className 
}) => (
  <div className={classNames(`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`, className)}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-white dark:bg-secondary-800 rounded-xl border border-neutral-200 dark:border-secondary-700 p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <Skeleton variant="rectangular" width={60} height={20} className="rounded" />
                <Skeleton variant="rectangular" width={40} height={20} className="rounded" />
              </div>
              <Skeleton variant="text" width="90%" height={20} />
              <Skeleton variant="text" lines={2} />
            </div>
            <Skeleton variant="circular" width={24} height={24} />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton variant="text" width="40%" height={14} />
              <div className="flex items-center space-x-2">
                <Skeleton variant="rectangular" width={40} height={8} className="rounded-full" />
                <Skeleton variant="text" width="30px" height={14} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Skeleton variant="text" width="35%" height={14} />
              <Skeleton variant="text" width="50%" height={14} />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton variant="text" width="45%" height={14} />
              <Skeleton variant="text" width="40%" height={14} />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1">
            <Skeleton variant="rectangular" width={60} height={24} className="rounded" />
            <Skeleton variant="rectangular" width={80} height={24} className="rounded" />
            <Skeleton variant="rectangular" width={50} height={24} className="rounded" />
          </div>
          
          <div className="space-y-2">
            <Skeleton variant="text" width="60%" height={12} />
            <Skeleton variant="text" width="40%" height={12} />
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Skeleton variant="rectangular" height={36} className="flex-1 rounded-lg" />
            <Skeleton variant="rectangular" width={60} height={36} className="rounded-lg" />
            <Skeleton variant="rectangular" width={60} height={36} className="rounded-lg" />
          </div>
        </div>
      </div>
    ))}
  </div>
);