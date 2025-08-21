"use client";

import { Fragment } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { GenerationStep } from '@/lib/types/resume';

interface GenerationStepperProps {
  steps: GenerationStep[];
  currentStep: string;
}

export default function GenerationStepper({ steps, currentStep }: GenerationStepperProps) {
  return (
    <div className="w-full py-4 bg-background/40 border border-border rounded-xl">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />

          {/* Steps */}
          <ul role="list" className="space-y-6">
            {steps.map((step, stepIdx) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.status === 'completed';
              const isError = step.status === 'error';
              const isProcessing = step.status === 'processing';

              return (
                <li key={step.id} className="relative flex gap-x-4">
                  {/* Step Indicator */}
                  <div className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full ${
                    isCompleted ? 'bg-primary' :
                    isError ? 'bg-red-500' :
                    isActive ? 'bg-primary/70 animate-pulse' :
                    'bg-muted'
                  }`}>
                    {isCompleted ? (
                      <CheckIcon className="h-5 w-5 text-primary-foreground" />
                    ) : isError ? (
                      <XMarkIcon className="h-5 w-5 text-white" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5 pl-10">
                    <div>
                      <p className={`text-sm font-medium ${
                        isCompleted ? 'text-foreground' :
                        isError ? 'text-red-400' :
                        isActive ? 'text-foreground' :
                        'text-muted-foreground'
                      }`}>
                        {step.label}
                      </p>
                      {step.description && (
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      )}
                      {isError && step.error && (
                        <p className="text-xs text-red-400 mt-1">{step.error}</p>
                      )}
                    </div>
                    {isProcessing && step.progress !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{step.progress}%</span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}