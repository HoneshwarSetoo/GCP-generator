import React from 'react';
import { WorkflowStep } from '../types';
import { Check } from 'lucide-react';

interface WorkflowStepperProps {
  currentStep: WorkflowStep;
}

export function WorkflowStepper({ currentStep }: WorkflowStepperProps) {
  const steps: { id: WorkflowStep; label: string }[] = [
    { id: 'upload', label: 'Upload' },
    { id: 'process', label: 'Process' },
    { id: 'custom_crop', label: 'Custom Crop' },
    { id: 'align', label: 'Generate TIFF' },
  ];

  const getStepIndex = (stepId: WorkflowStep) => steps.findIndex(s => s.id === stepId);
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full flex items-center justify-center py-6 mb-6">
      <div className="flex items-center w-full max-w-3xl">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center relative">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors z-10 ${
                    isCompleted 
                      ? 'bg-primary text-primary-foreground' 
                      : isCurrent 
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' 
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check size={18} strokeWidth={3} /> : index + 1}
                </div>
                <span className={`absolute top-12 text-xs font-medium whitespace-nowrap ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded-full transition-colors ${
                  index < currentIndex ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
