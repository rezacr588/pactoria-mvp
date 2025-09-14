import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import { User } from '../types';

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: keyof ReturnType<typeof usePermissions>;
  customCheck?: (user: User | null) => boolean;
  fallback?: React.ReactNode;
  requireAll?: boolean;
  permissions?: Array<keyof ReturnType<typeof usePermissions>>;
}

/**
 * Component that conditionally renders content based on user permissions
 */
export function PermissionGate({ 
  children, 
  permission, 
  customCheck,
  permissions,
  requireAll = false,
  fallback = null 
}: PermissionGateProps) {
  const userPermissions = usePermissions();
  const { user } = useAuthStore();

  let hasAccess = false;

  if (customCheck) {
    hasAccess = customCheck(user);
  } else if (permissions && permissions.length > 0) {
    if (requireAll) {
      hasAccess = permissions.every(p => userPermissions[p]);
    } else {
      hasAccess = permissions.some(p => userPermissions[p]);
    }
  } else if (permission) {
    hasAccess = userPermissions[permission] as boolean;
  } else {
    // If no permission specified, default to canView
    hasAccess = userPermissions.canView;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hide content if user doesn't have permission
 */
export function HideIfNoPermission(props: Omit<PermissionGateProps, 'fallback'>) {
  return <PermissionGate {...props} fallback={null} />;
}

/**
 * Show fallback if user doesn't have permission
 */
export function ShowIfNoPermission({ 
  children, 
  fallback, 
  ...props 
}: PermissionGateProps) {
  return (
    <PermissionGate {...props} fallback={children}>
      {fallback}
    </PermissionGate>
  );
}