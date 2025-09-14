import React, { useState, useRef, useCallback } from 'react';
import { 
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

interface ContractContentFormatterProps {
  content: string;
  isEditable?: boolean;
  onContentChange?: (content: string) => void;
  title?: string;
  contractType?: string;
  clientName?: string;
  supplierName?: string;
  contractValue?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
}

interface ContractSection {
  id: string;
  title: string;
  content: string;
  isRequired: boolean;
}

export default function ContractContentFormatter({
  content,
  isEditable = false,
  onContentChange,
  title,
  contractType,
  clientName,
  supplierName,
  contractValue,
  currency = 'GBP',
  startDate,
  endDate,
}: ContractContentFormatterProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState(content);
  const contentRef = useRef<HTMLDivElement>(null);

  // Parse content into structured sections
  const parseSections = useCallback((rawContent: string): ContractSection[] => {
    if (!rawContent) {
      return getDefaultSections();
    }

    // Try to parse existing structured content
    const sections: ContractSection[] = [];
    const lines = rawContent.split('\n');
    let currentSection: Partial<ContractSection> | null = null;
    let sectionCounter = 1;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this line is a section header
      if (trimmedLine.match(/^[A-Z][A-Z\s]+:?$/) || 
          trimmedLine.match(/^\d+\.\s*[A-Z]/) ||
          trimmedLine.match(/^Article \d+/i) ||
          trimmedLine.match(/^Section \d+/i)) {
        
        // Save previous section
        if (currentSection && currentSection.content) {
          sections.push({
            id: currentSection.id || `section-${sectionCounter++}`,
            title: currentSection.title || 'Untitled Section',
            content: currentSection.content.trim(),
            isRequired: false,
          });
        }

        // Start new section
        currentSection = {
          id: `section-${sectionCounter}`,
          title: trimmedLine.replace(/:$/, ''),
          content: '',
        };
      } else if (currentSection && trimmedLine) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\n' : '') + line;
      }
    }

    // Add final section
    if (currentSection && currentSection.content) {
      sections.push({
        id: currentSection.id || `section-${sectionCounter}`,
        title: currentSection.title || 'Untitled Section',
        content: currentSection.content.trim(),
        isRequired: false,
      });
    }

    // If no sections found, treat as single content block
    if (sections.length === 0 && rawContent.trim()) {
      sections.push({
        id: 'main-content',
        title: 'Contract Terms',
        content: rawContent.trim(),
        isRequired: true,
      });
    }

    return sections.length > 0 ? sections : getDefaultSections();
  }, []);

  const getDefaultSections = (): ContractSection[] => [
    {
      id: 'recitals',
      title: 'RECITALS',
      content: 'WHEREAS, the parties wish to enter into this agreement...',
      isRequired: true,
    },
    {
      id: 'definitions',
      title: 'DEFINITIONS',
      content: 'For the purposes of this Agreement, the following terms shall have the meanings set forth below...',
      isRequired: false,
    },
    {
      id: 'scope',
      title: 'SCOPE OF SERVICES',
      content: 'The Service Provider shall provide the following services...',
      isRequired: true,
    },
    {
      id: 'payment',
      title: 'PAYMENT TERMS',
      content: 'Payment shall be made according to the following terms...',
      isRequired: true,
    },
    {
      id: 'termination',
      title: 'TERMINATION',
      content: 'This Agreement may be terminated...',
      isRequired: true,
    },
    {
      id: 'signatures',
      title: 'SIGNATURES',
      content: 'By signing below, the parties agree to be bound by the terms of this Agreement.',
      isRequired: true,
    },
  ];

  const sections = parseSections(editableContent);

  const handleSave = () => {
    if (onContentChange) {
      // Reconstruct content from sections
      const reconstructedContent = sections
        .map(section => `${section.title.toUpperCase()}\n\n${section.content}`)
        .join('\n\n\n');
      
      onContentChange(reconstructedContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditableContent(content);
    setIsEditing(false);
  };

  const updateSectionContent = (sectionId: string, newContent: string) => {
    const updatedSections = sections.map(section =>
      section.id === sectionId ? { ...section, content: newContent } : section
    );
    
    const reconstructedContent = updatedSections
      .map(section => `${section.title.toUpperCase()}\n\n${section.content}`)
      .join('\n\n\n');
    
    setEditableContent(reconstructedContent);
  };

  return (
    <div className="contract-formatter bg-white">
      {/* Editing Controls */}
      {isEditable && (
        <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <DocumentIcon className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Contract Content {isEditing ? '(Editing)' : '(View Only)'}
            </span>
          </div>
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                >
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md"
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </button>
            )}
          </div>
        </div>
      )}

      {/* PDF-like Content Display */}
      <div 
        ref={contentRef}
        className="contract-content bg-white shadow-lg mx-auto"
        style={{
          maxWidth: '8.5in',
          minHeight: '11in',
          padding: '1in',
          fontFamily: 'Georgia, serif',
          fontSize: '12pt',
          lineHeight: '1.6',
          color: '#000',
        }}
      >
        {/* Contract Header */}
        <div className="contract-header text-center mb-8 pb-6 border-b-2 border-gray-900">
          <h1 className="text-2xl font-bold mb-4 uppercase tracking-wide">
            {title || `${contractType?.replace('_', ' ').toUpperCase() || 'CONTRACT'}`}
          </h1>
          
          {/* Contract Details Table */}
          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div className="text-left">
              <div className="mb-2">
                <span className="font-semibold">Client:</span> {clientName || 'Client Name'}
              </div>
              {contractValue && (
                <div className="mb-2">
                  <span className="font-semibold">Contract Value:</span> {currency} {contractValue.toLocaleString()}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="mb-2">
                <span className="font-semibold">Supplier:</span> {supplierName || 'Supplier Name'}
              </div>
              {(startDate || endDate) && (
                <div className="mb-2">
                  <span className="font-semibold">Period:</span>{' '}
                  {startDate && new Date(startDate).toLocaleDateString('en-GB')}
                  {startDate && endDate && ' - '}
                  {endDate && new Date(endDate).toLocaleDateString('en-GB')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contract Sections */}
        <div className="contract-sections space-y-8">
          {sections.map((section, index) => (
            <div key={section.id} className="contract-section">
              <h2 className="text-lg font-bold mb-4 uppercase tracking-wide border-b border-gray-400 pb-2">
                {index + 1}. {section.title}
              </h2>
              
              {isEditing ? (
                <textarea
                  value={section.content}
                  onChange={(e) => updateSectionContent(section.id, e.target.value)}
                  className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md font-serif text-sm leading-relaxed resize-y"
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12pt',
                    lineHeight: '1.6',
                  }}
                />
              ) : (
                <div 
                  className="section-content prose max-w-none"
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12pt',
                    lineHeight: '1.6',
                  }}
                >
                  {section.content.split('\n').map((paragraph, pIndex) => (
                    <p key={pIndex} className="mb-4 text-justify">
                      {paragraph || '\u00A0'}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Signature Section */}
        <div className="signature-section mt-16 pt-8 border-t-2 border-gray-900">
          <div className="grid grid-cols-2 gap-8">
            <div className="signature-block">
              <div className="mb-8">
                <div className="border-b border-gray-900 pb-1 mb-2 w-3/4">
                  <span className="sr-only">Client Signature</span>
                </div>
                <div className="text-sm">
                  <div className="font-semibold">{clientName || 'Client Name'}</div>
                  <div className="text-gray-600">Client</div>
                  <div className="text-gray-600 mt-2">Date: _______________</div>
                </div>
              </div>
            </div>
            
            <div className="signature-block">
              <div className="mb-8">
                <div className="border-b border-gray-900 pb-1 mb-2 w-3/4">
                  <span className="sr-only">Supplier Signature</span>
                </div>
                <div className="text-sm">
                  <div className="font-semibold">{supplierName || 'Supplier Name'}</div>
                  <div className="text-gray-600">Supplier</div>
                  <div className="text-gray-600 mt-2">Date: _______________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .contract-formatter {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          .contract-content {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 1in !important;
            max-width: none !important;
            width: 8.5in !important;
          }
          
          .contract-section {
            page-break-inside: avoid;
          }
          
          .signature-section {
            page-break-before: auto;
            page-break-inside: avoid;
          }
          
          /* Hide editing controls when printing */
          .flex.justify-between.items-center {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}