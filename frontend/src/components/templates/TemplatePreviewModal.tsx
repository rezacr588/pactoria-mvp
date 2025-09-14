import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  DocumentTextIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, Badge } from '../ui';
import { TemplateService } from '../../services/api';
import { getErrorMessage } from '../../utils/errorHandling';
import { useToast } from '../../contexts/ToastContext';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  contract_type: string;
  template_content: string;
  compliance_features: string[];
  legal_notes?: string;
  version: string;
  is_active: boolean;
  suitable_for: string[];
  created_at: string;
  updated_at?: string;
}

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  onUseTemplate?: (templateId: string) => void;
}

// Sample data for template variable substitution
const sampleData: Record<string, string> = {
  // Company/Business
  company_name: 'ABC Ltd',
  company_address: '123 Business Street, London, SW1A 1AA',
  website_name: 'ABC Ltd Website',
  contact_email: 'info@abc-ltd.com',
  
  // Employee/Person details
  employee_name: 'John Smith',
  employee_address: '456 Residential Road, London, N1 2BB',
  full_name: 'John Smith',
  job_title: 'Senior Developer',
  
  // Client/Party details
  client_name: 'XYZ Corporation',
  client_address: '789 Client House, Manchester, M1 3CC',
  party_a_name: 'ABC Ltd',
  party_a_address: '123 Business Street, London, SW1A 1AA',
  party_b_name: 'XYZ Corporation',
  party_b_address: '789 Client House, Manchester, M1 3CC',
  
  // Service provider details
  provider_name: 'Professional Services Ltd',
  provider_address: '321 Service Avenue, Birmingham, B1 4DD',
  consultant_name: 'Jane Doe',
  consultant_address: '654 Consultant Lane, Edinburgh, EH1 5EE',
  
  // Supplier details
  supplier_name: 'Supply Chain Ltd',
  supplier_address: '987 Supplier Street, Leeds, LS1 6FF',
  buyer_name: 'ABC Ltd',
  buyer_address: '123 Business Street, London, SW1A 1AA',
  
  // Contract terms
  annual_salary: '45,000',
  working_hours: '37.5',
  holiday_days: '25',
  notice_period: '1 month',
  start_date: '1st January 2024',
  work_location: 'London Office',
  
  // Service details
  consulting_services: 'Strategic planning and implementation',
  project_name: 'Digital Transformation Initiative',
  project_duration: '6 months',
  total_fee: '25,000',
  payment_schedule: 'Monthly in arrears',
  work_arrangement: 'remotely with weekly office visits',
  deliverables: 'Strategic roadmap, implementation plan, progress reports',
  delivery_dates: 'Monthly milestones with final delivery by 30th June 2024',
  ip_ownership: 'Client',
  
  // Business terms
  business_purpose: 'exploring potential partnership opportunities',
  duration: '2 years',
  service_description: 'professional consulting and advisory services',
  payment_terms: 'Payment due within 30 days of invoice',
  refund_policy: '14-day money-back guarantee for digital products',
  last_updated: '1st January 2024',
};

function getCategoryColor(category: string) {
  const lowerCategory = category.toLowerCase();
  switch (lowerCategory) {
    case 'employment':
      return 'text-blue-700 bg-blue-100';
    case 'commercial':
    case 'professional services':
      return 'text-green-700 bg-green-100';
    case 'property':
      return 'text-purple-700 bg-purple-100';
    case 'corporate':
      return 'text-orange-700 bg-orange-100';
    case 'consumer':
    case 'digital':
      return 'text-red-700 bg-red-100';
    case 'confidentiality':
      return 'text-indigo-700 bg-indigo-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

function processTemplateContent(content: string): string {
  let processedContent = content;
  
  // Replace template variables with sample data
  Object.entries(sampleData).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    processedContent = processedContent.replace(regex, value);
  });
  
  return processedContent;
}

function highlightVariables(content: string): React.ReactNode[] {
  // Split content by variables and text
  const parts = content.split(/({{[^}]+}})/g);
  
  return parts.map((part, index) => {
    if (part.match(/{{[^}]+}}/)) {
      // This is a variable - highlight it
      const variable = part.replace(/[{}]/g, '').trim();
      const hasValue = sampleData[variable];
      
      return (
        <span
          key={index}
          className={`inline-block px-2 py-1 mx-1 text-xs font-medium rounded ${
            hasValue 
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}
          title={hasValue ? `Sample value: ${sampleData[variable]}` : 'No sample data available'}
        >
          {variable}
        </span>
      );
    } else {
      // Regular text
      return (
        <span key={index}>
          {part}
        </span>
      );
    }
  });
}

export default function TemplatePreviewModal({
  isOpen,
  onClose,
  templateId,
  onUseTemplate,
}: TemplatePreviewModalProps) {
  const { showToast } = useToast();
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'variables'>('preview');

  useEffect(() => {
    if (isOpen && templateId) {
      fetchTemplate();
    }
  }, [isOpen, templateId]);

  const fetchTemplate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await TemplateService.getTemplate(templateId);
      setTemplate(response);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTemplate = () => {
    if (template && onUseTemplate) {
      onUseTemplate(template.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-4xl">
          <Card className="max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <DocumentTextIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Template Preview
                  </h2>
                  {template && (
                    <p className="text-sm text-gray-500">
                      {template.name} • Version {template.version}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* View mode toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'preview'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <EyeIcon className="h-4 w-4 inline mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={() => setViewMode('variables')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'variables'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                    Variables
                  </button>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
                  <p className="text-gray-500">Loading template...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={fetchTemplate} variant="secondary" size="sm">
                    Try Again
                  </Button>
                </div>
              ) : template ? (
                <>
                  {/* Template Info */}
                  <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Category</p>
                        <Badge className={`text-xs ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Type</p>
                        <p className="text-sm font-medium text-gray-900">
                          {template.contract_type.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Compliance Features</p>
                        <p className="text-sm font-medium text-gray-900">
                          {template.compliance_features.length} features
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Last Updated</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(template.updated_at || template.created_at).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                      <p className="text-sm text-gray-700">{template.description}</p>
                    </div>

                    {template.legal_notes && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-1">Legal Notes</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex">
                            <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                            <p className="text-sm text-blue-700">{template.legal_notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Template Content */}
                  <div className="p-6">
                    {viewMode === 'preview' ? (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Template Content (with sample data)
                        </h3>
                        <div className="bg-white border border-gray-300 rounded-lg p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                          {processTemplateContent(template.template_content)}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Template Variables
                        </h3>
                        <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 font-mono text-sm leading-relaxed">
                          {highlightVariables(template.template_content)}
                        </div>
                        
                        <div className="mt-6">
                          <h4 className="text-md font-semibold text-gray-900 mb-3">
                            Compliance Features
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {template.compliance_features.map((feature, index) => (
                              <div
                                key={index}
                                className="flex items-center bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm"
                              >
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>

                        {template.suitable_for.length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-md font-semibold text-gray-900 mb-3">
                              Suitable For
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {template.suitable_for.map((suitability, index) => (
                                <Badge
                                  key={index}
                                  variant="default"
                                  className="text-xs"
                                >
                                  {suitability}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            {template && (
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  This preview shows how the template will appear with sample data filled in.
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                  >
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    icon={<DocumentDuplicateIcon className="h-4 w-4" />}
                    onClick={handleUseTemplate}
                  >
                    Use This Template
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}