import { useState } from 'react';
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

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'create' | 'view' | 'edit' | 'delete' | 'sign' | 'export' | 'share' | 'approve' | 'reject' | 'archive';
  resourceType: 'contract' | 'template' | 'user' | 'setting' | 'integration' | 'report';
  resourceId: string;
  resourceName: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  riskLevel: 'low' | 'medium' | 'high';
  complianceFlag?: boolean;
  metadata?: Record<string, any>;
}

const mockAuditEntries: AuditEntry[] = [
  {
    id: '1',
    timestamp: '2025-08-30T15:30:00Z',
    userId: 'user-123',
    userName: 'Sarah Johnson',
    userRole: 'Contract Manager',
    action: 'sign',
    resourceType: 'contract',
    resourceId: 'contract-456',
    resourceName: 'Marketing Services Agreement - TechCorp',
    details: 'Contract electronically signed using DocuSign integration',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'London, UK',
    riskLevel: 'low',
    complianceFlag: false,
    metadata: { signatureMethod: 'DocuSign', documentVersion: '2.1' }
  },
  {
    id: '2',
    timestamp: '2025-08-30T14:45:00Z',
    userId: 'user-789',
    userName: 'Michael Chen',
    userRole: 'Legal Counsel',
    action: 'edit',
    resourceType: 'contract',
    resourceId: 'contract-789',
    resourceName: 'Employment Contract - Jane Smith',
    details: 'Updated salary terms and benefits section',
    ipAddress: '10.0.0.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    location: 'Manchester, UK',
    riskLevel: 'medium',
    complianceFlag: true,
    metadata: { fieldsModified: ['salary', 'benefits', 'startDate'], previousVersion: '1.3' }
  },
  {
    id: '3',
    timestamp: '2025-08-30T13:20:00Z',
    userId: 'user-456',
    userName: 'Emma Wilson',
    userRole: 'HR Manager',
    action: 'create',
    resourceType: 'contract',
    resourceId: 'contract-101',
    resourceName: 'Consultant Agreement - Alex Brown',
    details: 'New consultant agreement created using Professional Services template',
    ipAddress: '172.16.0.5',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'Edinburgh, UK',
    riskLevel: 'low',
    complianceFlag: false,
    metadata: { templateUsed: 'professional-services-v3', estimatedValue: '£25000' }
  },
  {
    id: '4',
    timestamp: '2025-08-30T12:15:00Z',
    userId: 'user-321',
    userName: 'David Thompson',
    userRole: 'Finance Director',
    action: 'export',
    resourceType: 'report',
    resourceId: 'report-202',
    resourceName: 'Q3 Contract Analytics Report',
    details: 'Exported quarterly analytics report in PDF format',
    ipAddress: '192.168.1.50',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    location: 'Birmingham, UK',
    riskLevel: 'medium',
    complianceFlag: false,
    metadata: { exportFormat: 'PDF', reportPeriod: 'Q3-2025', recordCount: 127 }
  },
  {
    id: '5',
    timestamp: '2025-08-30T11:30:00Z',
    userId: 'system',
    userName: 'System',
    userRole: 'System',
    action: 'archive',
    resourceType: 'contract',
    resourceId: 'contract-555',
    resourceName: 'Expired NDA - StartupXYZ',
    details: 'Contract automatically archived due to expiration',
    ipAddress: 'internal',
    userAgent: 'Pactoria-System/1.0',
    riskLevel: 'low',
    complianceFlag: false,
    metadata: { reason: 'expiration', expiryDate: '2025-08-30', autoAction: true }
  },
  {
    id: '6',
    timestamp: '2025-08-30T10:45:00Z',
    userId: 'user-789',
    userName: 'Michael Chen',
    userRole: 'Legal Counsel',
    action: 'reject',
    resourceType: 'contract',
    resourceId: 'contract-666',
    resourceName: 'Supplier Agreement - ABC Ltd',
    details: 'Contract rejected due to non-compliant liability clauses',
    ipAddress: '10.0.0.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    location: 'Manchester, UK',
    riskLevel: 'high',
    complianceFlag: true,
    metadata: { rejectionReason: 'liability-clauses', complianceIssues: ['unlimited-liability', 'indemnity-scope'] }
  },
  {
    id: '7',
    timestamp: '2025-08-30T09:20:00Z',
    userId: 'user-999',
    userName: 'Admin User',
    userRole: 'System Administrator',
    action: 'edit',
    resourceType: 'user',
    resourceId: 'user-888',
    resourceName: 'Robert Davis',
    details: 'Updated user permissions and role assignment',
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'London, UK',
    riskLevel: 'high',
    complianceFlag: true,
    metadata: { previousRole: 'Viewer', newRole: 'Contract Manager', permissionsGranted: ['edit', 'approve'] }
  },
  {
    id: '8',
    timestamp: '2025-08-30T08:15:00Z',
    userId: 'user-456',
    userName: 'Emma Wilson',
    userRole: 'HR Manager',
    action: 'view',
    resourceType: 'contract',
    resourceId: 'contract-777',
    resourceName: 'Confidentiality Agreement - TechStart',
    details: 'Accessed contract for review and compliance check',
    ipAddress: '172.16.0.5',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'Edinburgh, UK',
    riskLevel: 'low',
    complianceFlag: false,
    metadata: { accessReason: 'compliance-review', duration: '15-minutes' }
  }
];

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
  const [auditEntries] = useState<AuditEntry[]>(mockAuditEntries);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('');
  const [timeRange, setTimeRange] = useState('24h');

  // Filter audit entries
  const filteredEntries = auditEntries.filter(entry => {
    const matchesSearch = 
      entry.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.resourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.ipAddress.includes(searchQuery);
    
    const matchesAction = !actionFilter || entry.action === actionFilter;
    const matchesResourceType = !resourceTypeFilter || entry.resourceType === resourceTypeFilter;
    const matchesRiskLevel = !riskLevelFilter || entry.riskLevel === riskLevelFilter;

    // Time range filtering would be implemented here
    return matchesSearch && matchesAction && matchesResourceType && matchesRiskLevel;
  });

  const highRiskEntries = auditEntries.filter(e => e.riskLevel === 'high');
  const complianceFlags = auditEntries.filter(e => e.complianceFlag);
  const recentEntries = auditEntries.filter(e => {
    const entryTime = new Date(e.timestamp).getTime();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return entryTime > oneDayAgo;
  });

  const handleExportAuditLog = () => {
    const exportData = filteredEntries.map(entry => ({
      timestamp: entry.timestamp,
      user: entry.userName,
      action: entry.action,
      resource: entry.resourceName,
      details: entry.details,
      ipAddress: entry.ipAddress,
      riskLevel: entry.riskLevel,
      complianceFlag: entry.complianceFlag
    }));
    
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pactoria-audit-log-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
              <p className={classNames('text-xl sm:text-2xl font-bold mt-1', textColors.primary)}>{auditEntries.length}</p>
            </div>
            <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={classNames('text-xs sm:text-sm font-medium', textColors.muted)}>High Risk</p>
              <p className={classNames('text-xl sm:text-2xl font-bold mt-1', textColors.primary)}>{highRiskEntries.length}</p>
            </div>
            <ExclamationTriangleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={classNames('text-xs sm:text-sm font-medium', textColors.muted)}>Compliance Flags</p>
              <p className={classNames('text-xl sm:text-2xl font-bold mt-1', textColors.primary)}>{complianceFlags.length}</p>
            </div>
            <ShieldCheckIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
          </div>
        </Card>
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={classNames('text-xs sm:text-sm font-medium', textColors.muted)}>Last 24h</p>
              <p className={classNames('text-xl sm:text-2xl font-bold mt-1', textColors.primary)}>{recentEntries.length}</p>
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

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className={classNames('text-sm', textColors.muted)}>
          Showing {filteredEntries.length} of {auditEntries.length} audit entries
        </p>
      </div>

      {/* Audit Trail List */}
      {filteredEntries.length === 0 ? (
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
          {filteredEntries.map((entry) => {
            const ActionIcon = getActionIcon(entry.action);
            return (
              <Card 
                key={entry.id} 
                variant="bordered" 
                className={classNames(
                  'transition-all duration-200 hover:shadow-md',
                  entry.complianceFlag && 'ring-2 ring-warning-200 dark:ring-warning-700 bg-warning-50/20 dark:bg-warning-900/10',
                  entry.riskLevel === 'high' && 'ring-2 ring-danger-200 dark:ring-danger-700 bg-danger-50/20 dark:bg-danger-900/10'
                )}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={classNames(
                        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                        entry.riskLevel === 'high' ? 'bg-danger-100 dark:bg-danger-900/20' : 
                        entry.riskLevel === 'medium' ? 'bg-warning-100 dark:bg-warning-900/20' : 'bg-neutral-100 dark:bg-neutral-800'
                      )}>
                        <ActionIcon className={classNames(
                          'h-5 w-5',
                          entry.riskLevel === 'high' ? 'text-danger-600 dark:text-danger-400' : 
                          entry.riskLevel === 'medium' ? 'text-warning-600 dark:text-warning-400' : 'text-neutral-600 dark:text-neutral-400'
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={classNames('text-xs', getActionColor(entry.action))}>
                            {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                          </Badge>
                          <Badge variant="default" className={classNames('text-xs', textColors.secondary, 'bg-neutral-100 dark:bg-neutral-800')}>
                            {entry.resourceType.charAt(0).toUpperCase() + entry.resourceType.slice(1)}
                          </Badge>
                          <span className={classNames(
                            'text-xs px-2 py-1 rounded border font-medium',
                            getRiskLevelColor(entry.riskLevel)
                          )}>
                            {entry.riskLevel.charAt(0).toUpperCase() + entry.riskLevel.slice(1)} Risk
                          </span>
                          {entry.complianceFlag && (
                            <Badge variant="warning" className="text-xs">
                              Compliance Flag
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className={classNames('text-sm font-medium mb-1', textColors.primary)}>
                          {entry.userName} {entry.action}d {entry.resourceName}
                        </h3>
                        
                        <p className={classNames('text-sm mb-3', textColors.secondary)}>
                          {entry.details}
                        </p>
                        
                        <div className={classNames('grid grid-cols-2 md:grid-cols-4 gap-4 text-xs', textColors.muted)}>
                          <div className="flex items-center space-x-1">
                            <UserIcon className="h-3 w-3" />
                            <span>{entry.userRole}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-3 w-3" />
                            <span>{formatTimestamp(entry.timestamp)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>🌐</span>
                            <span>{entry.ipAddress}</span>
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