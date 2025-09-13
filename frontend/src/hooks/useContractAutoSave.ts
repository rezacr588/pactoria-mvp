import { useState, useEffect, useCallback } from 'react';
import { ContractFormData, ContractDraft, UseContractAutoSaveReturn } from '../types/contract-form';

export function useContractAutoSave(formData: ContractFormData): UseContractAutoSaveReturn {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem('contract-draft');
      if (draft) {
        const parsedDraft: ContractDraft = JSON.parse(draft);
        setLastSaved(new Date(parsedDraft.lastSaved));
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, []);

  const saveDraft = useCallback(async () => {
    if (!formData.name && !formData.clientName) return;

    setIsAutoSaving(true);
    try {
      const draft: ContractDraft = {
        ...formData,
        lastSaved: new Date().toISOString()
      };

      localStorage.setItem('contract-draft', JSON.stringify(draft));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setTimeout(() => setIsAutoSaving(false), 500);
    }
  }, [formData]);

  // Auto-save with debounce
  useEffect(() => {
    const timer = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timer);
  }, [saveDraft]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem('contract-draft');
    setLastSaved(null);
  }, []);

  return {
    isAutoSaving,
    lastSaved,
    clearDraft,
    saveDraft,
  };
}
