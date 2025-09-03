import { useState, useEffect, useCallback } from 'react';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  UserIcon,
  EyeIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ShieldCheckIcon,
  ClockIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, Input, Select, Badge } from '../components/ui';
import { classNames } from '../utils/classNames';
import { textColors, textStyles } from '../utils/typography';
import { AuditService } from '../services/api';
import { getErrorMessage } from '../utils/errorHandling';
import { useToast } from '../contexts/ToastContext';

interface AuditEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  details: string;
  ip_address: string;
  user_agent: string;
  location?: string;
  risk_level: string;
  compliance_flag: boolean;
  metadata?: Record<string, any>;
}


const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'view', label: 'View' },
  { value: 'edit', label: 'Edit' },
  { value: 'delete', label: 'Delete' },
  { value: 'sign', label: 'Sign' },
  { value: 'export', label: 'Export' },
  { value: 'share', label: 'Share' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'archive', label: 'Archive' },
];

const resourceTypeOptions = [
  { value: '', label: 'All Resources' },
  { value: 'contract', label: 'Contracts' },
  { value: 'template', label: 'Templates' },
  { value: 'user', label: 'Users' },
  { value: 'setting', label: 'Settings' },
  { value: 'integration', label: 'Integrations' },
  { value: 'report', label: 'Reports' },
];

const riskLevelOptions = [
  { value: '', label: 'All Risk Levels' },
  { value: 'low', label: 'Low Risk' },
  { value: 'medium', label: 'Medium Risk' },
  { value: 'high', label: 'High Risk' },
];

