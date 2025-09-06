import { useState, useEffect, useCallback } from 'react';
import {
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui';
import { classNames } from '../utils/classNames';
import { AnalyticsService } from '../services/api';
import { getErrorMessage } from '../utils/errorHandling';
import { useToast } from '../contexts/ToastContext';







function getStatusColor(status: string) {
  switch (status) {
    case 'excellent':
      return 'text-green-600';
    case 'good':
      return 'text-yellow-600';
    case 'needs-improvement':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

function getComplianceStatus(score: number) {
  if (score >= 95) return 'excellent';
  if (score >= 90) return 'good';
  return 'needs-improvement';
}

export default function AnalyticsPage() {
  const { showToast } = useToast();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard analytics
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await AnalyticsService.getDashboard();
      setDashboardData(data);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Track contract performance, compliance metrics, and business insights
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} variant="bordered" className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} variant="bordered" className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading analytics</h3>
          <p className="mt-1 text-sm text-gray-500">{error || 'Failed to load dashboard data'}</p>
          <Button
            onClick={fetchDashboardData}
            className="mt-4"
            icon={<ArrowTrendingUpIcon className="h-4 w-4" />}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Extract data from backend response
  const businessMetrics = dashboardData.business_metrics || {};
  const complianceMetrics = dashboardData.compliance_metrics || {};
  const contractTypes = dashboardData.contract_types || [];
  const contractValueTrend = dashboardData.contract_value_trend || {};
  const recentContractsTrend = dashboardData.recent_contracts_trend || {};

  // Prepare overview metrics from backend data
  const overviewMetrics = [
    {
      id: '1',
      name: 'Total Contracts',
      value: businessMetrics.total_contracts?.toString() || '0',
      change: businessMetrics.growth_rate ? `${businessMetrics.growth_rate > 0 ? '+' : ''}${businessMetrics.growth_rate.toFixed(1)}%` : '0%',
      changeType: (businessMetrics.growth_rate || 0) >= 0 ? 'increase' : 'decrease',
      icon: DocumentTextIcon,
      description: 'All contracts in system'
    },
    {
      id: '2',
      name: 'Active Contracts',
      value: businessMetrics.active_contracts?.toString() || '0',
      change: businessMetrics.contracts_this_month ? `+${businessMetrics.contracts_this_month}` : '0',
      changeType: 'increase' as const,
      icon: CheckCircleIcon,
      description: 'Currently active contracts'
    },
    {
      id: '3',
      name: 'Avg. Compliance',
      value: complianceMetrics.overall_compliance_average ? `${Math.round(complianceMetrics.overall_compliance_average)}%` : '0%',
      change: complianceMetrics.compliance_trend === 'improving' ? '+2%' : complianceMetrics.compliance_trend === 'declining' ? '-1%' : '0%',
      changeType: complianceMetrics.compliance_trend === 'improving' ? 'increase' : 'decrease',
      icon: ShieldCheckIcon,
      description: 'Average compliance score'
    },
    {
      id: '4',
      name: 'Contract Value',
      value: businessMetrics.total_contract_value ? `£${(businessMetrics.total_contract_value / 1000).toFixed(0)}k` : '£0',
      change: contractValueTrend.trend_percentage ? `${contractValueTrend.trend_percentage > 0 ? '+' : ''}${contractValueTrend.trend_percentage.toFixed(1)}%` : '0%',
      changeType: (contractValueTrend.trend_percentage || 0) >= 0 ? 'increase' : 'decrease',
      icon: ClockIcon,
      description: 'Total portfolio value'
    }
  ];

  // Prepare contract types data
  const contractsByType = contractTypes.map((type: any, index: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500'];
    return {
      type: type.contract_type,
      count: type.count,
      percentage: type.percentage,
      color: colors[index % colors.length]
    };
  });

  // Prepare compliance breakdown
  const complianceBreakdown = [
    { category: 'GDPR Compliance', score: Math.round(complianceMetrics.gdpr_compliance_average || 0), status: getComplianceStatus(complianceMetrics.gdpr_compliance_average || 0), issues: 0 },
    { category: 'Employment Law', score: Math.round(complianceMetrics.employment_law_compliance_average || 0), status: getComplianceStatus(complianceMetrics.employment_law_compliance_average || 0), issues: 0 },
    { category: 'Commercial Terms', score: Math.round(complianceMetrics.commercial_terms_compliance_average || 0), status: getComplianceStatus(complianceMetrics.commercial_terms_compliance_average || 0), issues: 0 },
    { category: 'Consumer Rights', score: Math.round(complianceMetrics.consumer_rights_compliance_average || 0), status: getComplianceStatus(complianceMetrics.consumer_rights_compliance_average || 0), issues: 0 }
  ];

  // Prepare risk analysis
  const riskAnalysis = [
    {
      level: 'Low Risk',
      count: complianceMetrics.low_risk_contracts_count || 0,
      percentage: businessMetrics.total_contracts ? ((complianceMetrics.low_risk_contracts_count || 0) / businessMetrics.total_contracts * 100) : 0,
      color: 'text-green-600'
    },
    {
      level: 'Medium Risk',
      count: complianceMetrics.medium_risk_contracts_count || 0,
      percentage: businessMetrics.total_contracts ? ((complianceMetrics.medium_risk_contracts_count || 0) / businessMetrics.total_contracts * 100) : 0,
      color: 'text-yellow-600'
    },
    {
      level: 'High Risk',
      count: complianceMetrics.high_risk_contracts_count || 0,
      percentage: businessMetrics.total_contracts ? ((complianceMetrics.high_risk_contracts_count || 0) / businessMetrics.total_contracts * 100) : 0,
      color: 'text-red-600'
    }
  ];

  // Prepare monthly activity from trends data
  const monthlyActivity = recentContractsTrend.data_points?.slice(-6).map((point: any) => ({
    month: new Date(point.date).toLocaleDateString('en-US', { month: 'short' }),
    contracts: point.count || point.value || 0,
    compliance: Math.round(complianceMetrics.overall_compliance_average || 0)
  })) || [];

  // Mock upcoming deadlines (since this isn't in the API)
  const upcomingDeadlines = [
    { contract: 'Next contract review', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), daysLeft: 7, type: 'Review Due' },
    { contract: 'Contract renewal', date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), daysLeft: 14, type: 'Renewal Due' }
  ];

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Contract Overview</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Monitor your UK contracts and compliance status
          </p>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 mb-8">
        {overviewMetrics.map((metric) => (
          <Card key={metric.id} variant="bordered" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500">{metric.name}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                <div className={classNames(
                  'flex items-center text-xs sm:text-sm font-medium mt-1',
                  metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                )}>
                  {metric.changeType === 'increase' ? (
                    <ArrowTrendingUpIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  )}
                  {metric.change}
                </div>
              </div>
              <div className="flex-shrink-0">
                <metric.icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Contract Types Distribution */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>UK Contract Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contractsByType.map((type: any) => (
                <div key={type.type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={classNames('w-3 h-3 rounded-full', type.color)} />
                    <span className="text-sm font-medium text-gray-900">{type.type}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">{type.count}</span>
                    <span className="text-sm font-medium text-gray-900">{type.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Analysis */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Risk Assessment (1-10 Scale)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskAnalysis.map((risk) => (
                <div key={risk.level} className="flex items-center justify-between">
                  <span className={classNames('text-sm font-medium', risk.color)}>{risk.level}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">{risk.count}</span>
                    <span className="text-xs text-gray-500">({risk.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
            {riskAnalysis.find(r => r.level === 'High Risk')?.count > 0 && (
              <div className="mt-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start space-x-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800">UK Compliance Alert</p>
                    <p className="text-xs text-amber-700 mt-1">
                      {riskAnalysis.find(r => r.level === 'High Risk')?.count} contracts require review for UK legal compliance.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance Breakdown */}
      <Card variant="bordered" className="mb-8">
        <CardHeader>
          <CardTitle>UK Legal Compliance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {complianceBreakdown.map((item) => (
              <div key={item.category} className="text-center">
                <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      stroke="#e5e7eb"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      stroke="#3b82f6"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${item.score * 1.88} 188`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-lg font-bold text-gray-900">{item.score}%</span>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">{item.category}</h3>
                <p className={classNames('text-xs font-medium capitalize', getStatusColor(item.status))}>
                  {item.status.replace('-', ' ')}
                </p>
                <p className="text-xs text-gray-500 mt-1">{item.issues} issues</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* UK Compliance Quick Actions */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Quick Actions for UK SMEs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-blue-900">Create Contract</h4>
                    <p className="text-sm text-blue-700">Generate UK-compliant contracts</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <ShieldCheckIcon className="h-8 w-8 text-green-600" />
                  <div>
                    <h4 className="font-medium text-green-900">Check Compliance</h4>
                    <p className="text-sm text-green-700">Review UK legal requirements</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center space-x-3">
                  <ClockIcon className="h-8 w-8 text-amber-600" />
                  <div>
                    <h4 className="font-medium text-amber-900">Review Deadlines</h4>
                    <p className="text-sm text-amber-700">Track important dates</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}