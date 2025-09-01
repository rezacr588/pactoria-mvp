import React, { useState, useCallback, useEffect } from 'react';
import { CheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { classNames } from '../../utils/classNames';
import Button from './Button';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  isValid?: boolean;
  isOptional?: boolean;
  component: React.ReactNode;
}

export interface WizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
  onComplete: () => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  canProceed?: boolean;
  className?: string;
  showStepNumbers?: boolean;
  allowStepClick?: boolean;
  persistProgress?: boolean;
  completedSteps?: number[];
}

const Wizard: React.FC<WizardProps> = ({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  isSubmitting = false,
  canProceed = true,
  className,
  showStepNumbers = true,
  allowStepClick = true,
  completedSteps = [],
}) => {
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward');

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1 && canProceed) {
      setAnimationDirection('forward');
      onStepChange(currentStep + 1);
    } else if (currentStep === steps.length - 1) {
      onComplete();
    }
  }, [currentStep, steps.length, canProceed, onStepChange, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setAnimationDirection('backward');
      onStepChange(currentStep - 1);
    }
  }, [currentStep, onStepChange]);

  const handleStepClick = useCallback((stepIndex: number) => {
    if (!allowStepClick) return;
    
    const direction = stepIndex > currentStep ? 'forward' : 'backward';
    setAnimationDirection(direction);
    onStepChange(stepIndex);
  }, [allowStepClick, currentStep, onStepChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'Enter':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (currentStep === steps.length - 1) {
              onComplete();
            } else {
              handleNext();
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (onCancel) onCancel();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, steps.length, handleNext, handlePrevious, onComplete, onCancel]);

  const getStepStatus = (stepIndex: number) => {
    if (completedSteps.includes(stepIndex)) return 'completed';
    if (stepIndex === currentStep) return 'current';
    if (stepIndex < currentStep) return 'completed';
    return 'pending';
  };

  const isStepAccessible = (stepIndex: number) => {
    if (!allowStepClick) return false;
    return stepIndex <= currentStep || completedSteps.includes(stepIndex);
  };

  return (
    <div className={classNames('max-w-4xl mx-auto', className)}>
      {/* Step Indicator */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center justify-center space-x-2 md:space-x-4">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isAccessible = isStepAccessible(index);
            
            return (
              <li key={step.id} className="flex items-center">
                {/* Step Indicator */}
                <div
                  className={classNames(
                    'relative flex items-center justify-center',
                    isAccessible && 'cursor-pointer',
                    !isAccessible && 'cursor-not-allowed'
                  )}
                  onClick={() => isAccessible && handleStepClick(index)}
                  role="button"
                  tabIndex={isAccessible ? 0 : -1}
                  aria-label={`Step ${index + 1}: ${step.title}`}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && isAccessible) {
                      e.preventDefault();
                      handleStepClick(index);
                    }
                  }}
                >
                  {/* Step Circle */}
                  <div
                    className={classNames(
                      'flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all duration-300',
                      status === 'completed'
                        ? 'bg-success-600 border-success-600 text-white'
                        : status === 'current'
                        ? 'bg-primary-600 border-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900/30'
                        : 'bg-white dark:bg-secondary-800 border-neutral-300 dark:border-secondary-600 text-neutral-500 dark:text-secondary-400',
                      isAccessible && status !== 'current' && 'hover:border-primary-400 hover:text-primary-600'
                    )}
                  >
                    {status === 'completed' ? (
                      <CheckIcon className="w-4 h-4 md:w-5 md:h-5" />
                    ) : showStepNumbers ? (
                      <span className="text-sm md:text-base font-semibold">{index + 1}</span>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-current" />
                    )}
                  </div>

                  {/* Step Info (Desktop) */}
                  <div className="hidden md:block absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-center min-w-max">
                    <p
                      className={classNames(
                        'text-sm font-medium transition-colors',
                        status === 'current'
                          ? 'text-primary-600 dark:text-primary-400'
                          : status === 'completed'
                          ? 'text-success-600 dark:text-success-400'
                          : 'text-neutral-500 dark:text-secondary-400'
                      )}
                    >
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-xs text-neutral-400 dark:text-secondary-500 mt-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={classNames(
                      'w-8 md:w-16 h-0.5 mx-2 md:mx-4 transition-colors duration-300',
                      getStepStatus(index + 1) !== 'pending'
                        ? 'bg-success-600'
                        : 'bg-neutral-300 dark:bg-secondary-600'
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* Mobile Step Info */}
        <div className="md:hidden mt-4 text-center">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-secondary-100">
            {steps[currentStep]?.title}
          </h2>
          {steps[currentStep]?.description && (
            <p className="text-sm text-neutral-600 dark:text-secondary-300 mt-1">
              {steps[currentStep].description}
            </p>
          )}
        </div>
      </nav>

      {/* Step Content */}
      <div className="relative">
        <div
          className={classNames(
            'transition-all duration-500 ease-in-out',
            animationDirection === 'forward' 
              ? 'animate-slide-in-right' 
              : 'animate-slide-in-left'
          )}
          key={currentStep}
        >
          {steps[currentStep]?.component}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-200 dark:border-secondary-700">
        <div className="flex items-center space-x-4">
          {/* Step Counter */}
          <div className="text-sm text-neutral-500 dark:text-secondary-400">
            Step {currentStep + 1} of {steps.length}
          </div>
          
          {/* Optional Step Indicator */}
          {steps[currentStep]?.isOptional && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
              Optional
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Cancel Button */}
          {onCancel && (
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
              size="sm"
            >
              Cancel
            </Button>
          )}

          {/* Previous Button */}
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isSubmitting}
            size="sm"
          >
            Previous
          </Button>

          {/* Next/Complete Button */}
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!canProceed}
            loading={isSubmitting}
            size="sm"
            icon={currentStep === steps.length - 1 ? undefined : <ChevronRightIcon />}
            iconPosition="right"
          >
            {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
          </Button>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-4 text-center text-xs text-neutral-400 dark:text-secondary-500">
        <p>
          Use <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-secondary-800 rounded text-neutral-600 dark:text-secondary-400">←</kbd> and{' '}
          <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-secondary-800 rounded text-neutral-600 dark:text-secondary-400">→</kbd> to navigate,{' '}
          <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-secondary-800 rounded text-neutral-600 dark:text-secondary-400">Ctrl+Enter</kbd> to proceed
        </p>
      </div>
    </div>
  );
};

export default Wizard;