import React from 'react';
import { classNames } from '../../../utils/classNames';
import Skeleton from './Skeleton';
import { SkeletonList } from './BasicComponents';
import { SkeletonStatsProps, SkeletonDashboardProps } from './types';

export const SkeletonStats: React.FC<SkeletonStatsProps> = ({ 
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

export const SkeletonDashboard: React.FC<SkeletonDashboardProps> = ({ className }) => (
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