import { useState, useCallback } from 'react';
import { ContractStep, UseContractStepsReturn, StepValidation } from '../types/contract-form';

const steps: ContractStep[] = [
  { id: 1, name: 'Choose Template', description: 'Select the right UK legal template' },
  { id: 2, name: 'Contract Details', description: 'Provide contract information' },
  { id: 3, name: 'Review & Generate', description: 'Review and create your contract' },
];

export function useContractSteps(validateStep: (step: number) => StepValidation): UseContractStepsReturn {
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = useCallback(() => {
    const validation = validateStep(currentStep);
    if (!validation.isValid) {
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const canProceed = useCallback(() => {
    const validation = validateStep(currentStep);
    return validation.isValid;
  }, [currentStep, validateStep]);

  return {
    currentStep,
    setCurrentStep,
    handleNext,
    handlePrevious,
    canProceed,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === steps.length,
    steps,
  };
}
