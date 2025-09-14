import { useEffect, useState } from 'react';
import { SparklesIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface AIGenerationLoadingProps {
  isVisible: boolean;
  onComplete?: () => void;
}

interface GenerationStep {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  status: 'pending' | 'active' | 'completed';
}

const generationSteps: GenerationStep[] = [
  {
    id: 'analyzing',
    title: 'Analyzing Requirements',
    description: 'Processing your contract requirements and specifications',
    duration: 2,
    status: 'pending',
  },
  {
    id: 'generating',
    title: 'Generating Content',
    description: 'AI is crafting your UK-compliant contract using legal expertise',
    duration: 8,
    status: 'pending',
  },
  {
    id: 'reviewing',
    title: 'Compliance Review',
    description: 'Ensuring GDPR compliance and UK legal standards',
    duration: 3,
    status: 'pending',
  },
  {
    id: 'finalizing',
    title: 'Finalizing Contract',
    description: 'Applying final formatting and structure',
    duration: 1,
    status: 'pending',
  },
];

export default function AIGenerationLoading({ isVisible, onComplete }: AIGenerationLoadingProps) {
  const [steps, setSteps] = useState<GenerationStep[]>(generationSteps);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      // Reset state when not visible
      setSteps(generationSteps.map(step => ({ ...step, status: 'pending' })));
      setProgress(0);
      return;
    }

    // Start the progression
    let currentTime = 0;
    
    const progressInterval = setInterval(() => {
      currentTime += 0.1;
      const totalTime = generationSteps.reduce((sum, step) => sum + step.duration, 0);
      const newProgress = Math.min((currentTime / totalTime) * 100, 100);
      setProgress(newProgress);

      // Update step statuses
      let accumulatedTime = 0;
      const updatedSteps = generationSteps.map((step) => {
        const stepStartTime = accumulatedTime;
        const stepEndTime = accumulatedTime + step.duration;
        accumulatedTime += step.duration;

        if (currentTime < stepStartTime) {
          return { ...step, status: 'pending' as const };
        } else if (currentTime >= stepStartTime && currentTime < stepEndTime) {
          return { ...step, status: 'active' as const };
        } else {
          return { ...step, status: 'completed' as const };
        }
      });

      setSteps(updatedSteps);

      // Complete when done
      if (newProgress >= 100) {
        clearInterval(progressInterval);
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }
    }, 100);

    return () => clearInterval(progressInterval);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <SparklesIcon className="h-12 w-12 text-indigo-600 animate-pulse" />
              <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-25"></div>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Generating Your Contract
          </h3>
          <p className="text-gray-600">
            Our AI is crafting a professional, UK-compliant contract for you
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {step.status === 'completed' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : step.status === 'active' ? (
                  <div className="relative">
                    <ClockIcon className="h-5 w-5 text-indigo-600 animate-spin" />
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${
                  step.status === 'completed' ? 'text-green-600' :
                  step.status === 'active' ? 'text-indigo-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </div>
                <div className={`text-xs mt-1 ${
                  step.status === 'active' ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center text-sm text-gray-500">
            <SparklesIcon className="h-4 w-4 mr-2" />
            Powered by AI • Typically takes 10-15 seconds
          </div>
        </div>
      </div>
    </div>
  );
}