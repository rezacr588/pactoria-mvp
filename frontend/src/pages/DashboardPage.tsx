import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useContracts } from '../hooks';
import { usePermissions } from '../hooks/usePermissions';
import { PermissionGate } from '../components/PermissionGate';
import OnboardingChecklist from '../components/OnboardingChecklist';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui';
import { SkeletonDashboard } from '../components/ui/Skeleton';
import { classNames } from '../utils/classNames';
import { textColors, textStyles, typography } from '../utils/typography';
import { AnalyticsService } from '../services/api';
import { getErrorMessage } from '../utils/errorHandling';
import { useToast } from '../contexts/ToastContext';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  ArrowRightIcon,
  ChevronUpIcon as TrendingUpIcon,
  UsersIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  BellIcon,
} from '@heroicons/react/24/outline';


function getComplianceColor(score: number) {
  if (score >= 90) return textColors.success;
  if (score >= 80) return textColors.warning;
  return textColors.danger;
}


export default function DashboardPage() {
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const { contracts: storeContracts } = useContracts();
  const permissions = usePermissions();
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data from analytics API
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Always use existing contracts to avoid duplicate API calls
      // The contracts should already be loaded by the ContractsPage or other components
      const analyticsData = await AnalyticsService.getDashboard();
      setDashboardData(analyticsData);
      // Don't include storeContracts as dependency to avoid infinite loop
      // Use current contracts from store at render time
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Update local contracts when store contracts change, but don't trigger refetch
  useEffect(() => {
    setContracts(storeContracts);
  }, [storeContracts]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Memoized calculations to prevent unnecessary re-renders
  const dashboardMetrics = useMemo(() => {
    if (!dashboardData?.business_metrics) {
      return {
        totalContracts: 0,
        activeContracts: 0,
        pendingContracts: 0,
        averageCompliance: 0,
        recentContracts: contracts,
        upcomingDeadlines: [],
        complianceIssues: []
      };
    }

    const businessMetrics = dashboardData.business_metrics;
    const complianceMetrics = dashboardData.compliance_metrics;

    // Recent activity - use the contracts we fetched
    const recentContracts = contracts
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 5);

  // Calculate upcoming deadlines from actual contracts
  const upcomingDeadlines = contracts
    .filter(contract => contract.end_date)
    .map(contract => {
      const daysUntil = Math.ceil((new Date(contract.end_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const urgency = daysUntil <= 7 ? 'critical' : daysUntil <= 30 ? 'warning' : 'normal';
      return {
        id: `${contract.id}-deadline`,
        title: contract.end_date && new Date(contract.end_date) < new Date() ? 'Contract Expired' : 'Contract Expiration',
        contractName: contract.title,
        contractId: contract.id,
        contractType: contract.contract_type.replace('_', ' '),
        value: contract.contract_value,
        currency: contract.currency,
        daysUntil,
        urgency,
        date: contract.end_date
      };
    })
    .filter(deadline => deadline.daysUntil >= -7 && deadline.daysUntil <= 90) // Include recently expired
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  // Calculate real compliance issues from contracts and metrics
  const complianceIssues = [];
  
  if (complianceMetrics?.high_risk_contracts_count > 0) {
    complianceIssues.push({
      contractId: 'risk-summary',
      contractName: 'Multiple Contracts',
      category: 'High Risk Alert',
      severity: 'high',
      description: `${complianceMetrics.high_risk_contracts_count} contracts require immediate attention`,
      action: 'Review high-risk contracts'
    });
  }
  
  if (complianceMetrics?.gdpr_compliance < 80) {
    complianceIssues.push({
      contractId: 'gdpr-alert',
      contractName: 'GDPR Compliance',
      category: 'Data Protection',
      severity: 'medium',
      description: `GDPR compliance at ${Math.round(complianceMetrics.gdpr_compliance)}% - below recommended threshold`,
      action: 'Update privacy clauses'
    });
  }
  
  // Add alerts for expiring contracts
  const expiringCount = upcomingDeadlines.filter(d => d.daysUntil <= 30 && d.daysUntil > 0).length;
  if (expiringCount > 0) {
    complianceIssues.push({
      contractId: 'expiring-contracts',
      contractName: 'Contract Renewals',
      category: 'Time Sensitive',
      severity: 'medium',
      description: `${expiringCount} contracts expiring within 30 days`,
      action: 'Plan renewals'
    });
  }

    return {
      totalContracts: businessMetrics.total_contracts,
      activeContracts: businessMetrics.active_contracts,
      pendingContracts: businessMetrics.draft_contracts,
      averageCompliance: Math.round(businessMetrics.compliance_score_average || 0),
      recentContracts,
      upcomingDeadlines,
      complianceIssues
    };
  }, [contracts, dashboardData]);

  const { totalContracts, activeContracts, pendingContracts, averageCompliance, recentContracts, upcomingDeadlines, complianceIssues } = dashboardMetrics;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Build quick stats from actual data - no hardcoded changes
  const quickStats = useMemo(() => {
    if (!dashboardData) return [];
    
    const businessMetrics = dashboardData.business_metrics;
    const complianceMetrics = dashboardData.compliance_metrics;
    const timeMetrics = dashboardData.time_metrics;
    
    // Calculate real period-over-period changes if available
    const contractChange = businessMetrics?.contracts_created_this_month || 0;
    const activeChange = businessMetrics?.contracts_activated_this_month || 0;
    const pendingChange = businessMetrics?.contracts_pending_review || 0;
    const complianceChange = complianceMetrics?.compliance_trend || 0;
    
    return [
      {
        name: 'Total Contracts',
        value: totalContracts.toString(),
        change: contractChange > 0 ? `+${contractChange}` : contractChange < 0 ? `${contractChange}` : '—',
        changeType: contractChange > 0 ? 'increase' as const : contractChange < 0 ? 'decrease' as const : 'neutral' as const,
        icon: DocumentTextIcon,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        subtitle: businessMetrics?.total_contracts > 0 ? 'All time' : 'Get started',
      },
      {
        name: 'Active Contracts',
        value: activeContracts.toString(),
        change: activeChange > 0 ? `+${activeChange}` : activeChange < 0 ? `${activeChange}` : '—',
        changeType: activeChange > 0 ? 'increase' as const : activeChange < 0 ? 'decrease' as const : 'neutral' as const,
        icon: CheckCircleIcon,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        subtitle: businessMetrics?.active_contracts > 0 ? 'Currently active' : 'No active contracts',
      },
      {
        name: 'Pending Review',
        value: pendingContracts.toString(),
        change: pendingChange > 0 ? `${pendingChange} new` : '—',
        changeType: pendingChange > 0 ? 'warning' as const : 'neutral' as const,
        icon: ClockIcon,
        color: pendingChange > 0 ? 'text-yellow-600' : 'text-gray-600',
        bgColor: pendingChange > 0 ? 'bg-yellow-50' : 'bg-gray-50',
        subtitle: pendingChange > 0 ? 'Needs attention' : 'All reviewed',
      },
      {
        name: 'Compliance Score',
        value: averageCompliance > 0 ? `${averageCompliance}%` : 'N/A',
        change: complianceChange !== 0 ? `${complianceChange > 0 ? '+' : ''}${complianceChange}%` : '—',
        changeType: complianceChange > 0 ? 'increase' as const : complianceChange < 0 ? 'decrease' as const : 'neutral' as const,
        icon: ShieldCheckIcon,
        color: getComplianceColor(averageCompliance),
        bgColor: averageCompliance >= 90 ? 'bg-green-50' : averageCompliance >= 80 ? 'bg-yellow-50' : averageCompliance > 0 ? 'bg-red-50' : 'bg-gray-50',
        subtitle: averageCompliance > 0 ? `${complianceMetrics?.compliant_contracts_count || 0} compliant` : 'No data yet',
      },
    ];
  }, [dashboardData, totalContracts, activeContracts, pendingContracts, averageCompliance]);

  // Show skeleton while loading - after all hooks to prevent hook count mismatch
  if (isLoading && !dashboardData) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto" role="main" aria-label="Loading dashboard">
        <div className="sr-only" aria-live="polite">Loading your dashboard data...</div>
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className={`${typography.heading.h1} sm:${typography.display.small} font-bold ${textColors.primary}`}>
            Good morning{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h1>
          <p className={`mt-1 sm:mt-2 ${typography.body.medium} sm:${typography.body.large} ${textColors.secondary}`}>
            Here's what's happening with your contracts today
          </p>
        </div>
        <PermissionGate permission="canManageContracts">
          <Link to="/contracts/new" className="w-full sm:w-auto" aria-label="Create a new contract">
            <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} className="w-full sm:w-auto">
              New Contract
            </Button>
          </Link>
        </PermissionGate>
      </header>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-red-600 dark:text-red-400 text-sm">
              <strong>Error loading dashboard data:</strong> {error}
            </div>
            <button 
              onClick={clearError} 
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <section aria-labelledby="stats-heading" className="mb-6 sm:mb-8">
        <h2 id="stats-heading" className="sr-only">Dashboard Statistics</h2>
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {quickStats.map((stat, index) => (
          <Card 
            key={stat.name} 
            variant="elevated" 
            className="p-3 sm:p-4 hover:scale-[1.02] transition-transform duration-200"
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className={classNames(
                stat.bgColor, 
                'flex-shrink-0 rounded-xl p-2 sm:p-3',
                'transition-transform duration-200 hover:scale-110'
              )}>
                <stat.icon className={classNames(stat.color, 'h-5 w-5 sm:h-6 sm:w-6')} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <dl>
                  <dt className={`${textStyles.dataLabel} truncate`}>{stat.name}</dt>
                  <dd className="mt-1">
                    <div className="flex items-baseline space-x-2">
                      <div className={`text-lg sm:text-2xl font-bold ${textColors.primary} tabular-nums`}>
                        {stat.value}
                      </div>
                      {stat.change !== '—' && (
                        <div className={classNames(
                          stat.changeType === 'increase' ? 'text-success-600 dark:text-success-400' : 
                          stat.changeType === 'decrease' ? 'text-danger-600 dark:text-danger-400' :
                          stat.changeType === 'warning' ? 'text-warning-600 dark:text-warning-400' :
                          'text-gray-400 dark:text-gray-500',
                          'flex items-baseline text-xs sm:text-sm font-semibold'
                        )}>
                          {stat.changeType !== 'neutral' && stat.changeType !== 'warning' && (
                            <TrendingUpIcon 
                              className={classNames(
                                'h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mr-0.5',
                                stat.changeType === 'decrease' && 'rotate-180'
                              )} 
                              aria-hidden="true" 
                            />
                          )}
                          <span className="sr-only">
                            {stat.changeType === 'increase' ? 'Increased' : 
                             stat.changeType === 'decrease' ? 'Decreased' : 
                             stat.changeType === 'warning' ? 'Warning' : 'No change'} 
                            {stat.change}
                          </span>
                          {stat.change}
                        </div>
                      )}
                    </div>
                    {stat.subtitle && (
                      <div className={`text-xs ${textColors.muted} mt-1`}>
                        {stat.subtitle}
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        ))}
        </div>
      </section>

      {/* Onboarding Checklist */}
      {showOnboarding && (
        <div className="mb-8">
          <OnboardingChecklist onDismiss={() => setShowOnboarding(false)} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:gap-8">
        {/* Recent Activity */}
        <Card className="lg:col-span-2" variant="bordered">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Link
                to="/contracts"
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                View all contracts
              </Link>
            </div>
          </CardHeader>
          <CardContent>

          {isLoading ? (
            <div className="space-y-4" role="status" aria-label="Loading recent contracts">
              <div className="sr-only" aria-live="polite">Loading recent activity...</div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="h-10 w-10 bg-neutral-200 dark:bg-secondary-700 rounded-lg" aria-hidden="true"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-200 dark:bg-secondary-700 rounded w-3/4" aria-hidden="true"></div>
                    <div className="h-3 bg-neutral-200 dark:bg-secondary-700 rounded w-1/2" aria-hidden="true"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentContracts.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className={`mx-auto h-12 w-12 ${textColors.subtle} mb-4`} aria-hidden="true" />
              <h3 className={`${textStyles.cardTitle} mb-2`}>No contracts yet</h3>
              <p className={`${textStyles.bodyTextSecondary} mb-4`}>Get started by creating your first contract</p>
              <Link to="/contracts/new">
                <Button variant="primary" size="sm">
                  Create Contract
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentContracts.map((contract) => {
                return (
                  <div key={contract.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-secondary-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-secondary-700 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className={`h-10 w-10 ${textColors.subtle}`} />
                      </div>
                      <div>
                        <Link 
                          to={`/contracts/${contract.id}`}
                          className={`${textStyles.listTitle} hover:text-primary-600`}
                        >
                          {contract.title}
                        </Link>
                        <div className={textStyles.listSubtitle}>
                          {contract.contract_type.replace('_', ' ')} • Updated {new Date(contract.updated_at || contract.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={classNames(
                            'text-blue-600',
                            'text-xs font-medium'
                          )}>
                            {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                          </span>
                          {contract.contract_value && (
                            <span className="text-xs text-gray-500">
                              {contract.currency} {contract.contract_value.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRightIcon className={`h-5 w-5 ${textColors.subtle}`} />
                  </div>
                );
              })}
            </div>
          )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <aside className="space-y-6 lg:space-y-8" role="complementary" aria-label="Dashboard sidebar">
          {/* Upcoming Deadlines */}
          <Card variant="bordered">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upcoming Deadlines</CardTitle>
                <BellIcon className={`h-5 w-5 ${textColors.subtle}`} aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>

            <div className="space-y-4">
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-6">
                  <ClockIcon className={`mx-auto h-8 w-8 ${textColors.subtle} mb-2`} aria-hidden="true" />
                  <p className={`${textStyles.bodyTextSecondary} font-medium`}>No upcoming deadlines</p>
                  <p className={`${textStyles.captionText} mt-1`}>You're all caught up!</p>
                </div>
              ) : (
                upcomingDeadlines.map((deadline) => (
                  <div key={`${deadline.contractId}-${deadline.id}`} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={classNames(
                        deadline.daysUntil <= 7 ? 'bg-red-100' : 'bg-blue-100',
                        'flex-shrink-0 w-3 h-3 rounded-full'
                      )}>
                        <div className={classNames(
                          deadline.daysUntil <= 7 ? 'bg-red-600' : 'bg-blue-600',
                          'w-full h-full rounded-full'
                        )} />
                      </div>
                      <div>
                        <p className={textStyles.listTitle}>{deadline.title}</p>
                        <p className={textStyles.metadata}>{deadline.contractName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={classNames(
                        deadline.daysUntil <= 7 ? 'text-red-600 font-medium' : textColors.muted,
                        'text-xs'
                      )}>
                        {deadline.daysUntil === 0 ? 'Due today' : 
                         deadline.daysUntil === 1 ? 'Due tomorrow' : 
                         `${deadline.daysUntil} days`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            </CardContent>
          </Card>

          {/* Compliance Issues */}
          <PermissionGate permission="canAccessAuditLogs">
            <Card variant="bordered">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Compliance Alerts</CardTitle>
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent>

            <div className="space-y-4">
              {complianceIssues.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircleIcon className="mx-auto h-8 w-8 text-success-500 mb-2" aria-hidden="true" />
                  <p className={`${textStyles.bodyText} ${textColors.success} font-medium`}>All contracts compliant</p>
                  <p className={`${textStyles.captionText}`}>No compliance issues found</p>
                </div>
              ) : (
                complianceIssues.map((issue, index) => (
                  <div key={`${issue.contractId}-${index}`} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-yellow-800">{issue.category}</p>
                        <p className="text-xs text-yellow-700 mt-1">{issue.description}</p>
                        <Link 
                          to={`/contracts/${issue.contractId}`}
                          className="text-xs text-yellow-600 hover:text-yellow-500 mt-1 inline-block"
                        >
                          View contract →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            </CardContent>
          </Card>
          </PermissionGate>

          {/* Quick Actions */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-3">
              <PermissionGate permission="canManageContracts">
                <Link
                  to="/contracts/new"
                  className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-950/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-950/30 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-6 w-6 text-primary-600" />
                    <span className={`text-sm font-medium ${textColors.primary}`}>Create Contract</span>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-primary-600 group-hover:text-primary-700" />
                </Link>
              </PermissionGate>
              
              <PermissionGate permission="canManageTeam">
                <Link
                  to="/team"
                  className="flex items-center justify-between p-3 bg-success-50 dark:bg-success-950/20 rounded-lg hover:bg-success-100 dark:hover:bg-success-950/30 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <UsersIcon className="h-6 w-6 text-green-600" />
                    <span className={`text-sm font-medium ${textColors.primary}`}>Manage Team</span>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-green-600 group-hover:text-green-700" />
                </Link>
              </PermissionGate>
              
              <PermissionGate permission="canAccessAnalytics">
                <Link
                  to="/analytics"
                  className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <ChartBarIcon className="h-6 w-6 text-purple-600" />
                    <span className={`text-sm font-medium ${textColors.primary}`}>View Analytics</span>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-purple-600 group-hover:text-purple-700" />
                </Link>
              </PermissionGate>
            </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Detailed Compliance Dashboard */}
      <section className="mt-6 sm:mt-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:gap-8">
        {/* Compliance Breakdown */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>UK Legal Compliance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="space-y-4">
            {[
              { name: 'GDPR Compliance', score: 96 },
              { name: 'Employment Law', score: 92 },
              { name: 'Commercial Terms', score: 94 },
              { name: 'Consumer Rights', score: 91 }
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className={`text-sm ${textColors.secondary}`}>{item.name}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-neutral-200 dark:bg-secondary-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                        item.score >= 95 ? 'bg-success-600' :
                        item.score >= 90 ? 'bg-success-500' :
                        item.score >= 80 ? 'bg-warning-500' : 'bg-danger-500'
                      }`}
                      style={{ width: `${item.score}%` }}
                      role="progressbar"
                      aria-valuenow={item.score}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${item.name}: ${item.score}% compliant`}
                    />
                  </div>
                  <span className={`text-sm font-medium ${textColors.primary} w-10 tabular-nums`}>
                    {item.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-secondary-700">
            <div className="text-center">
              <div className={`text-3xl font-bold ${textColors.success}`}>{averageCompliance}%</div>
              <div className={`text-sm ${textColors.muted}`}>Overall Compliance Score</div>
              <p className={`text-xs ${textColors.subtle} mt-2`}>
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          </CardContent>
        </Card>

        {/* Risk Assessment Summary */}
        <PermissionGate permission="canAccessAnalytics">
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Risk Assessment Summary</CardTitle>
            </CardHeader>
            <CardContent>
          
          <div className="space-y-4">
            {contracts.slice(0, 3).map((contract) => {
              return (
                <div key={contract.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-secondary-800 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/contracts/${contract.id}`}
                      className={`text-sm font-medium ${textColors.primary} ${textColors.interactiveHover} truncate block`}
                    >
                      {contract.title}
                    </Link>
                    <p className={`text-xs ${textColors.muted}`}>{contract.contract_type.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right ml-4">
                    <span className={classNames(
                      'text-blue-600',
                      'text-xs font-medium'
                    )}>
                      {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                    </span>
                    {contract.contract_value && (
                      <p className={`text-xs ${textColors.muted}`}>{contract.currency} {contract.contract_value.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-secondary-700">
            <Link
              to="/contracts"
              className={`text-sm font-medium ${textColors.interactive} ${textColors.interactiveHover} flex items-center justify-center`}
            >
              View detailed risk analysis
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
          </CardContent>
        </Card>
        </PermissionGate>
        </div>
      </section>

      {/* AI Insights */}
      <section className="mt-6 sm:mt-8 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-950/20 dark:to-blue-950/20 rounded-lg border border-primary-200 dark:border-primary-800 p-4 sm:p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h4 className={`text-base font-medium ${textColors.primary}`}>AI Insights for Your Business</h4>
            <div className={`mt-2 text-sm ${textColors.secondary} space-y-2`}>
              <p>• Your contracts show excellent UK legal compliance with an average score of {averageCompliance}%</p>
              <p>• Consider setting up automated reminders for the {upcomingDeadlines.length} upcoming deadlines</p>
              <p>• {activeContracts} active contracts are generating positive business value</p>
              {complianceIssues.length > 0 && (
                <p>• {complianceIssues.length} minor compliance issues need attention for optimal protection</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}