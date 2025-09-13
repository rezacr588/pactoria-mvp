import { useState, useEffect, useCallback } from 'react';
import { TemplateService } from '../services/api';
import { mapBackendTemplatesToDisplay, TemplateDisplayInfo } from '../utils/templateMapping';
import { UseContractTemplatesReturn } from '../types/contract-form';

export function useContractTemplates(): UseContractTemplatesReturn {
  const [templates, setTemplates] = useState<TemplateDisplayInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await TemplateService.getTemplates();
      const mappedTemplates = mapBackendTemplatesToDisplay(response.templates);
      setTemplates(mappedTemplates);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const refetch = useCallback(async () => {
    await fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    isLoading,
    error,
    selectedTemplate: undefined, // This will be computed based on form data
    refetch,
  };
}
