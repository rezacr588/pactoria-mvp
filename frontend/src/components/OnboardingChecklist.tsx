import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircleIcon,
  XMarkIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  CogIcon,
  BookOpenIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useContractStore } from '../store/contractStore';
import { useAuthStore } from '../store/authStore';

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
          icon: CogIcon
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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <BookOpenIcon className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Get Started with Pactoria</h3>
            <p className="text-sm text-gray-600">
              Complete these steps to set up your contract management workspace
            </p>
          </div>
        </div>
        {showDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss onboarding checklist"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{completedSteps} of {totalSteps} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => {
          const IconComponent = step.icon;
          return (
            <div
              key={step.id}
              className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                step.completed 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                ) : (
                  <IconComponent className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`text-sm font-medium ${
                      step.completed ? 'text-green-900' : 'text-gray-900'
                    }`}>
                      {step.title}
                    </h4>
                    <p className={`text-sm ${
                      step.completed ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  {!step.completed && (
                    <Link
                      to={step.action.link}
                      className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 whitespace-nowrap"
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
        <div className="mt-6 p-4 bg-primary-50 rounded-lg">
          <p className="text-sm text-primary-700">
            Great progress! You've completed {completedSteps} of {totalSteps} onboarding steps. 
            Keep going to unlock the full potential of Pactoria.
          </p>
        </div>
      )}
    </div>
  );
}