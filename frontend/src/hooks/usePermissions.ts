import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { getUserPermissions } from '../utils/permissions';
import { User } from '../types';

/**
 * Hook to get current user permissions
 */
export function usePermissions() {
  const { user } = useAuthStore();
  
  return useMemo(() => getUserPermissions(user), [user]);
}

/**
 * Hook to check if user has specific permission
 */
export function useHasPermission(permissionCheck: (user: User | null) => boolean) {
  const { user } = useAuthStore();
  
  return useMemo(() => permissionCheck(user), [user, permissionCheck]);
}