const timeRangeOptions = [
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

function getActionIcon(action: AuditEntry['action']) {
  switch (action) {
    case 'create':
      return PlusIcon;
    case 'view':
      return EyeIcon;
    case 'edit':
      return PencilIcon;
    case 'delete':
      return TrashIcon;
    case 'sign':
      return CheckCircleIcon;
    case 'export':
      return ArrowDownTrayIcon;
    case 'share':
      return DocumentDuplicateIcon;
    case 'approve':
      return CheckCircleIcon;
    case 'reject':
      return ExclamationTriangleIcon;
    case 'archive':
      return DocumentTextIcon;
    default:
      return InformationCircleIcon;
  }
}

function getActionColor(action: AuditEntry['action']) {
  switch (action) {
    case 'create':
      return 'text-success-700 dark:text-success-300 bg-success-100 dark:bg-success-900/20';
    case 'view':
      return 'text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/20';
    case 'edit':
      return 'text-warning-700 dark:text-warning-300 bg-warning-100 dark:bg-warning-900/20';
    case 'delete':
      return 'text-danger-700 dark:text-danger-300 bg-danger-100 dark:bg-danger-900/20';
    case 'sign':
      return 'text-success-700 dark:text-success-300 bg-success-100 dark:bg-success-900/20';
    case 'export':
      return 'text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/20';
    case 'share':
      return 'text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/20';
    case 'approve':
      return 'text-success-700 dark:text-success-300 bg-success-100 dark:bg-success-900/20';
    case 'reject':
      return 'text-danger-700 dark:text-danger-300 bg-danger-100 dark:bg-danger-900/20';
    case 'archive':
      return 'text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800';
    default:
      return 'text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800';
  }
}

function getRiskLevelColor(riskLevel: AuditEntry['riskLevel']) {
  switch (riskLevel) {
    case 'low':
      return 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-700';
    case 'medium':
      return 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-700';
    case 'high':
      return 'text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-700';
    default:
      return 'text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700';
  }
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export default function AuditTrailPage() {
  const { showToast } = useToast();
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [auditStats, setAuditStats] = useState({
    total_events: 0,
    high_risk_events: 0,
    compliance_flags: 0,
    events_today: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('');
  const [timeRange, setTimeRange] = useState('24h');

  // Fetch audit entries
  const fetchAuditEntries = useCallback(async (params: {
    page?: number;
    size?: number;
    user_id?: string;
    action?: string;
    resource_type?: string;
    risk_level?: string;
    compliance_flag?: boolean;
    search?: string;
    date_from?: string;
    date_to?: string;
  } = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await AuditService.getAuditEntries({
        page: params.page || 1,
        size: params.size || 20,
        ...(params.action && { action: params.action }),
        ...(params.resource_type && { resource_type: params.resource_type }),
        ...(params.risk_level && { risk_level: params.risk_level }),
        ...(params.search && { search: params.search }),
      });
      
      setAuditEntries(response.entries);
      setPagination({
        total: response.total,
        page: response.page,
        size: response.size,
        pages: response.pages,
      });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Fetch audit stats
  const fetchAuditStats = useCallback(async () => {
    try {
      const stats = await AuditService.getAuditStats();
      setAuditStats(stats);
    } catch (err) {
      console.error('Failed to fetch audit stats:', getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    fetchAuditEntries();
    fetchAuditStats();
  }, [fetchAuditEntries, fetchAuditStats]);

  useEffect(() => {
    const params: any = {};
    
    if (searchQuery) params.search = searchQuery;
    if (actionFilter) params.action = actionFilter;
    if (resourceTypeFilter) params.resource_type = resourceTypeFilter;
    if (riskLevelFilter) params.risk_level = riskLevelFilter;
    
    fetchAuditEntries(params);
  }, [searchQuery, actionFilter, resourceTypeFilter, riskLevelFilter, fetchAuditEntries]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleExportAuditLog = useCallback(async () => {
    try {
      const response = await AuditService.exportAuditEntries({
        filters: {
          ...(searchQuery && { search: searchQuery }),
          ...(actionFilter && { action: actionFilter }),
          ...(resourceTypeFilter && { resource_type: resourceTypeFilter }),
          ...(riskLevelFilter && { risk_level: riskLevelFilter }),
        },
        format: 'JSON',
        include_metadata: true,
      });
      
      if (response.download_url) {
        window.open(response.download_url, '_blank');
      } else {
        // Fallback to client-side export
        const exportData = auditEntries.map(entry => ({
          timestamp: entry.timestamp,
          user: entry.user_name,
          action: entry.action,
          resource: entry.resource_name,
          details: entry.details,
          ipAddress: entry.ip_address,
          riskLevel: entry.risk_level,
          complianceFlag: entry.compliance_flag
        }));
        
        const jsonData = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pactoria-audit-log-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
      
      showToast('Audit log exported successfully', 'success');
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      showToast(errorMessage, 'error');
    }
  }, [auditEntries, searchQuery, actionFilter, resourceTypeFilter, riskLevelFilter, showToast]);

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className={textStyles.pageTitle}>Audit Trail</h1>
          <p className={classNames('mt-1 sm:mt-2 text-sm sm:text-base', textColors.secondary)}>
            Complete activity log for compliance and security monitoring
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
            onClick={handleExportAuditLog}
          >
            Export Log
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 mb-8">
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={classNames('text-xs sm:text-sm font-medium', textColors.muted)}>Total Events</p>
              <p className={classNames('text-xl sm:text-2xl font-bold mt-1', textColors.primary)}>{auditStats.total_events}</p>
            </div>
            <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={classNames('text-xs sm:text-sm font-medium', textColors.muted)}>High Risk</p>
              <p className={classNames('text-xl sm:text-2xl font-bold mt-1', textColors.primary)}>{auditStats.high_risk_events}</p>
            </div>
            <ExclamationTriangleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={classNames('text-xs sm:text-sm font-medium', textColors.muted)}>Compliance Flags</p>
              <p className={classNames('text-xl sm:text-2xl font-bold mt-1', textColors.primary)}>{auditStats.compliance_flags}</p>
            </div>
            <ShieldCheckIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={classNames('text-xs sm:text-sm font-medium', textColors.muted)}>Last 24h</p>
              <p className={classNames('text-xl sm:text-2xl font-bold mt-1', textColors.primary)}>{auditStats.events_today}</p>
            </div>
            <ClockIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6" padding="md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input
            placeholder="Search audit trail..."
            leftIcon={<MagnifyingGlassIcon />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            placeholder="Action"
            options={actionOptions}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
          <Select
            placeholder="Resource Type"
            options={resourceTypeOptions}
            value={resourceTypeFilter}
            onChange={(e) => setResourceTypeFilter(e.target.value)}
          />
          <Select
            placeholder="Risk Level"
            options={riskLevelOptions}
            value={riskLevelFilter}
            onChange={(e) => setRiskLevelFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="mb-4 text-red-600 text-sm">
          Error: {error}
          <button 
            onClick={clearError} 
            className="ml-2 text-blue-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className={classNames('text-sm', textColors.muted)}>
          Showing {auditEntries.length} of {pagination.total} audit entries
        </p>
      </div>

      {/* Audit Trail List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="flex items-center space-x-4 p-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-gray-200 rounded-lg w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : auditEntries.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className={classNames('mt-2 text-sm font-medium', textColors.primary)}>No audit entries found</h3>
            <p className={classNames('mt-1 text-sm', textColors.secondary)}>
              Try adjusting your search or filter criteria.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {auditEntries.map((entry) => {
            const ActionIcon = getActionIcon(entry.action);
            return (
              <Card 
                key={entry.id} 
                variant="bordered" 
                className={classNames(
                  'transition-all duration-200 hover:shadow-md',
                  entry.compliance_flag && 'ring-2 ring-warning-200 dark:ring-warning-700 bg-warning-50/20 dark:bg-warning-900/10',
                  entry.risk_level === 'high' && 'ring-2 ring-danger-200 dark:ring-danger-700 bg-danger-50/20 dark:bg-danger-900/10'
                )}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={classNames(
                        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                        entry.risk_level === 'high' ? 'bg-danger-100 dark:bg-danger-900/20' : 
                        entry.risk_level === 'medium' ? 'bg-warning-100 dark:bg-warning-900/20' : 'bg-neutral-100 dark:bg-neutral-800'
                      )}>
                        <ActionIcon className={classNames(
                          'h-5 w-5',
                          entry.risk_level === 'high' ? 'text-danger-600 dark:text-danger-400' : 
                          entry.risk_level === 'medium' ? 'text-warning-600 dark:text-warning-400' : 'text-neutral-600 dark:text-neutral-400'
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={classNames('text-xs', getActionColor(entry.action))}>
                            {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                          </Badge>
                          <Badge variant="default" className={classNames('text-xs', textColors.secondary, 'bg-neutral-100 dark:bg-neutral-800')}>
                            {entry.resource_type.charAt(0).toUpperCase() + entry.resource_type.slice(1)}
                          </Badge>
                          <span className={classNames(
                            'text-xs px-2 py-1 rounded border font-medium',
                            getRiskLevelColor(entry.risk_level)
                          )}>
                            {entry.risk_level.charAt(0).toUpperCase() + entry.risk_level.slice(1)} Risk
                          </span>
                          {entry.compliance_flag && (
                            <Badge variant="warning" className="text-xs">
                              Compliance Flag
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className={classNames('text-sm font-medium mb-1', textColors.primary)}>
                          {entry.user_name} {entry.action}d {entry.resource_name}
                        </h3>
                        
                        <p className={classNames('text-sm mb-3', textColors.secondary)}>
                          {entry.details}
                        </p>
                        
                        <div className={classNames('grid grid-cols-2 md:grid-cols-4 gap-4 text-xs', textColors.muted)}>
                          <div className="flex items-center space-x-1">
                            <UserIcon className="h-3 w-3" />
                            <span>{entry.user_role}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-3 w-3" />
                            <span>{formatTimestamp(entry.timestamp)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>🌐</span>
                            <span>{entry.ip_address}</span>
                          </div>
                          {entry.location && (
                            <div className="flex items-center space-x-1">
                              <span>📍</span>
                              <span>{entry.location}</span>
                            </div>
                          )}
                        </div>

                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                          <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                            <h4 className={classNames('text-xs font-medium mb-2', textColors.secondary)}>Additional Details</h4>
                            <div className="space-y-1">
                              {Object.entries(entry.metadata).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-xs">
                                  <span className={classNames('capitalize', textColors.muted)}>
                                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                                  </span>
                                  <span className={textColors.secondary}>
                                    {Array.isArray(value) ? value.join(', ') : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-1"
                        icon={<EyeIcon className="h-4 w-4" />}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}