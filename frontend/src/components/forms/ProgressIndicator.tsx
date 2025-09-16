
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { ContractStep } from '../../types/contract-form';
import { textColors } from '../../utils/typography';

interface ProgressIndicatorProps {
  steps: ContractStep[];
  currentStep: number;
}

export function ProgressIndicator({ steps, currentStep }: ProgressIndicatorProps) {
  return (
    <nav aria-label="Progress" className="mb-10">
      <div className="max-w-2xl mx-auto">
        <ol className="flex items-center justify-between">
          {steps.map((step, stepIdx) => (
            <li key={step.name} className="relative flex-1">
              {stepIdx !== steps.length - 1 && (
                <div className="absolute top-4 left-1/2 w-full h-0.5 -ml-px" aria-hidden="true">
                  <div className={`h-full transition-all duration-500 ease-out ${
                    currentStep > step.id
                      ? 'bg-gradient-to-r from-primary-600 to-primary-500'
                      : 'bg-neutral-200 dark:bg-secondary-700'
                  }`} />
                </div>
              )}
              <div className="relative flex flex-col items-center group">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 transform ${
                  currentStep > step.id
                    ? 'bg-primary-600 border-primary-600 scale-110'
                    : currentStep === step.id
                    ? 'bg-white dark:bg-secondary-800 border-primary-600 ring-4 ring-primary-100 dark:ring-primary-900/30 scale-110'
                    : 'bg-white dark:bg-secondary-800 border-neutral-300 dark:border-secondary-600 hover:border-primary-300 dark:hover:border-primary-600'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircleIcon className="h-5 w-5 text-white animate-scale-in" />
                  ) : (
                    <span className={`h-2.5 w-2.5 rounded-full transition-colors duration-200 ${
                      currentStep === step.id
                        ? 'bg-primary-600 animate-pulse'
                        : 'bg-neutral-300 dark:bg-secondary-600'
                    }`} />
                  )}
                </div>
                <div className="mt-4 text-center max-w-32">
                  <div className={`text-sm font-medium transition-colors duration-200 ${
                    currentStep >= step.id
                      ? 'text-primary-600 dark:text-primary-400'
                      : textColors.muted
                  }`}>
                    {step.name}
                  </div>
                  <div className={`text-xs mt-1 ${textColors.muted} leading-tight`}>
                    {step.description}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
