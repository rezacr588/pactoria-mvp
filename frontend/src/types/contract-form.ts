import { ContractType } from '../types';
import { TemplateDisplayInfo } from '../utils/templateMapping';

// Contract Form Data Types
export interface ContractFormData {
  templateId: string;
  name: string;
  description: string;
  clientName: string;
  clientEmail: string;
  serviceDescription: string;
  contractValue: string;
  startDate: string;
  endDate: string;
  paymentTerms: string;
  specialTerms: string;
  plainEnglishInput: string;
  supplierName: string;
  currency: string;
}

// Form Validation Types
export interface FormErrors {
  [key: string]: string;
}

export interface StepValidation {
  isValid: boolean;
  errors: FormErrors;
}

// Step Navigation Types
export interface ContractStep {
  id: number;
  name: string;
  description: string;
}

// Auto-save Types
export interface ContractDraft extends ContractFormData {
  lastSaved: string;
}


// Hook Return Types
export interface UseContractFormReturn {
  formData: ContractFormData;
  errors: FormErrors;
  setFormData: React.Dispatch<React.SetStateAction<ContractFormData>>;
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  validateStep: (step: number) => StepValidation;
  resetForm: () => void;
}

export interface UseContractStepsReturn {
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  handleNext: () => void;
  handlePrevious: () => void;
  canProceed: () => boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  steps: ContractStep[];
}

export interface UseContractAutoSaveReturn {
  isAutoSaving: boolean;
  lastSaved: Date | null;
  clearDraft: () => void;
  saveDraft: () => Promise<void>;
}

export interface UseContractTemplatesReturn {
  templates: TemplateDisplayInfo[];
  isLoading: boolean;
  error: string | null;
  selectedTemplate: TemplateDisplayInfo | undefined;
  refetch: () => Promise<void>;
}
