import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { GenerationStep } from '@/lib/types/resume';
import GenerationStepper from '@/components/ui/GenerationStepper';
import { DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLocalStorage } from "react-use";
import JobDescriptionFallback from '@/components/JobDescriptionFallback';
import { useResumeGeneration } from '@/hooks/useResumeGeneration';
import { formatErrorMessage, getErrorSuggestion, getErrorTrackingInfo } from '@/lib/errorHandling';

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
  const [showJobDescription, setShowJobDescription] = useState(true);
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      setGenerationCount((prev) => (prev || 0) + 1);
      
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
    <div className="space-y-6">
      {!tempKit ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resume Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Upload Your Resume</label>
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              {resumeFile ? (
                <div className="flex items-center justify-center space-x-2">
                  <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">{resumeFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setResumeFile(null);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-sm text-gray-600">
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
          <div className="space-y-2">
            <label htmlFor="jobUrl" className="block text-sm font-medium">
              Job Posting URL (Optional)
            </label>
            <input
              type="text"
              id="jobUrl"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://example.com/job-posting"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Job Description */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="jobDescription" className="block text-sm font-medium">
                Job Description
              </label>
              <button
                type="button"
                onClick={() => setShowJobDescription(!showJobDescription)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showJobDescription ? "Hide" : "Show"}
              </button>
            </div>
            {showJobDescription && (
              <>
                <textarea
                  id="jobDescription"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {!jdText && <JobDescriptionFallback />}
              </>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="block text-sm font-medium">
              Additional Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any specific instructions or information..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* AI Provider Selection */}
          <div className="space-y-2">
            <label htmlFor="provider" className="block text-sm font-medium">
              AI Provider
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>

          {/* Model Selection (conditionally shown) */}
          {provider !== 'auto' && (
            <div className="space-y-2">
              <label htmlFor="model" className="block text-sm font-medium">
                Model (Optional)
              </label>
              <input
                type="text"
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={`Enter specific ${provider} model name`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500">
                Leave blank to use the default model for the selected provider
              </p>
            </div>
          )}

          {/* Generation Count */}
          {generationCount !== null && generationCount > 0 && (
            <div className="text-xs text-gray-500 text-right">
              You've generated {generationCount} resume kit{generationCount !== 1 ? 's' : ''}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm">
              <div className="font-medium text-red-800">{formatErrorMessage(error)}</div>
              <div className="mt-1 text-red-700">{getErrorSuggestion(error)}</div>
              <div className="mt-2 text-xs text-gray-500">{getErrorTrackingInfo(error)}</div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isLoading || !resumeFile}
              className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isLoading || !resumeFile
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Generating...' : 'Generate Resume Kit'}
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
            <a
              href={tempKit.files.resumePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              <DocumentTextIcon className="h-12 w-12 text-blue-500 mb-2" />
              <span className="font-medium">Tailored Resume</span>
              <span className="text-sm text-gray-500">Download PDF</span>
            </a>
            
            <a
              href={tempKit.files.coverLetterPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              <DocumentTextIcon className="h-12 w-12 text-green-500 mb-2" />
              <span className="font-medium">Cover Letter</span>
              <span className="text-sm text-gray-500">Download PDF</span>
            </a>
            
            {tempKit.files.atsReportPdfUrl && (
              <a
                href={tempKit.files.atsReportPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <DocumentTextIcon className="h-12 w-12 text-purple-500 mb-2" />
                <span className="font-medium">ATS Report</span>
                <span className="text-sm text-gray-500">Download PDF</span>
              </a>
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