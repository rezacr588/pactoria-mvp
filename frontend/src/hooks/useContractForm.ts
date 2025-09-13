import { useState, useCallback } from 'react';
import { ContractFormData, FormErrors, StepValidation, UseContractFormReturn } from '../types/contract-form';

const initialFormData: ContractFormData = {
  templateId: '',
  name: '',
  description: '',
  clientName: '',
  clientEmail: '',
  serviceDescription: '',
  contractValue: '',
  startDate: '',
  endDate: '',
  paymentTerms: '30',
  specialTerms: '',
  plainEnglishInput: '',
  supplierName: '',
  currency: 'GBP',
};

export function useContractForm(): UseContractFormReturn {
  const [formData, setFormData] = useState<ContractFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const validateStep = useCallback((step: number): StepValidation => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 1:
        if (!formData.templateId) {
          newErrors.templateId = 'Please select a contract template';
        }
        break;
      case 2:
        if (!formData.name.trim()) {
          newErrors.name = 'Contract name is required';
        }
        if (!formData.clientName.trim()) {
          newErrors.clientName = 'Client name is required';
        }
        if (!formData.serviceDescription.trim()) {
          newErrors.serviceDescription = 'Service description is required';
        }
        if (formData.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
          newErrors.clientEmail = 'Please enter a valid email address';
        }
        if (formData.contractValue && isNaN(Number(formData.contractValue))) {
          newErrors.contractValue = 'Please enter a valid number';
        }
        if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
          newErrors.endDate = 'End date must be after start date';
        }
        break;
    }

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    setFormData,
    setErrors,
    handleInputChange,
    validateStep,
    resetForm,
  };
}
