import React, { useState, useEffect, useRef } from 'react';
import { 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  DocumentArrowDownIcon,
  PrinterIcon 
} from '@heroicons/react/24/outline';

interface PDFStyleContractViewerProps {
  title: string;
  content: string;
  metadata?: {
    contract_type?: string;
    client_name?: string;
    supplier_name?: string;
    contract_value?: number;
    currency?: string;
    start_date?: string;
    end_date?: string;
  };
  isEditable?: boolean;
  onContentUpdate?: (newContent: string) => void;
  onExport?: (format: 'pdf' | 'docx') => void;
  className?: string;
}

export default function PDFStyleContractViewer({
  title,
  content,
  metadata,
  isEditable = false,
  onContentUpdate,
  onExport,
  className = ''
}: PDFStyleContractViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update edit content when content prop changes
  useEffect(() => {
    setEditContent(content);
  }, [content]);

  // Auto-save functionality
  useEffect(() => {
    if (isEditing && editContent !== content && onContentUpdate) {
      // Clear existing timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      // Set new timer for auto-save after 2 seconds of no typing
      const timer = setTimeout(() => {
        onContentUpdate(editContent);
      }, 2000);
      
      setAutoSaveTimer(timer);
    }
    
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [editContent, content, isEditing, onContentUpdate, autoSaveTimer]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes when exiting edit mode
      if (editContent !== content && onContentUpdate) {
        onContentUpdate(editContent);
      }
    }
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (onContentUpdate) {
      onContentUpdate(editContent);
    }
    setIsEditing(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP'
    }).format(amount);
  };

  // Format content for display (handle basic paragraph breaks)
  const formatContentForDisplay = (text: string) => {
    return text.split('\n\n').map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;
      
      // Detect headings (all caps or numbered)
      const isHeading = trimmed.length < 100 && (
        trimmed === trimmed.toUpperCase() ||
        /^\d+\./.test(trimmed)
      );
      
      // Detect clauses (indented items)
      const isClause = /^[a-z]\)|^\([a-z]\)|^i{1,3}\)|^\d+\.\d+/.test(trimmed);
      
      if (isHeading) {
        return (
          <h3 key={index} className="text-base font-semibold text-gray-900 mb-3 mt-6 first:mt-0">
            {trimmed}
          </h3>
        );
      } else if (isClause) {
        return (
          <p key={index} className="text-sm text-gray-800 mb-2 pl-4 leading-relaxed">
            {trimmed}
          </p>
        );
      } else {
        return (
          <p key={index} className="text-sm text-gray-800 mb-4 leading-relaxed text-justify">
            {trimmed}
          </p>
        );
      }
    }).filter(Boolean);
  };

  return (
    <div className={`bg-white ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {isEditable && (
            <>
              {!isEditing ? (
                <button
                  onClick={handleEditToggle}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PencilIcon className="h-4 w-4 mr-1.5" />
                  Edit
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <CheckIcon className="h-4 w-4 mr-1.5" />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1.5" />
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
          
          {isEditing && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              Auto-save enabled
            </span>
          )}
        </div>
        
        {onExport && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onExport('pdf')}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
              PDF
            </button>
            <button
              onClick={() => onExport('docx')}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
              Word
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PrinterIcon className="h-4 w-4 mr-1.5" />
              Print
            </button>
          </div>
        )}
      </div>

      {/* PDF-style document */}
      <div className="pdf-document">
        {/* Document container with A4-like proportions and styling */}
        <div className="mx-auto bg-white shadow-lg border border-gray-200" style={{
          width: '210mm',
          minHeight: '297mm',
          maxWidth: '100%',
          padding: '20mm',
          fontFamily: 'Times, "Times New Roman", serif',
          fontSize: '11pt',
          lineHeight: '1.4'
        }}>
          
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {title}
            </h1>
            <div className="w-24 h-0.5 bg-gray-400 mx-auto"></div>
          </div>
          
          {/* Metadata table */}
          {metadata && (
            <div className="mb-8">
              <table className="w-full border-collapse border border-gray-400 text-sm">
                <tbody>
                  {metadata.contract_type && (
                    <tr>
                      <td className="border border-gray-400 px-3 py-2 bg-gray-50 font-semibold w-1/3">
                        Contract Type:
                      </td>
                      <td className="border border-gray-400 px-3 py-2">
                        {metadata.contract_type}
                      </td>
                    </tr>
                  )}
                  {metadata.client_name && (
                    <tr>
                      <td className="border border-gray-400 px-3 py-2 bg-gray-50 font-semibold">
                        Client:
                      </td>
                      <td className="border border-gray-400 px-3 py-2">
                        {metadata.client_name}
                      </td>
                    </tr>
                  )}
                  {metadata.supplier_name && (
                    <tr>
                      <td className="border border-gray-400 px-3 py-2 bg-gray-50 font-semibold">
                        Supplier:
                      </td>
                      <td className="border border-gray-400 px-3 py-2">
                        {metadata.supplier_name}
                      </td>
                    </tr>
                  )}
                  {metadata.contract_value && (
                    <tr>
                      <td className="border border-gray-400 px-3 py-2 bg-gray-50 font-semibold">
                        Contract Value:
                      </td>
                      <td className="border border-gray-400 px-3 py-2">
                        {formatCurrency(metadata.contract_value, metadata.currency)}
                      </td>
                    </tr>
                  )}
                  {(metadata.start_date || metadata.end_date) && (
                    <tr>
                      <td className="border border-gray-400 px-3 py-2 bg-gray-50 font-semibold">
                        Period:
                      </td>
                      <td className="border border-gray-400 px-3 py-2">
                        {formatDate(metadata.start_date)}
                        {metadata.start_date && metadata.end_date && ' - '}
                        {formatDate(metadata.end_date)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Content */}
          <div className="mb-8">
            {isEditing ? (
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-96 p-4 border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{
                    fontFamily: 'Times, "Times New Roman", serif',
                    fontSize: '11pt',
                    lineHeight: '1.4'
                  }}
                  placeholder="Enter contract content..."
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                  {editContent.length} characters
                </div>
              </div>
            ) : (
              <div className="contract-content">
                {formatContentForDisplay(content)}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="text-center text-xs text-gray-500 mt-16 pt-4 border-t border-gray-300">
            Document generated on {new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })} | Pactoria Contract Management
          </div>
        </div>
      </div>
      
      {/* Print styles */}
      <style jsx>{`
        @media print {
          .pdf-document {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          .pdf-document > div {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }
          
          button {
            display: none !important;
          }
        }
        
        .contract-content h3 {
          page-break-after: avoid;
        }
        
        .contract-content p {
          orphans: 2;
          widows: 2;
        }
      `}</style>
    </div>
  );
}