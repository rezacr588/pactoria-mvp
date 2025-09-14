import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useContracts } from '../hooks';
import {
  ArrowLeftIcon,
  PencilIcon,
  ArrowDownTrayIcon as DownloadIcon,
  ShareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentIcon,
  UserIcon,
  CalendarIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ChevronDownIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import AIGenerationLoading from '../components/loading/AIGenerationLoading';

function getComplianceColor(score: number) {
  if (score >= 90) return 'text-green-600 bg-green-100';
  if (score >= 80) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

function getRiskColor(score: number) {
  if (score <= 30) return 'text-green-600 bg-green-100 border-green-200';
  if (score <= 60) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
  return 'text-red-600 bg-red-100 border-red-200';
}

function getRiskLevel(score: number) {
  if (score <= 30) return 'Low';
  if (score <= 60) return 'Medium';
  return 'High';
}

const statusConfig = {
  draft: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: DocumentIcon },
  review: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: ClockIcon },
  approved: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: CheckCircleIcon },
  signed: { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircleIcon },
  active: { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircleIcon },
  expired: { color: 'text-red-600', bgColor: 'bg-red-100', icon: ExclamationTriangleIcon },
  terminated: { color: 'text-red-600', bgColor: 'bg-red-100', icon: ExclamationTriangleIcon },
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ContractViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedContract, isLoading, error, fetchContract, generateContent, analyzeCompliance, clearError } = useContracts();
  const [activeTab, setActiveTab] = useState('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Use ref to store fetchContract to avoid infinite loop
  const fetchContractRef = useRef(fetchContract);
  fetchContractRef.current = fetchContract;

  useEffect(() => {
    if (id) {
      fetchContractRef.current(id);
    }
  }, [id, fetchContractRef]);

  // Export functionality - define before any conditional returns
  const handleExport = useCallback(async (format: 'pdf' | 'docx' | 'txt') => {
    try {
      const content = selectedContract?.final_content || selectedContract?.generated_content || 'No content available';
      const title = selectedContract?.title || 'Contract';
      
      if (format === 'txt') {
        // Simple text export
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // For PDF and DOCX, we would typically call a backend endpoint
        // For now, we'll show a notification that the feature is coming soon
        alert(`${format.toUpperCase()} export feature is coming soon!`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  }, [selectedContract?.final_content, selectedContract?.generated_content, selectedContract?.title]);

  // Use selectedContract from the hook or create a default object
  const contract = selectedContract || {
    id: id || '',
    title: 'Loading...',
    contract_type: 'unknown',
    status: 'draft',
    currency: 'USD',
    version: 1,
    is_current_version: true,
    company_id: '',
    created_by: '',
    created_at: new Date().toISOString(),
    client_name: '',
    client_email: '',
    supplier_name: '',
    contract_value: 0,
    start_date: '',
    end_date: '',
    parties: [],
    deadlines: [],
    tags: [],
    complianceScore: 0,
    riskAssessment: {
      overall: 0,
      factors: [],
      recommendations: [],
      lastUpdated: new Date()
    }
  };

  // Handler functions
  const handleGenerateContent = useCallback(async () => {
    if (!contract.id) return;
    
    setIsGenerating(true);
    try {
      await generateContent(contract.id, false);
      // Refresh the contract to get the updated content
      await fetchContract(contract.id);
    } catch (error) {
      console.error('Failed to generate content:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [contract.id, generateContent, fetchContract, setIsGenerating]);

  const statusInfo = statusConfig[contract.status as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = statusInfo.icon;
  const riskLevel = contract.riskAssessment ? getRiskLevel(contract.riskAssessment.overall || 0) : 'Low';

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'compliance', name: 'Compliance' },
    { id: 'risk', name: 'Risk Assessment' },
    { id: 'history', name: 'History' },
  ];

  // Show loading state when still loading
  if (isLoading && !selectedContract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  // Show error state when there's an error and no contract
  if (error && !selectedContract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Contract Not Found</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex space-x-3 justify-center">
              <Link
                to="/contracts"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Contracts
              </Link>
              <button
                onClick={() => {
                  clearError();
                  if (id) fetchContract(id);
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            to="/contracts"
            className="flex items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Contracts
          </Link>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900 truncate">{contract.title || contract.name || 'Untitled Contract'}</h1>
              <span className={classNames(
                statusInfo.color,
                statusInfo.bgColor,
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium'
              )}>
                <StatusIcon className="h-4 w-4 mr-1" />
                {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
              </span>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
              <span>{contract.contract_type || (contract.type as any)?.name || contract.type || 'Unknown'}</span>
              <span>•</span>
              <span>Version {contract.version}</span>
              <span>•</span>
              <span>Updated {contract.updated_at ? new Date(contract.updated_at).toLocaleDateString() : (contract.updatedAt ? new Date(contract.updatedAt).toLocaleDateString() : 'Unknown')}</span>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0 flex space-x-3">
            {/* Generate Content Button - only show if no generated content */}
            {!contract.generated_content && (
              <button 
                className="btn-primary"
                onClick={handleGenerateContent}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Generate Content
                  </>
                )}
              </button>
            )}
            
            <button className="btn-secondary">
              <ShareIcon className="h-4 w-4 mr-2" />
              Share
            </button>
            
            {/* Export Dropdown */}
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="btn-secondary">
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export
                <ChevronDownIcon className="h-4 w-4 ml-2" />
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => handleExport('pdf')}
                          className={classNames(
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                            'flex items-center w-full text-left px-4 py-2 text-sm'
                          )}
                        >
                          <DocumentIcon className="h-4 w-4 mr-3 text-red-500" />
                          Export as PDF
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => handleExport('docx')}
                          className={classNames(
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                            'flex items-center w-full text-left px-4 py-2 text-sm'
                          )}
                        >
                          <DocumentIcon className="h-4 w-4 mr-3 text-blue-500" />
                          Export as Word
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => handleExport('txt')}
                          className={classNames(
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                            'flex items-center w-full text-left px-4 py-2 text-sm'
                          )}
                        >
                          <DocumentIcon className="h-4 w-4 mr-3 text-gray-500" />
                          Export as Text
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
            
            <button 
              className="btn-secondary"
              onClick={() => navigate(`/contracts/${id}/edit`)}
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Compliance Score</div>
              <div className="text-2xl font-bold text-gray-900">{(contract.complianceScore as any)?.overall ?? contract.complianceScore ?? 0}%</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Risk Level</div>
              <div className="text-2xl font-bold text-gray-900">{riskLevel}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Parties</div>
              <div className="text-2xl font-bold text-gray-900">
                {(() => {
                  let count = 0;
                  if (contract.client_name) count++;
                  if (contract.supplier_name) count++;
                  if (contract.parties?.length) count += contract.parties.length;
                  return count;
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Deadlines</div>
              <div className="text-2xl font-bold text-gray-900">{contract.deadlines?.length || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={classNames(
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium'
              )}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Contract Details */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Contract Details</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Type</dt>
                    <dd className="mt-1 text-sm text-gray-900">{contract.contract_type || (contract.type as any)?.name || contract.type || 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {contract.created_at ? new Date(contract.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      }) : (contract.createdAt ? new Date(contract.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      }) : 'Unknown')}
                    </dd>
                  </div>
                  {contract.client_name && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Client</dt>
                      <dd className="mt-1 text-sm text-gray-900">{contract.client_name}</dd>
                    </div>
                  )}
                  {contract.supplier_name && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Supplier</dt>
                      <dd className="mt-1 text-sm text-gray-900">{contract.supplier_name}</dd>
                    </div>
                  )}
                  {contract.contract_value && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Contract Value</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Intl.NumberFormat('en-GB', {
                          style: 'currency',
                          currency: contract.currency || 'GBP'
                        }).format(contract.contract_value)}
                      </dd>
                    </div>
                  )}
                  {(contract.start_date || contract.end_date) && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Contract Period</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {contract.start_date && new Date(contract.start_date).toLocaleDateString('en-GB')}
                        {contract.start_date && contract.end_date && ' - '}
                        {contract.end_date && new Date(contract.end_date).toLocaleDateString('en-GB')}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Contract Value</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {contract.contract_value ? `${contract.currency || 'GBP'} ${contract.contract_value.toLocaleString()}` : 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Client</dt>
                    <dd className="mt-1 text-sm text-gray-900">{contract.client_name || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Supplier</dt>
                    <dd className="mt-1 text-sm text-gray-900">{contract.supplier_name || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tags</dt>
                    <dd className="mt-1">
                      <div className="flex flex-wrap gap-2">
                        {contract.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        )) || <span className="text-sm text-gray-500">No tags</span>}
                      </div>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Parties */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Contract Parties</h3>
                <div className="space-y-4">
                  {/* Client Party */}
                  {contract.client_name && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contract.client_name}</div>
                        {contract.client_email && <div className="text-sm text-gray-500">{contract.client_email}</div>}
                        <div className="text-xs text-gray-500 capitalize">Client</div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Client
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Supplier Party */}
                  {contract.supplier_name && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contract.supplier_name}</div>
                        <div className="text-xs text-gray-500 capitalize">Supplier</div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Supplier
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Fallback for legacy parties */}
                  {contract.parties?.map((party) => (
                    <div key={party.id || party.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{party.name}</div>
                        <div className="text-sm text-gray-500">{party.email}</div>
                        <div className="text-xs text-gray-500 capitalize">{party.role}</div>
                      </div>
                      <div className="text-right">
                        <span className={classNames(
                          party.signatureStatus === 'signed' ? 'text-green-600 bg-green-100' :
                          party.signatureStatus === 'pending' ? 'text-yellow-600 bg-yellow-100' :
                          'text-red-600 bg-red-100',
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
                        )}>
                          {party.signatureStatus || 'Pending'}
                        </span>
                        {party.signedAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(party.signedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty state */}
                  {!contract.client_name && !contract.supplier_name && (!contract.parties || contract.parties.length === 0) && (
                    <div className="text-center py-8">
                      <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No parties defined for this contract</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contract Content */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Contract Content</h3>
              {contract.generated_content ? (
                <div className="prose max-w-none">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                      {contract.generated_content}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Content Generated</h4>
                  <p className="text-gray-500 mb-6">
                    This contract doesn't have generated content yet. Click the "Generate Content" button above to create AI-powered contract content.
                  </p>
                  <button 
                    className="btn-primary"
                    onClick={handleGenerateContent}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4 mr-2" />
                        Generate Content
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Deadlines */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Upcoming Deadlines</h3>
              <div className="space-y-4">
                {contract.deadlines?.length > 0 ? contract.deadlines.map((deadline, index) => (
                  <div key={(deadline as any).id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={classNames(
                        deadline.status === 'due' ? 'bg-red-100' : 'bg-blue-100',
                        'flex-shrink-0 w-3 h-3 rounded-full'
                      )}>
                        <div className={classNames(
                          deadline.status === 'due' ? 'bg-red-600' : 'bg-blue-600',
                          'w-full h-full rounded-full'
                        )} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{(deadline as any).title || deadline.name}</div>
                        <div className="text-sm text-gray-500 capitalize">{(deadline as any).type || 'deadline'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(deadline.date).toLocaleDateString()}
                      </div>
                      <div className={classNames(
                        deadline.status === 'due' ? 'text-red-600' : 'text-gray-500',
                        'text-xs'
                      )}>
                        {deadline.status === 'due' ? 'Due now' : deadline.status}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No deadlines set for this contract</p>
                    <p className="text-sm text-gray-400 mt-1">Deadlines will appear here when added</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-8">
            {/* Overall Compliance Score */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">UK Legal Compliance Analysis</h3>
                <span className={classNames(
                  getComplianceColor((contract.complianceScore as any)?.overall ?? contract.complianceScore ?? 0),
                  'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium'
                )}>
                  {(contract.complianceScore as any)?.overall ?? contract.complianceScore ?? 0}% Compliant
                </span>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{(contract.complianceScore as any)?.gdprCompliance ?? 0}%</div>
                    <div className="text-sm text-gray-500">GDPR Compliance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{(contract.complianceScore as any)?.employmentLaw ?? 0}%</div>
                    <div className="text-sm text-gray-500">Employment Law</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{(contract.complianceScore as any)?.commercialTerms ?? 0}%</div>
                    <div className="text-sm text-gray-500">Commercial Terms</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{(contract.complianceScore as any)?.consumerRights ?? 0}%</div>
                    <div className="text-sm text-gray-500">Consumer Rights</div>
                  </div>
                </div>

                {(contract.complianceScore as any)?.issues && (contract.complianceScore as any).issues.length > 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-base font-medium text-gray-900 mb-4">Compliance Issues</h4>
                    <div className="space-y-3">
                      {(contract.complianceScore as any)?.issues?.map((issue: any) => (
                        <div key={issue.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div className="ml-3">
                              <h5 className="text-sm font-medium text-yellow-800">{issue.category}</h5>
                              <p className="text-sm text-yellow-700 mt-1">{issue.description}</p>
                              <p className="text-sm text-yellow-600 mt-2 font-medium">
                                Recommendation: {issue.recommendation}
                              </p>
                            </div>
                          </div>
                        </div>
                      )) || null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-8">
            {/* Risk Assessment Overview */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Risk Assessment</h3>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500">Overall Risk:</span>
                  <span className={classNames(
                    getRiskColor(contract.riskAssessment?.overall || 0),
                    'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border'
                  )}>
                    {riskLevel} ({contract.riskAssessment?.overall || 0}%)
                  </span>
                </div>
              </div>

              {/* Risk Factors */}
              <div className="space-y-4">
                <h4 className="text-base font-medium text-gray-900">Risk Factors</h4>
                {contract.riskAssessment?.factors?.map((factor, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-gray-900">{factor.name}</h5>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Impact: {factor.impact}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">Likelihood: {factor.likelihood}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{factor.description}</p>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Risk Score</span>
                        <span>{factor.score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            factor.score <= 30 ? 'bg-green-600' :
                            factor.score <= 60 ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}
                          style={{ width: `${factor.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-base font-medium text-gray-900 mb-4">AI Recommendations</h4>
                <div className="space-y-3">
                  {contract.riskAssessment?.recommendations?.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-gray-700">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Version History & Audit Trail</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-3 h-3 bg-green-600 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">Current Version (v{contract.version})</div>
                    <div className="text-sm text-gray-500">
                      {contract.updated_at ? new Date(contract.updated_at).toLocaleDateString() : (contract.updatedAt ? new Date(contract.updatedAt).toLocaleDateString() : 'Unknown')}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Contract updated and compliance re-checked</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-3 h-3 bg-blue-600 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">Initial Creation (v1)</div>
                    <div className="text-sm text-gray-500">
                      {contract.created_at ? new Date(contract.created_at).toLocaleDateString() : (contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : 'Unknown')}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Contract created from template</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Generation Loading Overlay */}
      <AIGenerationLoading isVisible={isGenerating} />
    </div>
  );
}