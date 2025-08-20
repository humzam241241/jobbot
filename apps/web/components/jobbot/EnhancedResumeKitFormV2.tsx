'use client';

import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLocalStorage } from "react-use";
import { DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Toaster } from 'react-hot-toast';
import JobDescriptionFallback from '@/components/JobDescriptionFallback';
import GenerationStepper from '@/components/ui/GenerationStepper';
import { GenerationStep } from '@/lib/types/resume';
import { useGeneration } from '@/hooks/useGeneration';

// Generation steps
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
  {
    id: 'generate',
    label: 'Generate Files',
    description: 'Creating final documents',
    status: 'pending'
  }
];

// Available models per provider
const MODEL_SETS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  gemini: [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],
  openrouter: [
    { value: 'openai/gpt-4o', label: 'GPT-4o (OpenRouter)' },
    { value: 'anthropic/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (OpenRouter)' },
    { value: 'google/gemini-pro', label: 'Gemini Pro (OpenRouter)' },
  ],
  auto: [
    { value: '', label: 'Default model' },
  ],
};

export default function EnhancedResumeKitFormV2() {
  // State
  const [masterResumeText, setMasterResumeText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [notes, setNotes] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [provider, setProvider] = useState('auto');
  const [model, setModel] = useState('');
  const [showJdFallback, setShowJdFallback] = useState(false);
  const [steps, setSteps] = useState<GenerationStep[]>(GENERATION_STEPS);
  
  // Local storage
  const [generationCount, setGenerationCount] = useLocalStorage<number>("generationCount", 0);
  
  // Generation hook
  const { 
    phase, 
    progress, 
    error, 
    result, 
    generate, 
    retry, 
    reset, 
    downloadFile, 
    isLoading, 
    isComplete, 
    isError 
  } = useGeneration();
  
  // Update steps based on phase
  useEffect(() => {
    const newSteps = [...GENERATION_STEPS];
    
    switch (phase) {
      case 'validating':
        newSteps[0].status = 'active';
        break;
      case 'generating':
        newSteps[0].status = 'complete';
        newSteps[1].status = 'active';
        newSteps[2].status = 'active';
        break;
      case 'rendering':
        newSteps[0].status = 'complete';
        newSteps[1].status = 'complete';
        newSteps[2].status = 'complete';
        newSteps[3].status = 'active';
        newSteps[4].status = 'active';
        newSteps[5].status = 'active';
        break;
      case 'done':
        newSteps.forEach(step => step.status = 'complete');
        break;
      case 'error':
        // Mark current step as error
        const errorStep = newSteps.findIndex(s => s.status === 'active');
        if (errorStep >= 0) {
          newSteps[errorStep].status = 'error';
        }
        break;
      default:
        // Reset steps
        newSteps.forEach(step => step.status = 'pending');
        break;
    }
    
    setSteps(newSteps);
  }, [phase]);
  
  // File dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setResumeFile(acceptedFiles[0]);
        
        // Read text content if it's a text file
        if (acceptedFiles[0].type === 'text/plain') {
          const text = await acceptedFiles[0].text();
          setMasterResumeText(text);
        } else {
          setMasterResumeText(''); // Clear text if file is not text
        }
      }
    },
  });
  
  // Handle form submission
  const handleGenerate = async () => {
    // Validate inputs
    if (!resumeFile && !masterResumeText) {
      alert('Please upload a resume file or paste resume text');
      return;
    }
    
    if (!jobUrl && !jobDescriptionText) {
      alert('Please enter a job URL or job description');
      return;
    }
    
    // Increment generation count
    setGenerationCount((prev) => (prev || 0) + 1);
    
    // Prepare form data
    const options = {
      jobDescription: {
        jobUrl: jobUrl || undefined,
        jobDescriptionText: jobDescriptionText || undefined,
      },
      resumeText: masterResumeText,
      providerPreference: provider as 'openai' | 'anthropic' | 'google' | 'auto',
      model: model || undefined,
    };
    
    // Generate resume kit
    await generate(options);
  };
  
  // Handle job description fallback
  const handleJdFallbackSubmit = (text: string) => {
    setJobDescriptionText(text);
    setShowJdFallback(false);
  };
  
  return (
    <div className="space-y-6">
      <Toaster position="bottom-right" />
      
      {/* Generation counter */}
      {generationCount !== undefined && generationCount > 0 && (
        <div className="text-sm text-gray-500">
          Resume kits generated: {generationCount}
        </div>
      )}
      
      {/* Resume upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Upload Master Resume</label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 cursor-pointer ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2">
            <DocumentArrowUpIcon className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500">
              {isDragActive
                ? 'Drop your resume here...'
                : 'Drag & drop your resume here, or click to select'}
            </p>
            <p className="text-xs text-gray-400">Accepts PDF, DOCX, or TXT</p>
          </div>
        </div>
        
        {resumeFile && (
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="h-5 w-5 text-gray-500" />
              <span className="text-sm truncate max-w-xs">{resumeFile.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setResumeFile(null)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        
        <div className="mt-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Or paste resume text
          </label>
          <textarea
            value={masterResumeText}
            onChange={(e) => setMasterResumeText(e.target.value)}
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Paste your resume text here..."
          />
        </div>
      </div>
      
      {/* Job URL and description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Job URL</label>
        <input
          type="text"
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://example.com/job-posting"
        />
        
        <div className="mt-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Description
          </label>
          <textarea
            value={jobDescriptionText}
            onChange={(e) => setJobDescriptionText(e.target.value)}
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="For best results, paste the full job description here..."
          />
        </div>
      </div>
      
      {/* Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Additional Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Any specific requirements or preferences..."
        />
      </div>
      
      {/* AI Provider selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            AI Provider
          </label>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setModel(''); // Reset model when provider changes
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="auto">Auto (Use available provider)</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Model (Optional)
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="">Default for provider</option>
            {MODEL_SETS[provider]?.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Generation button */}
      <div className="flex flex-col space-y-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isLoading ? 'Generating...' : 'Generate Resume Kit'}
        </button>
        
        {/* Progress bar */}
        {isLoading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
        
        {/* Generation stepper */}
        {isLoading && (
          <div className="mt-4">
            <GenerationStepper steps={steps} />
          </div>
        )}
      </div>
      
      {/* Error display */}
      {isError && error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-sm font-medium text-red-800">Error: {error.message}</h3>
          {error.details && (
            <div className="mt-2">
              <details>
                <summary className="text-xs text-red-600 cursor-pointer">
                  View details
                </summary>
                <pre className="mt-2 text-xs overflow-auto p-2 bg-red-100 rounded">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </details>
            </div>
          )}
          <div className="mt-3">
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
      
      {/* Results */}
      {isComplete && result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-sm font-medium text-green-800">
            Resume Kit Generated Successfully!
          </h3>
          <p className="mt-1 text-xs text-green-600">
            Generated using {result.usedProvider} in {result.processingTime ? `${(result.processingTime / 1000).toFixed(1)}s` : 'N/A'}
          </p>
          
          <div className="mt-4 space-y-2">
            {result.artifacts.pdfs.map((file) => (
              <div key={file.name} className="flex items-center justify-between">
                <span className="text-sm">{file.name}</span>
                <button
                  type="button"
                  onClick={() => downloadFile(file.url, file.name)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
          
          <div className="mt-4">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Generate Another
            </button>
          </div>
        </div>
      )}
      
      {/* Job description fallback */}
      {showJdFallback && (
        <JobDescriptionFallback
          onSubmit={handleJdFallbackSubmit}
          onDismiss={() => setShowJdFallback(false)}
          asModal={true}
          initialText={jobDescriptionText}
        />
      )}
    </div>
  );
}
