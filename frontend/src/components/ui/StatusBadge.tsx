// Consistent Status Badge Component
import React from 'react';
import Badge from './Badge';
import { getStatusBadgeVariant } from '../../utils/contractTypes';

export interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export default function StatusBadge({ 
  status, 
  className, 
  size = 'sm',
  dot = false 
}: StatusBadgeProps) {
  const variant = getStatusBadgeVariant(status);
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');

  return (
    <Badge 
      variant={variant} 
      size={size}
      dot={dot}
      className={className}
    >
      {label}
    </Badge>
  );
}
