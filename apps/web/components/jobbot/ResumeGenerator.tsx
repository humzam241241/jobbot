"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createLogger } from '@/lib/logger';

const logger = createLogger('resume-generator');

type ProcessingStatus = 'idle' | 'extracting' | 'rewriting' | 'formatting' | 'done' | 'error';
type AIProvider = 'auto' | 'openrouter' | 'google' | 'openai' | 'anthropic';

interface DebugLog {
  timestamp: number;
  level: 'info' | 'error';
  message: string;
  details?: any;
}

interface ValidationError {
  path: string;
  message: string;
}

interface APIError {
  message: string;
  details?: ValidationError[] | string;
}

interface ATSScore {
  score: number;
  matches: number;
  total: number;
  keywords: string[];
}

// Latest models as of 2024
const AI_PROVIDERS = {
  auto: {
    name: 'Auto (Best)',
    models: ['default']
  },
  openrouter: {
    name: 'OpenRouter',
    models: [
      'anthropic/claude-3-opus',
      'anthropic/claude-3-sonnet',
      'meta-llama/llama-2-70b-chat',
      'google/gemini-pro',
      'mistral/mistral-large'
    ]
  },
  google: {
    name: 'Google',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro']
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini']
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku']
  }
} as const;

export function ResumeGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [downloads, setDownloads] = useState<{ resumeUrl?: string; coverLetterUrl?: string }>({});
  const [provider, setProvider] = useState<AIProvider>('auto');
  const [model, setModel] = useState<string>('default');
  const [atsScore, setAtsScore] = useState<ATSScore | null>(null);

  const addDebugLog = useCallback((level: 'info' | 'error', message: string, details?: any) => {
    setDebugLogs(logs => [...logs, { timestamp: Date.now(), level, message, details }]);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      addDebugLog('info', 'File uploaded', { name: file.name, size: file.size });
    }
  }, [addDebugLog]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload your resume file');
      return;
    }
    
    if (!jobDescription && !jobUrl) {
      setError('Please provide either a job description or URL');
      return;
    }

    try {
      setStatus('extracting');
      setError(null);
      addDebugLog('info', 'Starting resume processing', { 
        provider, 
        model,
        hasJobUrl: Boolean(jobUrl),
        hasJobDescription: Boolean(jobDescription)
      });

      const formData = new FormData();
      formData.append('file', file);
      
      // Always send both, let backend handle validation
      formData.append('jobDescription', jobDescription || '');
      formData.append('jobUrl', jobUrl || '');
      
      formData.append('provider', provider);
      formData.append('model', model);

      addDebugLog('info', 'Sending form data', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        jobUrlLength: jobUrl?.length || 0,
        jobDescriptionLength: jobDescription?.length || 0
      });

      setStatus('rewriting');
      const response = await fetch('/api/resume/generate', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        const apiError = data.error as APIError;
        let errorMessage = apiError.message;
        
        // Handle validation errors
        if (Array.isArray(apiError.details)) {
          errorMessage += '\n' + apiError.details
            .map(err => `${err.path}: ${err.message}`)
            .join('\n');
          
          addDebugLog('error', 'Validation errors', { details: apiError.details });
        } else if (apiError.details) {
          errorMessage += '\n' + apiError.details;
          addDebugLog('error', 'API error details', { details: apiError.details });
        }
        
        throw new Error(errorMessage);
      }

      setStatus('formatting');
      addDebugLog('info', 'Processing response', {
        hasResumeUrl: Boolean(data.resumeUrl),
        hasCoverLetterUrl: Boolean(data.coverLetterUrl),
        hasAts: Boolean(data.ats)
      });
      
      setStatus('done');
      setDownloads({
        resumeUrl: data.resumeUrl,
        coverLetterUrl: data.coverLetterUrl
      });
      
      if (data.ats) {
        setAtsScore(data.ats);
      }
      
      addDebugLog('info', 'Processing completed successfully', {
        provider: data.providerUsed,
        model: data.modelUsed,
        atsScore: data.ats?.score
      });
    } catch (error: any) {
      setStatus('error');
      const errorMessage = error.message || 'An unexpected error occurred';
      setError(errorMessage);
      addDebugLog('error', 'Processing failed', { error: errorMessage });
    }
  };

  // Handle provider change
  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    setModel(AI_PROVIDERS[newProvider].models[0]); // Reset to first model of new provider
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-lg shadow-xl text-gray-100">
      <div className="space-y-6">
        {/* Job URL Input - First */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Job URL <span className="text-gray-400 text-xs">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.example.com/job-posting"
            />
            <div className="mt-1 text-xs text-gray-400">
              Note: Some websites block content extraction. If URL extraction fails, please paste the job description below.
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Job Description <span className="text-gray-400 text-xs">(Recommended)</span>
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
            placeholder="Paste the job description here for 100% reliable results..."
          />
        </div>

        {/* AI Provider Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(AI_PROVIDERS).map(([key, { name }]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              {AI_PROVIDERS[provider].models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Resume File <span className="text-red-400">*</span>
          </label>
          <div 
            {...getRootProps()} 
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-700 hover:border-blue-500 hover:bg-blue-500/5'}
            `}
          >
            <input {...getInputProps()} />
            <div className="space-y-2">
              <div className="text-3xl mb-2">📄</div>
              {file ? (
                <>
                  <p className="text-lg font-medium">Selected: {file.name}</p>
                  <p className="text-sm text-gray-400">Click or drag to replace</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">Drop your resume here</p>
                  <p className="text-sm text-gray-400">
                    Supports PDF and DOCX formats
                    <br />
                    Click to browse or drag and drop
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleSubmit}
          disabled={status !== 'idle' && status !== 'error'}
          className={`
            w-full py-3 px-4 rounded-lg font-medium text-lg transition-colors
            ${status === 'idle' || status === 'error'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-300 cursor-not-allowed'}
          `}
        >
          {status === 'idle' && 'Generate Resume Kit'}
          {status === 'extracting' && '📄 Extracting Text...'}
          {status === 'rewriting' && '✍️ Rewriting Content...'}
          {status === 'formatting' && '🎨 Formatting Documents...'}
          {status === 'done' && '✅ Generation Complete'}
          {status === 'error' && '🔄 Try Again'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            ❌ {error}
          </div>
        )}

        {/* ATS Score */}
        {atsScore && (
          <div className="p-4 bg-green-900/30 border border-green-500 rounded-lg">
            <h3 className="text-lg font-medium text-green-300 mb-2">ATS Score</h3>
            <div className="flex items-center mb-2">
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div 
                  className="bg-green-500 h-4 rounded-full" 
                  style={{ width: `${atsScore.score}%` }}
                ></div>
              </div>
              <span className="ml-3 text-xl font-bold">{atsScore.score}%</span>
            </div>
            <p className="text-sm text-green-200">
              Matched {atsScore.matches} of {atsScore.total} keywords
            </p>
            {atsScore.keywords?.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-green-300">Key Matches:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {atsScore.keywords.slice(0, 10).map((keyword, i) => (
                    <span key={i} className="px-2 py-1 bg-green-800/50 text-green-200 text-xs rounded-full">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Downloads */}
        {status === 'done' && (
          <div className="space-y-2">
            {downloads.resumeUrl && (
              <a
                href={downloads.resumeUrl}
                download
                className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
              >
                📥 Download Resume PDF
              </a>
            )}
            {downloads.coverLetterUrl && (
              <a
                href={downloads.coverLetterUrl}
                download
                className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
              >
                📥 Download Cover Letter
              </a>
            )}
          </div>
        )}

        {/* Debug Logs */}
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-2">Debug Logs</h3>
          <div className="bg-gray-800 rounded-lg p-4 h-48 overflow-auto font-mono text-sm">
            {debugLogs.map((log, i) => (
              <div key={i} className={`
                ${log.level === 'error' ? 'text-red-400' : 'text-gray-300'}
              `}>
                [{new Date(log.timestamp).toISOString()}] {log.message}
                {log.details && (
                  <pre className="text-xs text-gray-400 ml-4">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}