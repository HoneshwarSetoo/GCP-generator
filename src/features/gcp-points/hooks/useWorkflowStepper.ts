import { useState } from 'react';
import { WorkflowStep } from '../types';

export function useWorkflowStepper() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');

  const goToProcess = () => setCurrentStep('process');
  const goToCustomCrop = () => setCurrentStep('custom_crop');
  const goToAlign = () => setCurrentStep('align');
  const goToUpload = () => setCurrentStep('upload');
  const goToDownload = () => setCurrentStep('download');

  return {
    currentStep,
    setCurrentStep,
    goToProcess,
    goToCustomCrop,
    goToAlign,
    goToUpload,
    goToDownload,
  };
}
