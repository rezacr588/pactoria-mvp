// Contract Type Utilities
// Centralized contract type handling and mapping

// Contract type is imported but used in function return types and interfaces
import { DocumentTextIcon, UsersIcon } from '@heroicons/react/24/outline';

export interface ContractTypeOption {
  value: string;
  label: string;
}

export interface ContractTypeDisplayInfo {
  estimatedTime: string;
  complexity: 'Simple' | 'Standard' | 'Complex';
  icon: React.ComponentType<{ className?: string }>;
  fields: string[];
  category: string;
}

// Default contract type display mapping
export const getContractTypeDisplayInfo = (contractType: string): ContractTypeDisplayInfo => {
  switch (contractType) {
    case 'service_agreement':
      return {
        estimatedTime: '15 minutes',
        complexity: 'Standard',
        icon: DocumentTextIcon,
        fields: ['Client details', 'Service scope', 'Payment terms', 'Deliverables'],
        category: 'Commercial',
      };
    case 'employment_contract':
      return {
        estimatedTime: '20 minutes',
        complexity: 'Standard',
        icon: UsersIcon,
        fields: ['Employee details', 'Job description', 'Salary & benefits', 'Terms & conditions'],
        category: 'Employment',
      };
    case 'supplier_agreement':
      return {
        estimatedTime: '18 minutes',
        complexity: 'Standard',
        icon: DocumentTextIcon,
        fields: ['Supplier details', 'Products/services', 'Payment terms', 'Quality standards'],
        category: 'Commercial',
      };
    case 'nda':
      return {
        estimatedTime: '10 minutes',
        complexity: 'Simple',
        icon: DocumentTextIcon,
        fields: ['Parties', 'Confidential information', 'Duration', 'Exceptions'],
        category: 'IP',
      };
    case 'partnership':
      return {
        estimatedTime: '25 minutes',
        complexity: 'Complex',
        icon: UsersIcon,
        fields: ['Partners', 'Contributions', 'Profit sharing', 'Governance'],
        category: 'Corporate',
      };
    case 'consultancy':
      return {
        estimatedTime: '15 minutes',
        complexity: 'Standard',
        icon: DocumentTextIcon,
        fields: ['Consultant details', 'Scope of work', 'Payment terms', 'Deliverables'],
        category: 'Commercial',
      };
    case 'terms_conditions':
      return {
        estimatedTime: '12 minutes',
        complexity: 'Simple',
        icon: DocumentTextIcon,
        fields: ['Terms', 'Conditions', 'User rights', 'Limitations'],
        category: 'Consumer',
      };
    case 'lease':
      return {
        estimatedTime: '22 minutes',
        complexity: 'Complex',
        icon: DocumentTextIcon,
        fields: ['Property details', 'Lease terms', 'Rent', 'Responsibilities'],
        category: 'Property',
      };
    default:
      return {
        estimatedTime: '15 minutes',
        complexity: 'Standard',
        icon: DocumentTextIcon,
        fields: ['Contract details', 'Terms', 'Conditions'],
        category: 'General',
      };
  }
};

// Convert contract type to human-readable label
export const getContractTypeLabel = (contractType: string): string => {
  switch (contractType) {
    case 'service_agreement':
      return 'Service Agreement';
    case 'employment_contract':
      return 'Employment Contract';
    case 'supplier_agreement':
      return 'Supplier Agreement';
    case 'nda':
      return 'Non-Disclosure Agreement';
    case 'partnership':
      return 'Partnership Agreement';
    case 'consultancy':
      return 'Consultancy Agreement';
    case 'terms_conditions':
      return 'Terms & Conditions';
    case 'lease':
      return 'Lease Agreement';
    default:
      return contractType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

// Default contract type options (fallback when API is unavailable)
export const DEFAULT_CONTRACT_TYPE_OPTIONS: ContractTypeOption[] = [
  { value: 'service_agreement', label: 'Service Agreement' },
  { value: 'employment_contract', label: 'Employment Contract' },
  { value: 'supplier_agreement', label: 'Supplier Agreement' },
  { value: 'nda', label: 'Non-Disclosure Agreement' },
  { value: 'consultancy', label: 'Consultancy Agreement' },
  { value: 'partnership', label: 'Partnership Agreement' },
  { value: 'terms_conditions', label: 'Terms & Conditions' },
  { value: 'lease', label: 'Lease Agreement' }
];

// Contract status options
export const CONTRACT_STATUS_OPTIONS: ContractTypeOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Under Review' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' }
];

// Get status badge variant
export const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'active':
    case 'completed':
      return 'success';
    case 'draft':
      return 'info';
    case 'review':
      return 'warning';
    case 'expired':
    case 'terminated':
      return 'danger';
    default:
      return 'default';
  }
};
