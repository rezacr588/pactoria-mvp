import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircleIcon,
  XMarkIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useContractStore } from '../store/contractStore';
import { useAuthStore } from '../store/authStore';
import { textStyles, textColors } from '../utils/typography';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: {
    text: string;
    link: string;
  };
  icon: React.ComponentType<{ className?: string }>;
}

interface OnboardingChecklistProps {
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export default function OnboardingChecklist({ onDismiss, showDismiss = true }: OnboardingChecklistProps) {
  const { contracts, teamMembers, fetchContracts, fetchTeamMembers } = useContractStore();
  const { user } = useAuthStore();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);

  useEffect(() => {
    const initializeSteps = async () => {
      await Promise.all([fetchContracts(), fetchTeamMembers()]);
      
      const onboardingSteps: OnboardingStep[] = [
        {
          id: 'create-contract',
          title: 'Create your first contract',
          description: 'Use our 3-step wizard to generate a UK-compliant contract in minutes',
          completed: contracts.length > 0,
          action: {
            text: 'Create Contract',
            link: '/contracts/new'
          },
          icon: DocumentPlusIcon
        },
        {
          id: 'invite-team',
          title: 'Invite your team',
          description: 'Collaborate with up to 5 team members on your Professional plan',
          completed: teamMembers.length > 1,
          action: {
            text: 'Manage Team',
            link: '/team'
          },
          icon: UserPlusIcon
        },
        {
          id: 'explore-help',
          title: 'Learn the basics',
          description: 'Explore our help documentation to master Pactoria features',
          completed: false, // This could be tracked with user interaction data
          action: {
            text: 'View Help',
            link: '/help'
          },
          icon: BookOpenIcon
        },
        {
          id: 'review-compliance',
          title: 'Understand compliance scoring',
          description: 'Learn how our AI evaluates UK legal compliance for your contracts',
          completed: contracts.some(contract => contract.complianceScore.overall >= 90),
          action: {
            text: contracts.length > 0 ? 'View Contract' : 'Create Contract',
            link: contracts.length > 0 ? `/contracts/${contracts[0].id}` : '/contracts/new'
          },
          icon: Cog6ToothIcon
        }
      ];

      setSteps(onboardingSteps);
    };

    if (user) {
      initializeSteps();
    }
  }, [contracts, teamMembers, user, fetchContracts, fetchTeamMembers]);

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  // Don't show if all steps are completed
  if (completedSteps === totalSteps) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-lg border border-neutral-200 dark:border-secondary-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-950/30 rounded-lg flex items-center justify-center">
              <BookOpenIcon className={`h-6 w-6 ${textColors.interactive}`} />
            </div>
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${textColors.primary}`}>Get Started with Pactoria</h3>
            <p className={textStyles.formHelpText}>
              Complete these steps to set up your contract management workspace
            </p>
          </div>
        </div>
        {showDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className={`${textColors.subtle} hover:${textColors.muted.split(' ')[0]} transition-colors`}
            aria-label="Dismiss onboarding checklist"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className={`flex items-center justify-between ${textStyles.metadata} mb-3`}>
          <span className="font-medium">Setup Progress</span>
          <span className={`${textColors.primary} font-semibold`}>{completedSteps} of {totalSteps} completed</span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-secondary-700 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-primary-600 to-primary-500 dark:from-primary-500 dark:to-primary-400 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {progressPercentage > 0 && (
          <div className={`text-xs ${textColors.muted} mt-1 text-right`}>
            {Math.round(progressPercentage)}% complete
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => {
          const IconComponent = step.icon;
          return (
            <div
              key={step.id}
              className={`flex items-start space-x-4 p-4 rounded-xl transition-all duration-200 ${
                step.completed 
                  ? 'bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800 shadow-soft' 
                  : 'bg-neutral-50 dark:bg-secondary-800 border border-neutral-200 dark:border-secondary-700 hover:bg-neutral-100 dark:hover:bg-secondary-700 hover:shadow-soft hover:border-neutral-300 dark:hover:border-secondary-600'
              }`}
            >
              <div className="flex-shrink-0">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  step.completed 
                    ? 'bg-success-100 dark:bg-success-900/30' 
                    : 'bg-neutral-100 dark:bg-secondary-700'
                }`}>
                  {step.completed ? (
                    <CheckCircleIcon className={`h-5 w-5 ${textColors.success}`} />
                  ) : (
                    <IconComponent className={`h-5 w-5 ${textColors.subtle}`} />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0 flex-grow">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`text-sm font-medium ${
                      step.completed ? textColors.success : textColors.primary
                    }`}>
                      {step.title}
                    </h4>
                    <p className={`text-sm ${
                      step.completed ? textColors.success : textColors.secondary
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  {!step.completed && (
                    <Link
                      to={step.action.link}
                      className={`inline-flex items-center px-3 py-1.5 text-sm font-medium ${textColors.interactive} ${textColors.interactiveHover} bg-primary-50 dark:bg-primary-950/20 rounded-lg border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-950/30 transition-colors whitespace-nowrap`}
                    >
                      {step.action.text}
                      <ChevronRightIcon className="h-4 w-4 ml-1" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Message */}
      {completedSteps > 0 && completedSteps < totalSteps && (
        <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-950/20 dark:to-blue-950/20 rounded-xl border border-primary-200 dark:border-primary-800">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">{completedSteps}</span>
              </div>
            </div>
            <div>
              <p className={`text-sm font-medium text-primary-700 dark:text-primary-400 mb-1`}>
                Excellent progress!
              </p>
              <p className={`text-sm text-primary-600 dark:text-primary-500`}>
                You've completed {completedSteps} of {totalSteps} onboarding steps. 
                Keep going to unlock the full potential of Pactoria.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}