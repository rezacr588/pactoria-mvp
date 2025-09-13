// Export main Skeleton component
export { default as Skeleton } from './Skeleton';

// Export basic skeleton components  
export { SkeletonCard, SkeletonTable, SkeletonList } from './BasicComponents';

// Export layout skeleton components
export { SkeletonStats, SkeletonDashboard } from './LayoutComponents';

// Export form skeleton components
export { SkeletonForm, SkeletonGrid } from './FormComponents';

// Export types
export type {
  SkeletonProps,
  SkeletonCardProps,
  SkeletonTableProps,
  SkeletonListProps,
  SkeletonStatsProps,
  SkeletonDashboardProps,
  SkeletonFormProps,
  SkeletonGridProps
} from './types';

// Default export for backwards compatibility
export { default } from './Skeleton';