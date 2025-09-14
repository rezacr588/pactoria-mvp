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
  const { selectedContract, isLoading, error, fetchContract, generateContent, analyzeCompliance, clearError, updateContract } = useContracts();
  const [activeTab, setActiveTab] = useState('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editingSections, setEditingSections] = useState<Record<string, boolean>>({});
  const [editedSections, setEditedSections] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

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
    if (!selectedContract?.id) return;
    
    try {
      if (format === 'txt') {
        // Simple text export
        const content = selectedContract?.final_content || selectedContract?.generated_content || 'No content available';
        const title = selectedContract?.title || 'Contract';
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        // PDF export via backend
        const { ContractService } = await import('../services/api');
        const blob = await ContractService.exportContractPDF(selectedContract.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedContract.title || 'contract'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'docx') {
        // DOCX export via backend
        const { ContractService } = await import('../services/api');
        const blob = await ContractService.exportContractDOCX(selectedContract.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedContract.title || 'contract'}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  }, [selectedContract]);

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

  const handleAnalyzeRisk = useCallback(async () => {
    if (!contract.id) return;
    
    setIsAnalyzing(true);
    try {
      await analyzeCompliance(contract.id, true); // Force reanalysis for risk assessment
      // Refresh the contract to get the updated compliance data
      await fetchContract(contract.id);
    } catch (error) {
      console.error('Failed to analyze risk:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [contract.id, analyzeCompliance, fetchContract, setIsAnalyzing]);

  const handleEditContent = useCallback(() => {
    setIsEditing(true);
    setEditedContent(contract.final_content || contract.generated_content || '');
  }, [contract.final_content, contract.generated_content]);

  const handleSaveContent = useCallback(async () => {
    if (!contract.id) return;
    
    try {
      await updateContract(contract.id, { final_content: editedContent });
      await fetchContract(contract.id);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save content:', error);
    }
  }, [contract.id, editedContent, updateContract, fetchContract]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedContent('');
  }, []);

  // New functions for inline editing
  const handleStartInlineEdit = useCallback((sectionId: string, currentContent: string) => {
    setEditingSections(prev => ({ ...prev, [sectionId]: true }));
    setEditedSections(prev => ({ ...prev, [sectionId]: currentContent }));
  }, []);

  const handleSaveInlineEdit = useCallback(async (sectionId: string) => {
    if (!contract.id || !editedSections[sectionId]) return;
    
    setIsSaving(true);
    try {
      // Reconstruct the full content with the edited section
      const originalContent = contract.final_content || contract.generated_content || '';
      const sections = originalContent.split('\n\n');
      const sectionIndex = parseInt(sectionId.replace('section-', ''));
      
      if (sectionIndex >= 0 && sectionIndex < sections.length) {
        sections[sectionIndex] = editedSections[sectionId];
        const newContent = sections.join('\n\n');
        
        await updateContract(contract.id, { final_content: newContent });
        await fetchContract(contract.id);
      }
      
      setEditingSections(prev => ({ ...prev, [sectionId]: false }));
      setEditedSections(prev => {
        const newSections = { ...prev };
        delete newSections[sectionId];
        return newSections;
      });
    } catch (error) {
      console.error('Failed to save section:', error);
    } finally {
      setIsSaving(false);
    }
  }, [contract.id, contract.final_content, contract.generated_content, editedSections, updateContract, fetchContract]);

  const handleCancelInlineEdit = useCallback((sectionId: string) => {
    setEditingSections(prev => ({ ...prev, [sectionId]: false }));
    setEditedSections(prev => {
      const newSections = { ...prev };
      delete newSections[sectionId];
      return newSections;
    });
  }, []);

  const handleSectionContentChange = useCallback((sectionId: string, content: string) => {
    setEditedSections(prev => ({ ...prev, [sectionId]: content }));
  }, []);

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

            {/* Risk Analysis Button */}
            <button 
              className="btn-secondary"
              onClick={handleAnalyzeRisk}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  Analyze Risk
                </>
              )}
            </button>
            
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
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Contract Content</h3>
                {(contract.generated_content || contract.final_content) && !isEditing && (
                  <button
                    onClick={handleEditContent}
                    className="btn-secondary text-sm"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Enable Interactive Editing
                  </button>
                )}
                {isEditing && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancelEdit}
                      className="btn-secondary text-sm"
                    >
                      Exit Editing Mode
                    </button>
                  </div>
                )}
              </div>
              
              {isEditing ? (
                /* Live Edit Mode */
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <PencilIcon className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-yellow-800">Editing Mode</h4>
                        <p className="text-sm text-yellow-700">Make changes to the contract content. Remember to save your changes.</p>
                      </div>
                    </div>
                  </div>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter contract content..."
                    style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
                  />
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{editedContent.length} characters</span>
                    <span>Auto-save disabled in edit mode</span>
                  </div>
                </div>
              ) : (contract.generated_content || contract.final_content) ? (
                <div className="prose max-w-none">
                  {/* Interactive PDF-like document styling */}
                  <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-8 mx-auto max-w-4xl" style={{ fontFamily: 'Times, serif' }}>
                    {/* Editing mode indicator */}
                    {isEditing && (
                      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <PencilIcon className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-blue-800">
                            Interactive Editing Mode - Click on any section to edit
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Document header */}
                    <div className="text-center mb-8 pb-4 border-b-2 border-gray-300">
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">{contract.title}</h1>
                      <div className="text-sm text-gray-600 space-y-1">
                        {contract.client_name && <div><strong>Client:</strong> {contract.client_name}</div>}
                        {contract.supplier_name && <div><strong>Service Provider:</strong> {contract.supplier_name}</div>}
                        {contract.contract_value && (
                          <div><strong>Contract Value:</strong> {new Intl.NumberFormat('en-GB', {
                            style: 'currency',
                            currency: contract.currency || 'GBP'
                          }).format(contract.contract_value)}</div>
                        )}
                        {contract.start_date && contract.end_date && (
                          <div><strong>Term:</strong> {new Date(contract.start_date).toLocaleDateString('en-GB')} - {new Date(contract.end_date).toLocaleDateString('en-GB')}</div>
                        )}
                      </div>
                    </div>

                    {/* Interactive document content */}
                    <div 
                      className="text-gray-800 leading-relaxed space-y-4"
                      style={{ 
                        fontSize: '14px',
                        lineHeight: '1.6',
                        textAlign: 'justify'
                      }}
                    >
                      {(contract.final_content || contract.generated_content).split('\n\n').map((paragraph, index) => {
                        const trimmed = paragraph.trim();
                        if (!trimmed) return null;
                        
                        const sectionId = `section-${index}`;
                        const isEditingSection = editingSections[sectionId];
                        const editContent = editedSections[sectionId] || trimmed;
                        
                        // Common editing controls for each section
                        const EditingControls = () => (
                          <div className="flex items-center space-x-2 mt-2">
                            <button
                              onClick={() => handleSaveInlineEdit(sectionId)}
                              disabled={isSaving}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded hover:bg-green-200 disabled:opacity-50"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => handleCancelInlineEdit(sectionId)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        );

                        // Style different parts of the contract with inline editing
                        if (trimmed.toUpperCase() === trimmed && trimmed.length > 5) {
                          // All caps = heading
                          return (
                            <div key={index} className={`relative group ${isEditing ? 'hover:bg-blue-50 hover:border hover:border-blue-200 rounded p-2' : ''}`}>
                              {isEditingSection ? (
                                <div>
                                  <input
                                    type="text"
                                    value={editContent}
                                    onChange={(e) => handleSectionContentChange(sectionId, e.target.value)}
                                    className="w-full text-lg font-bold text-center my-6 text-gray-900 bg-transparent border-b-2 border-blue-300 focus:outline-none focus:border-blue-500"
                                    autoFocus
                                  />
                                  <EditingControls />
                                </div>
                              ) : (
                                <>
                                  <h2 
                                    className="text-lg font-bold text-center my-6 text-gray-900 cursor-pointer"
                                    onClick={() => isEditing && handleStartInlineEdit(sectionId, trimmed)}
                                  >
                                    {trimmed}
                                  </h2>
                                  {isEditing && (
                                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => handleStartInlineEdit(sectionId, trimmed)}
                                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                      >
                                        <PencilIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        } else if (trimmed.match(/^\d+\./)) {
                          // Numbered sections
                          return (
                            <div key={index} className={`mt-6 mb-4 relative group ${isEditing ? 'hover:bg-blue-50 hover:border hover:border-blue-200 rounded p-2' : ''}`}>
                              {isEditingSection ? (
                                <div>
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => handleSectionContentChange(sectionId, e.target.value)}
                                    className="w-full font-semibold text-gray-900 bg-transparent border border-blue-300 rounded p-2 focus:outline-none focus:border-blue-500 resize-vertical"
                                    rows={Math.max(2, editContent.split('\n').length)}
                                    autoFocus
                                  />
                                  <EditingControls />
                                </div>
                              ) : (
                                <>
                                  <p 
                                    className="font-semibold text-gray-900 cursor-pointer"
                                    onClick={() => isEditing && handleStartInlineEdit(sectionId, trimmed)}
                                  >
                                    {trimmed}
                                  </p>
                                  {isEditing && (
                                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => handleStartInlineEdit(sectionId, trimmed)}
                                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                      >
                                        <PencilIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        } else if (trimmed.match(/^[A-Z][A-Z\s]+:/)) {
                          // Section headers with colon
                          return (
                            <div key={index} className={`relative group ${isEditing ? 'hover:bg-blue-50 hover:border hover:border-blue-200 rounded p-2' : ''}`}>
                              {isEditingSection ? (
                                <div>
                                  <input
                                    type="text"
                                    value={editContent}
                                    onChange={(e) => handleSectionContentChange(sectionId, e.target.value)}
                                    className="w-full text-base font-bold mt-6 mb-3 text-gray-900 uppercase bg-transparent border-b border-blue-300 focus:outline-none focus:border-blue-500"
                                    autoFocus
                                  />
                                  <EditingControls />
                                </div>
                              ) : (
                                <>
                                  <h3 
                                    className="text-base font-bold mt-6 mb-3 text-gray-900 uppercase cursor-pointer"
                                    onClick={() => isEditing && handleStartInlineEdit(sectionId, trimmed)}
                                  >
                                    {trimmed}
                                  </h3>
                                  {isEditing && (
                                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => handleStartInlineEdit(sectionId, trimmed)}
                                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                      >
                                        <PencilIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        } else {
                          // Regular paragraphs
                          return (
                            <div key={index} className={`relative group ${isEditing ? 'hover:bg-blue-50 hover:border hover:border-blue-200 rounded p-2' : ''}`}>
                              {isEditingSection ? (
                                <div>
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => handleSectionContentChange(sectionId, e.target.value)}
                                    className="w-full mb-4 text-gray-800 bg-transparent border border-blue-300 rounded p-2 focus:outline-none focus:border-blue-500 resize-vertical"
                                    rows={Math.max(3, editContent.split('\n').length)}
                                    autoFocus
                                  />
                                  <EditingControls />
                                </div>
                              ) : (
                                <>
                                  <p 
                                    className="mb-4 text-gray-800 cursor-pointer"
                                    onClick={() => isEditing && handleStartInlineEdit(sectionId, trimmed)}
                                  >
                                    {trimmed}
                                  </p>
                                  {isEditing && (
                                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => handleStartInlineEdit(sectionId, trimmed)}
                                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                      >
                                        <PencilIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        }
                      })}
                    </div>

                    {/* Document footer */}
                    <div className="mt-12 pt-8 border-t-2 border-gray-300">
                      <div className="flex justify-between items-center">
                        <div className="text-center flex-1">
                          <div className="border-b border-gray-400 w-48 mx-auto mb-2"></div>
                          <div className="text-sm text-gray-600">Client Signature</div>
                          <div className="text-xs text-gray-500 mt-1">Date: ___________</div>
                        </div>
                        <div className="text-center flex-1">
                          <div className="border-b border-gray-400 w-48 mx-auto mb-2"></div>
                          <div className="text-sm text-gray-600">Service Provider Signature</div>
                          <div className="text-xs text-gray-500 mt-1">Date: ___________</div>
                        </div>
                      </div>
                    </div>

                    {/* Page number style footer */}
                    <div className="text-center text-xs text-gray-500 mt-8">
                      Page 1 of 1 | Contract ID: {contract.id.slice(0, 8)}
                    </div>
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