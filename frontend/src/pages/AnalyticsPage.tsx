import { useState } from 'react';
import {
  ArrowDownTrayIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent, Button, Select } from '../components/ui';
import { classNames } from '../utils/classNames';

const timeRangeOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 3 months' },
  { value: '1y', label: 'Last year' },
];

// Mock data for analytics
const overviewMetrics = [
  {
    id: '1',
    name: 'Total Contracts',
    value: '127',
    change: '+12%',
    changeType: 'increase' as const,
    icon: DocumentTextIcon,
    description: 'All contracts created'
  },
  {
    id: '2', 
    name: 'Active Contracts',
    value: '89',
    change: '+8%',
    changeType: 'increase' as const,
    icon: CheckCircleIcon,
    description: 'Currently active contracts'
  },
  {
    id: '3',
    name: 'Avg. Compliance Score',
    value: '94%',
    change: '+3%',
    changeType: 'increase' as const,
    icon: ShieldCheckIcon,
    description: 'Average UK legal compliance'
  },
  {
    id: '4',
    name: 'Time Saved',
    value: '342 hrs',
    change: '+25%',
    changeType: 'increase' as const,
    icon: ClockIcon,
    description: 'Total time saved this month'
  }
];

const contractsByType = [
  { type: 'Professional Services', count: 45, percentage: 35.4, color: 'bg-blue-500' },
  { type: 'Employment Contracts', count: 32, percentage: 25.2, color: 'bg-green-500' },
  { type: 'Supplier Agreements', count: 28, percentage: 22.0, color: 'bg-purple-500' },
  { type: 'NDAs', count: 15, percentage: 11.8, color: 'bg-orange-500' },
  { type: 'Other', count: 7, percentage: 5.5, color: 'bg-gray-500' }
];

const complianceBreakdown = [
  { category: 'GDPR Compliance', score: 96, status: 'excellent', issues: 2 },
  { category: 'Employment Law', score: 92, status: 'good', issues: 5 },
  { category: 'Commercial Terms', score: 94, status: 'excellent', issues: 3 },
  { category: 'Consumer Rights', score: 91, status: 'good', issues: 4 }
];

const monthlyActivity = [
  { month: 'Jan', contracts: 18, compliance: 92 },
  { month: 'Feb', contracts: 22, compliance: 93 },
  { month: 'Mar', contracts: 19, compliance: 94 },
  { month: 'Apr', contracts: 25, compliance: 95 },
  { month: 'May', contracts: 28, compliance: 94 },
  { month: 'Jun', contracts: 35, compliance: 96 }
];

const riskAnalysis = [
  { level: 'Low Risk', count: 78, percentage: 61.4, color: 'text-green-600' },
  { level: 'Medium Risk', count: 35, percentage: 27.6, color: 'text-yellow-600' },
  { level: 'High Risk', count: 14, percentage: 11.0, color: 'text-red-600' }
];

const upcomingDeadlines = [
  { contract: 'Marketing Services - TechCorp', date: '2025-09-05', daysLeft: 5, type: 'Review Due' },
  { contract: 'Employment Contract - J. Smith', date: '2025-09-08', daysLeft: 8, type: 'Probation End' },
  { contract: 'Supplier Agreement - ABC Ltd', date: '2025-09-15', daysLeft: 15, type: 'Renewal Due' },
  { contract: 'NDA - StartupXYZ', date: '2025-09-22', daysLeft: 22, type: 'Expiry' }
];

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
  const [timeRange, setTimeRange] = useState('30d');

  const handleExportReport = () => {
    // Mock export functionality
    const reportData = {
      overview: overviewMetrics,
      contractTypes: contractsByType,
      compliance: complianceBreakdown,
      activity: monthlyActivity,
      risks: riskAnalysis,
      deadlines: upcomingDeadlines
    };
    
    const jsonData = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pactoria-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Track contract performance, compliance metrics, and business insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={timeRangeOptions}
          />
          <Button
            variant="secondary"
            icon={<ArrowDownTrayIcon className="h-4 w-4" />}
            onClick={handleExportReport}
          >
            Export Report
          </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Contract Types Distribution */}
        <Card variant="bordered" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contracts by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contractsByType.map((type) => (
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
            <CardTitle>Risk Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskAnalysis.map((risk) => (
                <div key={risk.level} className="flex items-center justify-between">
                  <span className={classNames('text-sm font-medium', risk.color)}>{risk.level}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">{risk.count}</span>
                    <span className="text-xs text-gray-500">({risk.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-800">Risk Insight</p>
                  <p className="text-xs text-blue-600 mt-1">
                    14 high-risk contracts need attention. Review recommendations in the details view.
                  </p>
                </div>
              </div>
            </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Activity */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Monthly Activity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-500 mb-4">
                <span>Contracts Created</span>
                <span>Avg. Compliance</span>
              </div>
              {monthlyActivity.map((month) => (
                <div key={month.month} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <span className="text-sm font-medium text-gray-900 w-8">{month.month}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${(month.contracts / 35) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-900 w-8">{month.contracts}</span>
                  </div>
                  <div className="ml-6">
                    <span className={classNames(
                      'text-sm font-medium',
                      getStatusColor(getComplianceStatus(month.compliance))
                    )}>
                      {month.compliance}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card variant="bordered">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Deadlines</CardTitle>
              <Button variant="ghost" size="sm" icon={<EyeIcon className="h-4 w-4" />}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={classNames(
                      'w-2 h-2 rounded-full',
                      deadline.daysLeft <= 7 ? 'bg-red-500' : deadline.daysLeft <= 15 ? 'bg-yellow-500' : 'bg-green-500'
                    )} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-40">
                        {deadline.contract}
                      </p>
                      <p className="text-xs text-gray-500">{deadline.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={classNames(
                      'text-xs font-medium',
                      deadline.daysLeft <= 7 ? 'text-red-600' : deadline.daysLeft <= 15 ? 'text-yellow-600' : 'text-green-600'
                    )}>
                      {deadline.daysLeft} days
                    </p>
                    <p className="text-xs text-gray-500">{new Date(deadline.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}