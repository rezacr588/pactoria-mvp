import { useCallback, useMemo } from 'react';
import { useContractStore } from '../store/contractStore';
import { ContractTemplate } from '../types';

export interface UseTemplatesOptions {
  autoFetch?: boolean;
  filters?: {
    contract_type?: string;
    category?: string;
  };
}

export interface UseTemplatesReturn {
  templates: ContractTemplate[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTemplates: (params?: Record<string, unknown>) => Promise<void>;
  
  // Computed values
  templatesByType: Record<string, ContractTemplate[]>;
  templatesByCategory: Record<string, ContractTemplate[]>;
  totalTemplates: number;
  hasTemplates: boolean;
  getTemplateById: (id: string) => ContractTemplate | undefined;
}

export function useTemplates(options: UseTemplatesOptions = {}): UseTemplatesReturn {
  const { 
    templates,
    isLoading,
    error,
    fetchTemplates: storeFetchTemplates,
  } = useContractStore();

  const { filters = {} } = options;

  // Enhanced fetch with options
  const fetchTemplates = useCallback(async (params = {}) => {
    const mergedParams = {
      ...filters,
      ...params
    };
    return storeFetchTemplates(mergedParams);
  }, [storeFetchTemplates, filters]);

  // Group templates by type
  const templatesByType = useMemo(() => {
    const grouped: Record<string, ContractTemplate[]> = {};
    templates.forEach((template: ContractTemplate) => {
      const type = template.contract_type || 'other';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(template);
    });
    return grouped;
  }, [templates]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, ContractTemplate[]> = {};
    templates.forEach((template: ContractTemplate) => {
      const category = template.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(template);
    });
    return grouped;
  }, [templates]);

  const totalTemplates = templates.length;
  const hasTemplates = totalTemplates > 0;

  // Get template by ID
  const getTemplateById = useCallback((id: string): ContractTemplate | undefined => {
    return templates.find(template => template.id === id);
  }, [templates]);

  return {
    templates,
    isLoading,
    error,
    
    // Actions
    fetchTemplates,
    
    // Computed values
    templatesByType,
    templatesByCategory,
    totalTemplates,
    hasTemplates,
    getTemplateById,
  };
}
