import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContractStore } from '../store/contractStore';
import { useAuthStore } from '../store/authStore';
import OnboardingChecklist from '../components/OnboardingChecklist';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui';
import { SkeletonDashboard, SkeletonStats, SkeletonList } from '../components/ui/Skeleton';
import { classNames } from '../utils/classNames';
import { textColors } from '../utils/typography';
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

function getRiskLevel(score: number) {
  if (score <= 30) return { level: 'Low', color: textColors.success };
  if (score <= 60) return { level: 'Medium', color: textColors.warning };
  return { level: 'High', color: textColors.danger };
}

export default function DashboardPage() {
  const { contracts, fetchContracts, isLoading } = useContractStore();
  const { user } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Show skeleton while loading
  if (isLoading && contracts.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <SkeletonDashboard />
      </div>
    );
  }

  // Calculate metrics
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const pendingContracts = contracts.filter(c => c.status === 'review' || c.status === 'draft').length;
  const averageCompliance = contracts.length > 0 
    ? Math.round(contracts.reduce((acc, c) => acc + c.complianceScore.overall, 0) / contracts.length)
    : 0;

  // Recent activity
  const recentContracts = contracts
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Upcoming deadlines
  const upcomingDeadlines = contracts
    .flatMap(contract => 
      contract.deadlines.map(deadline => ({
        ...deadline,
        contractName: contract.name,
        contractId: contract.id,
        daysUntil: Math.ceil((new Date(deadline.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      }))
    )
    .filter(deadline => deadline.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  // Compliance issues
  const complianceIssues = contracts
    .flatMap(contract => 
      contract.complianceScore.issues.map(issue => ({
        ...issue,
        contractName: contract.name,
        contractId: contract.id
      }))
    )
    .slice(0, 5);

  const quickStats = [
    {
      name: 'Total Contracts',
      value: totalContracts.toString(),
      change: '+3',
      changeType: 'increase' as const,
      icon: DocumentTextIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Active Contracts',
      value: activeContracts.toString(),
      change: '+2',
      changeType: 'increase' as const,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Pending Review',
      value: pendingContracts.toString(),
      change: '+1',
      changeType: 'increase' as const,
      icon: ClockIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      name: 'Compliance Score',
      value: `${averageCompliance}%`,
      change: '+2%',
      changeType: 'increase' as const,
      icon: ShieldCheckIcon,
      color: getComplianceColor(averageCompliance),
      bgColor: averageCompliance >= 90 ? 'bg-green-50' : averageCompliance >= 80 ? 'bg-yellow-50' : 'bg-red-50',
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-secondary-100">
            Good morning, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-neutral-600 dark:text-secondary-300">
            Here's what's happening with your contracts today
          </p>
        </div>
        <Link to="/contracts/new" className="w-full sm:w-auto">
          <Button icon={<PlusIcon className="h-4 w-4" />} className="w-full sm:w-auto">
            New Contract
          </Button>
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
        {quickStats.map((stat, index) => (
          <Card 
            key={stat.name} 
            variant="elevated" 
            className="p-3 sm:p-4 hover:scale-[1.02] transition-transform duration-200"
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className={classNames(
                stat.bgColor, 
                'flex-shrink-0 rounded-xl p-2 sm:p-3 mb-2 sm:mb-0',
                'transition-transform duration-200 hover:scale-110'
              )}>
                <stat.icon className={classNames(stat.color, 'h-5 w-5 sm:h-6 sm:w-6')} aria-hidden="true" />
              </div>
              <div className="sm:ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-secondary-400 truncate">{stat.name}</dt>
                  <dd className="flex flex-col sm:flex-row sm:items-baseline">
                    <div className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-secondary-100 tabular-nums">
                      {stat.value}
                    </div>
                    <div className={classNames(
                      stat.changeType === 'increase' ? 'text-success-600' : 'text-danger-600',
                      'sm:ml-2 flex items-baseline text-xs sm:text-sm font-semibold'
                    )}>
                      <TrendingUpIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 self-center mr-1" aria-hidden="true" />
                      <span className="sr-only">{stat.changeType === 'increase' ? 'Increased' : 'Decreased'} by</span>
                      {stat.change}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Onboarding Checklist */}
      {showOnboarding && (
        <div className="mb-8">
          <OnboardingChecklist onDismiss={() => setShowOnboarding(false)} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
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
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="h-10 w-10 bg-neutral-200 dark:bg-secondary-700 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-200 dark:bg-secondary-700 rounded w-3/4"></div>
                    <div className="h-3 bg-neutral-200 dark:bg-secondary-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {recentContracts.map((contract) => {
                const riskInfo = getRiskLevel(contract.riskAssessment.overall);
                return (
                  <div key={contract.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-secondary-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-secondary-700 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className="h-10 w-10 text-neutral-400 dark:text-secondary-500" />
                      </div>
                      <div>
                        <Link 
                          to={`/contracts/${contract.id}`}
                          className="text-sm font-medium text-neutral-900 dark:text-secondary-100 hover:text-primary-600"
                        >
                          {contract.name}
                        </Link>
                        <div className="text-sm text-neutral-500 dark:text-secondary-400">
                          {contract.type.name} • Updated {new Date(contract.updatedAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={classNames(
                            getComplianceColor(contract.complianceScore.overall),
                            'text-xs font-medium'
                          )}>
                            {contract.complianceScore.overall}% Compliant
                          </span>
                          <span className={classNames(
                            riskInfo.color,
                            'text-xs font-medium'
                          )}>
                            {riskInfo.level} Risk
                          </span>
                        </div>
                      </div>
                    </div>
                    <ArrowRightIcon className="h-5 w-5 text-neutral-400 dark:text-secondary-500" />
                  </div>
                );
              })}
            </div>
          )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6 sm:space-y-8">
          {/* Upcoming Deadlines */}
          <Card variant="bordered">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upcoming Deadlines</CardTitle>
                <BellIcon className="h-5 w-5 text-neutral-400 dark:text-secondary-500" />
              </div>
            </CardHeader>
            <CardContent>

            <div className="space-y-4">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-secondary-400 text-center py-4">No upcoming deadlines</p>
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
                        <p className="text-sm font-medium text-neutral-900 dark:text-secondary-100">{deadline.title}</p>
                        <p className="text-xs text-neutral-500 dark:text-secondary-400">{deadline.contractName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={classNames(
                        deadline.daysUntil <= 7 ? 'text-red-600 font-medium' : 'text-neutral-500 dark:text-secondary-400',
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
          <Card variant="bordered">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Compliance Alerts</CardTitle>
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>

            <div className="space-y-4">
              {complianceIssues.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircleIcon className="mx-auto h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm text-green-600 font-medium">All contracts compliant</p>
                  <p className="text-xs text-neutral-500 dark:text-secondary-400">No compliance issues found</p>
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

          {/* Quick Actions */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-3">
              <Link
                to="/contracts/create"
                className="flex items-center justify-between p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-6 w-6 text-primary-600" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-secondary-100">Create Contract</span>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-primary-600 group-hover:text-primary-700" />
              </Link>
              
              <Link
                to="/team"
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <UsersIcon className="h-6 w-6 text-green-600" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-secondary-100">Manage Team</span>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-green-600 group-hover:text-green-700" />
              </Link>
              
              <Link
                to="/settings"
                className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-secondary-100">View Analytics</span>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-purple-600 group-hover:text-purple-700" />
              </Link>
            </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Compliance Dashboard */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
        {/* Compliance Breakdown */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>UK Legal Compliance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-secondary-300">GDPR Compliance</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-neutral-200 dark:bg-secondary-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '96%' }}></div>
                </div>
                <span className="text-sm font-medium text-neutral-900 dark:text-secondary-100 w-10">96%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-secondary-300">Employment Law</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-neutral-200 dark:bg-secondary-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
                <span className="text-sm font-medium text-neutral-900 dark:text-secondary-100 w-10">92%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-secondary-300">Commercial Terms</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-neutral-200 dark:bg-secondary-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '94%' }}></div>
                </div>
                <span className="text-sm font-medium text-neutral-900 dark:text-secondary-100 w-10">94%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-secondary-300">Consumer Rights</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-neutral-200 dark:bg-secondary-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '91%' }}></div>
                </div>
                <span className="text-sm font-medium text-neutral-900 dark:text-secondary-100 w-10">91%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{averageCompliance}%</div>
              <div className="text-sm text-gray-500">Overall Compliance Score</div>
              <p className="text-xs text-gray-400 mt-2">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          </CardContent>
        </Card>

        {/* Risk Assessment Summary */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Risk Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent>
          
          <div className="space-y-4">
            {contracts.slice(0, 3).map((contract) => {
              const riskInfo = getRiskLevel(contract.riskAssessment.overall);
              return (
                <div key={contract.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/contracts/${contract.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block"
                    >
                      {contract.name}
                    </Link>
                    <p className="text-xs text-gray-500">{contract.type.name}</p>
                  </div>
                  <div className="text-right ml-4">
                    <span className={classNames(
                      riskInfo.color,
                      'text-xs font-medium'
                    )}>
                      {riskInfo.level}
                    </span>
                    <p className="text-xs text-gray-500">{contract.riskAssessment.overall}%</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              to="/contracts"
              className="text-sm font-medium text-primary-600 hover:text-primary-500 flex items-center justify-center"
            >
              View detailed risk analysis
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <div className="mt-6 sm:mt-8 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-primary-200 p-4 sm:p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-base font-medium text-gray-900">AI Insights for Your Business</h4>
            <div className="mt-2 text-sm text-gray-600 space-y-2">
              <p>• Your contracts show excellent UK legal compliance with an average score of {averageCompliance}%</p>
              <p>• Consider setting up automated reminders for the {upcomingDeadlines.length} upcoming deadlines</p>
              <p>• {activeContracts} active contracts are generating positive business value</p>
              {complianceIssues.length > 0 && (
                <p>• {complianceIssues.length} minor compliance issues need attention for optimal protection</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}