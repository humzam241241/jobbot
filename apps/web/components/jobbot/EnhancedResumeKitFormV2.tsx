import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { GenerationStep } from '@/lib/types/resume';
import GenerationStepper from '@/components/ui/GenerationStepper';
import { DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import PDFPreview from './PDFPreview';
import { useLocalStorage } from "react-use";
import { useTokens } from "@/hooks/useTokens";
import JobDescriptionFallback from '@/components/JobDescriptionFallback';
import { useResumeGeneration } from '@/hooks/useResumeGeneration';
import { formatErrorMessage, getErrorSuggestion, getErrorTrackingInfo } from '@/lib/errorHandling';

// Helper functions for model selection
type ModelOption = { value: string; label: string };

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'openai': return 'gpt-4o-2024-05-13';
    case 'anthropic': return 'claude-3-5-sonnet';
    case 'gemini': return 'gemini-2.5-pro';
    case 'openrouter': return 'gpt-4o-2024-05-13';
    default: return 'auto';
  }
}

function getModelOptions(provider: string): ModelOption[] {
  switch (provider) {
    case 'openai':
      return [
        { value: 'gpt-4o-2024-05-13', label: 'GPT-4o (May 2024)' },
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4-vision-preview', label: 'GPT-4 Vision' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
      ];
    case 'anthropic':
      return [
        { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
        { value: 'claude-3-opus', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
        { value: 'claude-2', label: 'Claude 2' }
      ];
    case 'gemini':
      return [
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' }
      ];
    case 'openrouter':
      return [
        { value: 'gpt-4o-2024-05-13', label: 'GPT-4o (May 2024)' },
        { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
        { value: 'mistral/mistral-large-2', label: 'Mistral Large 2' },
        { value: 'meta-llama/llama-3-70b-instruct', label: 'Llama 3 70B' },
        { value: 'google/gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
      ];
    default:
      return [];
  }
}

type Kit = {
  kitId: string;
  providerUsedResume: string;
  modelUsedResume: string;
  files: {
    resumePdfUrl: string;
    coverLetterPdfUrl: string;
    atsReportPdfUrl?: string;
  };
};

const GENERATION_STEPS: GenerationStep[] = [
  {
    id: 'parse',
    label: 'Parse Files',
    description: 'Extracting content from uploaded files',
    status: 'pending'
  },
  {
    id: 'analyze',
    label: 'Analyze Content',
    description: 'Processing resume and job description',
    status: 'pending'
  },
  {
    id: 'tailor',
    label: 'Tailor Content',
    description: 'Customizing resume for the job',
    status: 'pending'
  },
  {
    id: 'format',
    label: 'Format Documents',
    description: 'Optimizing layout and styling',
    status: 'pending'
  },
  {
    id: 'ats',
    label: 'ATS Analysis',
    description: 'Calculating match score and suggestions',
    status: 'pending'
  },
];

export default function EnhancedResumeKitFormV2() {
  // Local state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [notes, setNotes] = useState('');
  const [provider, setProvider] = useState('auto');
  const [model, setModel] = useState('');
  const [showJobDescription, setShowJobDescription] = useState(true); // Always show by default
  const [generationCount, setGenerationCount] = useLocalStorage<number>('jobbot-generation-count', 0);
  const [activeStep, setActiveStep] = useState(0);
  const [steps, setSteps] = useState<GenerationStep[]>(GENERATION_STEPS);
  const [tempKit, setTempKit] = useState<Kit | null>(null);

  // Use our custom hook for resume generation
  const { 
    generateResume, 
    isLoading, 
    error, 
    result, 
    reset 
  } = useResumeGeneration({
    onProgress: (step, message) => {
      // Update the stepper based on progress updates
      if (step === 'parse') {
        updateStepStatus('parse', 'in_progress');
      } else if (step === 'analyze') {
        updateStepStatus('parse', 'completed');
        updateStepStatus('analyze', 'in_progress');
      } else if (step === 'tailor') {
        updateStepStatus('analyze', 'completed');
        updateStepStatus('tailor', 'in_progress');
      } else if (step === 'format') {
        updateStepStatus('tailor', 'completed');
        updateStepStatus('format', 'in_progress');
      } else if (step === 'ats') {
        updateStepStatus('format', 'completed');
        updateStepStatus('ats', 'in_progress');
      } else if (step === 'complete') {
        updateStepStatus('ats', 'completed');
      } else if (step === 'error') {
        // Mark current step as failed
        const currentStep = steps.find(s => s.status === 'in_progress');
        if (currentStep) {
          updateStepStatus(currentStep.id, 'failed');
        }
      }
    }
  });

  // File upload handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setResumeFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });

  // Helper function to update step status
  const updateStepStatus = (stepId: string, status: 'pending' | 'in_progress' | 'completed' | 'failed') => {
    setSteps(prevSteps => {
      const newSteps = [...prevSteps];
      const stepIndex = newSteps.findIndex(step => step.id === stepId);
      
      if (stepIndex !== -1) {
        newSteps[stepIndex] = { ...newSteps[stepIndex], status };
        
        // If a step is now in progress, update the active step
        if (status === 'in_progress') {
          setActiveStep(stepIndex);
        }
      }
      
      return newSteps;
    });
  };

  // Reset the form
  const handleReset = () => {
    setResumeFile(null);
    setJobUrl('');
    setJdText('');
    setNotes('');
    setProvider('auto');
    setModel('');
    setTempKit(null);
    setSteps(GENERATION_STEPS);
    setActiveStep(0);
    reset();
  };

  // Use token system
  const { tokensRemaining, useToken, error: tokenError } = useTokens();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // We don't need to check tokens here as the useResumeGeneration hook already does this
    // The token will be deducted after successful generation

    // Reset steps
    setSteps(GENERATION_STEPS.map(step => ({ ...step, status: 'pending' })));
    setActiveStep(0);
    
    // Start with parsing step
    updateStepStatus('parse', 'in_progress');

    // Create form data
    const formData = new FormData();
    
    if (resumeFile) {
      formData.append("resumeFile", resumeFile);
    }
    
    // Always append jobUrl (empty string if not provided)
    formData.append("jobUrl", jobUrl);
    
    if (jdText) {
      formData.append("jobDescriptionText", jdText);
    }
    
    formData.append("notes", notes);
    formData.append("provider", provider);
    
    if (model) {
      formData.append("model", model);
    }

    // Generate the resume
    const data = await generateResume(formData);
    
    if (data) {
      // Update generation count
      const newCount = (generationCount || 0) + 1;
      setGenerationCount(newCount);
      // Ensure it's immediately available in localStorage
      localStorage.setItem('jobbot-generation-count', newCount.toString());
      
      // Create a temporary kit object
      setTempKit({
        kitId: data.kitId,
        providerUsedResume: data.providerUsed || provider,
        modelUsedResume: data.modelUsed || model || 'default',
        files: {
          resumePdfUrl: data.files.resumePdfUrl,
          coverLetterPdfUrl: data.files.coverLetterPdfUrl,
          atsReportPdfUrl: data.files.atsReportPdfUrl
        }
      });
    }
  };

  return (
    <div className="space-y-8">
      {!tempKit ? (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Resume Upload */}
          <div className="space-y-3">
            <label className="block text-sm font-medium flex items-center gap-1">
              <span>Upload Your Resume</span>
              <span className="text-red-500">*</span>
            </label>
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              {resumeFile ? (
                <div className="flex items-center justify-center space-x-3">
                  <DocumentTextIcon className="h-6 w-6 text-blue-500" />
                  <span className="text-sm font-medium">{resumeFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setResumeFile(null);
                    }}
                    className="text-red-500 hover:text-red-700 rounded-full p-1 hover:bg-red-50 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <DocumentArrowUpIcon className="mx-auto h-14 w-14 text-gray-400" />
                  <p className="text-sm text-gray-600 font-medium">
                    {isDragActive
                      ? "Drop your resume here..."
                      : "Drag and drop your resume, or click to select"}
                  </p>
                  <p className="text-xs text-gray-500">PDF, DOCX, or TXT (Max 10MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Job URL */}
          <div className="space-y-3">
            <label htmlFor="jobUrl" className="block text-sm font-medium">
              Job Posting URL <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="jobUrl"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://example.com/job-posting"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label htmlFor="jobDescription" className="block text-sm font-medium flex items-center gap-2">
                Job Description 
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">Recommended</span>
              </label>
              <button
                type="button"
                onClick={() => setShowJobDescription(!showJobDescription)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {showJobDescription ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Hide
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Show
                  </>
                )}
              </button>
            </div>
            {showJobDescription && (
              <>
                <textarea
                  id="jobDescription"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the job description here for better tailoring..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                {!jdText && <JobDescriptionFallback />}
              </>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <label htmlFor="notes" className="block text-sm font-medium">
              Additional Notes <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <div className="relative">
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any specific instructions or information..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {notes && (
                <button
                  type="button"
                  onClick={() => setNotes('')}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* AI Provider and Model Selection (side by side) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="provider" className="text-sm font-medium">
                AI Settings
              </label>
              {provider !== 'auto' && (
                <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Default model: {getDefaultModel(provider)}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* AI Provider */}
              <div className="relative">
                <select
                  id="provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-colors"
                >
                  <option value="auto">Auto (Recommended)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Model Selection */}
              <div className={`relative ${provider === 'auto' ? 'opacity-50' : ''}`}>
                <select
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={provider === 'auto'}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-colors disabled:bg-gray-100"
                >
                  <option value="">Default Model</option>
                  {getModelOptions(provider).map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Token and Generation Count */}
          <div className="flex justify-between items-center text-xs">
            <div className="text-blue-600 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {tokensRemaining} token{tokensRemaining !== 1 ? 's' : ''} remaining today
            </div>
            
            {generationCount !== null && generationCount > 0 && (
              <div className="text-gray-500 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {generationCount} resume kit{generationCount !== 1 ? 's' : ''} generated
              </div>
            )}
          </div>

          {/* Token Error */}
          {tokenError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {tokenError}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm shadow-sm">
              <div className="font-medium text-red-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatErrorMessage(error)}
              </div>
              <div className="mt-2 text-red-700">{getErrorSuggestion(error)}</div>
              <div className="mt-2 text-xs text-gray-500 font-mono">{getErrorTrackingInfo(error)}</div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="px-5 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isLoading || !resumeFile}
              className={`px-5 py-2.5 rounded-lg shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                isLoading || !resumeFile
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : 'Generate Resume Kit'}
            </button>
          </div>

          {/* Progress Indicator */}
          {isLoading && (
            <div className="mt-6">
              <GenerationStepper steps={steps} activeStep={activeStep} />
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-green-800">Resume Kit Generated!</h3>
            <p className="mt-1 text-sm text-green-700">
              Your tailored resume, cover letter, and ATS report are ready to download.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PDFPreview
              pdfUrl={tempKit.files.resumePdfUrl}
              fileName={tempKit.files.resumeFileName || 'resume.pdf'}
              title="Tailored Resume"
              iconColor="text-blue-500"
            />
            
            <PDFPreview
              pdfUrl={tempKit.files.coverLetterPdfUrl}
              fileName={tempKit.files.coverLetterFileName || 'cover_letter.pdf'}
              title="Cover Letter"
              iconColor="text-green-500"
            />
            
            {tempKit.files.atsReportPdfUrl && (
              <PDFPreview
                pdfUrl={tempKit.files.atsReportPdfUrl}
                fileName={tempKit.files.atsReportFileName || 'ats_report.pdf'}
                title="ATS Report"
                iconColor="text-purple-500"
              />
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-md text-sm">
            <p className="font-medium">Generation Details:</p>
            <p>Provider: {tempKit.providerUsedResume}</p>
            <p>Model: {tempKit.modelUsedResume}</p>
            <p className="text-xs text-gray-500 mt-2">Kit ID: {tempKit.kitId}</p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Generate Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}