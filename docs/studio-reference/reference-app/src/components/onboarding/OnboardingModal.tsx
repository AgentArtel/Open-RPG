import { cn } from '@/lib/utils';
import { useState } from 'react';
import { X, ArrowRight, Sparkles, Workflow, Key, Play } from 'lucide-react';
import { OnboardingStep } from './OnboardingStep';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  className?: string;
}

const steps = [
  {
    title: 'Welcome to Open Agent Artel',
    description: 'Let\'s get you set up with your first AI automation workflow.',
    icon: Sparkles,
  },
  {
    title: 'Create Your First Workflow',
    description: 'Start by creating a simple workflow with a trigger and an AI agent.',
    icon: Workflow,
  },
  {
    title: 'Connect Your Credentials',
    description: 'Add your API keys for OpenAI, Claude, or other services.',
    icon: Key,
  },
  {
    title: 'Test Your Agent',
    description: 'Run your workflow and see your AI agent in action!',
    icon: Play,
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  className = '',
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
      onClose();
    }
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  if (!isOpen) return null;

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className={cn(
          'relative w-full max-w-2xl bg-dark-100 border border-white/10 rounded-3xl shadow-2xl overflow-hidden',
          'animate-scale-in',
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex min-h-[500px]">
          {/* Left side - Progress */}
          <div className="w-64 bg-dark-200/50 p-6 border-r border-white/5">
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white">Getting Started</h3>
              <p className="text-xs text-white/40 mt-1">Step {currentStep + 1} of {steps.length}</p>
            </div>

            <div className="space-y-2">
              {steps.map((step, index) => (
                <OnboardingStep
                  key={index}
                  number={index + 1}
                  title={step.title}
                  description={step.description}
                  isActive={index === currentStep}
                  isCompleted={index < currentStep}
                />
              ))}
            </div>
          </div>

          {/* Right side - Content */}
          <div className="flex-1 flex flex-col p-8">
            {/* Icon */}
            <div className="w-20 h-20 rounded-2xl bg-green/20 flex items-center justify-center mb-6">
              <CurrentIcon className="w-10 h-10 text-green" />
            </div>

            {/* Title & Description */}
            <h2 className="text-2xl font-bold text-white mb-3">
              {steps[currentStep].title}
            </h2>
            <p className="text-white/60 leading-relaxed mb-8">
              {steps[currentStep].description}
            </p>

            {/* Step-specific content */}
            <div className="flex-1">
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-dark-200 border border-white/5">
                    <p className="text-sm text-white/70">
                      Open Agent Artel is a powerful platform for building AI automation workflows. 
                      Connect AI agents, tools, and services to create intelligent automations.
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm text-white/50">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green" />
                      Visual workflow builder
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green" />
                      Multi-provider AI support
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green" />
                      Real-time execution monitoring
                    </li>
                  </ul>
                </div>
              )}

              {currentStep === 1 && (
                <div className="p-4 rounded-xl bg-dark-200 border border-white/5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <span className="text-blue-400 text-lg">T</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Chat Trigger</p>
                      <p className="text-xs text-white/40">Start workflow on message</p>
                    </div>
                  </div>
                  <div className="h-8 w-0.5 bg-white/10 ml-5" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-green" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">AI Agent</p>
                      <p className="text-xs text-white/40">Process with AI</p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="grid grid-cols-2 gap-3">
                  {['OpenAI', 'Anthropic', 'Google', 'Slack'].map((service) => (
                    <div 
                      key={service}
                      className="p-3 rounded-xl bg-dark-200 border border-white/5 hover:border-green/30 transition-colors cursor-pointer"
                    >
                      <p className="text-sm text-white/70">{service}</p>
                    </div>
                  ))}
                </div>
              )}

              {currentStep === 3 && (
                <div className="p-6 rounded-xl bg-green/5 border border-green/20 text-center">
                  <p className="text-green font-medium mb-2">You're all set!</p>
                  <p className="text-sm text-white/60">
                    Click "Get Started" to begin building your first workflow.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
              <button
                onClick={handleSkip}
                className="text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm bg-green text-dark font-medium hover:bg-green/90 transition-colors"
                >
                  {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
