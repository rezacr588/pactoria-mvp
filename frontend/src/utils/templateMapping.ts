// Template Mapping Utilities
// Centralized template data transformation and mapping

import { ContractType } from '../types';
import { getContractTypeDisplayInfo } from './contractTypes';

// Template interface for frontend display
export interface TemplateDisplayInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  contract_type: ContractType;
  estimatedTime: string;
  complexity: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: string[];
  compliance_features: string[];
  legal_notes?: string;
  version: string;
  is_active: boolean;
  suitable_for: string[];
  created_at: string;
  updated_at?: string;
}

// Backend template interface
export interface BackendTemplate {
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

// Map backend template to display template
export function mapBackendTemplateToDisplay(backendTemplate: BackendTemplate): TemplateDisplayInfo {
  const displayInfo = getContractTypeDisplayInfo(backendTemplate.contract_type);
  
  return {
    id: backendTemplate.id,
    name: backendTemplate.name,
    description: backendTemplate.description,
    contract_type: backendTemplate.contract_type as ContractType,
    compliance_features: backendTemplate.compliance_features,
    legal_notes: backendTemplate.legal_notes,
    version: backendTemplate.version,
    is_active: backendTemplate.is_active,
    suitable_for: backendTemplate.suitable_for,
    created_at: backendTemplate.created_at,
    updated_at: backendTemplate.updated_at,
    ...displayInfo,
  };
}

// Map multiple backend templates to display templates
export function mapBackendTemplatesToDisplay(backendTemplates: BackendTemplate[]): TemplateDisplayInfo[] {
  return backendTemplates.map(mapBackendTemplateToDisplay);
}
