export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export interface SkeletonCardProps {
  className?: string;
}

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export interface SkeletonListProps {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}

export interface SkeletonStatsProps {
  items?: number;
  className?: string;
}

export interface SkeletonDashboardProps {
  className?: string;
}

export interface SkeletonFormProps {
  fields?: number;
  className?: string;
}

export interface SkeletonGridProps {
  count?: number;
  columns?: number;
  className?: string;
}