import { User } from '../types';

// Define the role hierarchy from backend
export enum UserRole {
  VIEWER = 'viewer',
  CONTRACT_MANAGER = 'contract_manager', 
  LEGAL_REVIEWER = 'legal_reviewer',
  ADMIN = 'admin'
}

// Role hierarchy levels for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.VIEWER]: 1,
  [UserRole.CONTRACT_MANAGER]: 2,
  [UserRole.LEGAL_REVIEWER]: 3,
  [UserRole.ADMIN]: 4,
};

/**
 * Check if user has the required role or higher
 */
export function hasPermission(user: User | null, requiredRole: UserRole): boolean {
  if (!user || !user.is_active) {
    return false;
  }

  // Admin users have all permissions
  if (user.is_admin) {
    return true;
  }

  const userLevel = ROLE_HIERARCHY[user.role as UserRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User | null): boolean {
  return user?.is_admin === true;
}

/**
 * Check if user can manage contracts
 */
export function canManageContracts(user: User | null): boolean {
  return hasPermission(user, UserRole.CONTRACT_MANAGER);
}

/**
 * Check if user can review legal documents
 */
export function canReviewLegal(user: User | null): boolean {
  return hasPermission(user, UserRole.LEGAL_REVIEWER);
}

/**
 * Check if user can view content
 */
export function canView(user: User | null): boolean {
  return hasPermission(user, UserRole.VIEWER);
}

/**
 * Check if user can manage team members
 */
export function canManageTeam(user: User | null): boolean {
  return hasPermission(user, UserRole.CONTRACT_MANAGER);
}

/**
 * Check if user can access admin features
 */
export function canAccessAdmin(user: User | null): boolean {
  return isAdmin(user);
}

/**
 * Check if user can manage templates
 */
export function canManageTemplates(user: User | null): boolean {
  return hasPermission(user, UserRole.LEGAL_REVIEWER);
}

/**
 * Check if user can generate AI content
 */
export function canGenerateAI(user: User | null): boolean {
  return hasPermission(user, UserRole.CONTRACT_MANAGER);
}

/**
 * Check if user can access analytics
 */
export function canAccessAnalytics(user: User | null): boolean {
  return hasPermission(user, UserRole.CONTRACT_MANAGER);
}

/**
 * Check if user can bulk manage items
 */
export function canBulkManage(user: User | null): boolean {
  return hasPermission(user, UserRole.CONTRACT_MANAGER);
}

/**
 * Check if user can access audit logs
 */
export function canAccessAuditLogs(user: User | null): boolean {
  return hasPermission(user, UserRole.LEGAL_REVIEWER);
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    [UserRole.VIEWER]: 'Viewer',
    [UserRole.CONTRACT_MANAGER]: 'Contract Manager',
    [UserRole.LEGAL_REVIEWER]: 'Legal Reviewer',
    [UserRole.ADMIN]: 'Administrator'
  };
  
  return roleNames[role] || 'Unknown';
}

/**
 * Get permissions summary for a user
 */
export function getUserPermissions(user: User | null) {
  return {
    canView: canView(user),
    canManageContracts: canManageContracts(user),
    canReviewLegal: canReviewLegal(user),
    canManageTeam: canManageTeam(user),
    canAccessAdmin: canAccessAdmin(user),
    canManageTemplates: canManageTemplates(user),
    canGenerateAI: canGenerateAI(user),
    canAccessAnalytics: canAccessAnalytics(user),
    canBulkManage: canBulkManage(user),
    canAccessAuditLogs: canAccessAuditLogs(user),
    isAdmin: isAdmin(user),
    role: user?.role,
    roleDisplayName: getRoleDisplayName(user?.role || '')
  };
}