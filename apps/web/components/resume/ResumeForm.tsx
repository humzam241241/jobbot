'use client';

import { useState, useRef } from 'react';
import { FileText, Upload, Loader2, Link as LinkIcon, Bug, Download } from 'lucide-react';
import { useResumeGeneration } from '@/hooks/use-resume-generation';
import { useAuth } from '@/contexts/auth-context';
import debugLogger from '@/lib/utils/debug-logger';

const AI_PROVIDERS = {
  'Google': ['Gemini 2.5 Pro', 'Gemini 2.5 Ultra'],
  'Anthropic': ['Claude 3 Opus', 'Claude 3 Sonnet', 'Claude 3 Haiku'],
  'OpenAI': ['GPT-4 Turbo', 'GPT-4'],
  'DeepSeek': ['DeepSeek Chat', 'DeepSeek Code'],
  'OpenRouter': ['Mixtral', 'Yi-34B', 'Qwen-72B']
} as const;

type Provider = keyof typeof AI_PROVIDERS;
type Model = (typeof AI_PROVIDERS)[Provider][number];

export function ResumeForm() {
  const { credits, maxCredits } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider>('Google');
  const [selectedModel, setSelectedModel] = useState<Model>('Gemini 2.5 Pro');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const { isLoading, progress, debugLogs, generateResume, downloadDebugLogs } = useResumeGeneration();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      debugLogger.debug('File selected', { 
        component: 'ResumeForm',
        data: { 
          fileName: file.name, 
          fileSize: file.size, 
          fileType: file.type 
        } 
      });
    }
  };

  const handleProviderChange = (provider: Provider) => {
    setSelectedProvider(provider);
    setSelectedModel(AI_PROVIDERS[provider][0]);
    debugLogger.debug('Provider changed', { 
      component: 'ResumeForm',
      data: { provider, model: AI_PROVIDERS[provider][0] } 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !jobDescription.trim()) return;
    
    debugLogger.info('Form submitted', { 
      component: 'ResumeForm',
      data: { 
        provider: selectedProvider, 
        model: selectedModel,
        hasJobUrl: !!jobUrl.trim(),
        jobDescriptionLength: jobDescription.length
      } 
    });
    
    await generateResume(selectedFile, jobDescription, jobUrl, selectedProvider, selectedModel);
  };

  const toggleDebugPanel = () => {
    setShowDebugPanel(!showDebugPanel);
    if (!showDebugPanel) {
      debugLogger.enableDebugMode();
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Upload Resume (PDF)
          </label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-[#00E5A0] transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-2">
                {selectedFile ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Selected: {selectedFile.name}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click to upload or drag and drop
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Job URL */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Job URL (Optional)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              className="block w-full pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:border-[#00E5A0] focus:ring-[#00E5A0]"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Job Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Job Description (For best results)
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:border-[#00E5A0] focus:ring-[#00E5A0]"
            placeholder="Paste the job description here..."
          />
        </div>

        {/* AI Provider Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              AI Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => handleProviderChange(e.target.value as Provider)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:border-[#00E5A0] focus:ring-[#00E5A0]"
            >
              {Object.keys(AI_PROVIDERS).map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              AI Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as Model)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:border-[#00E5A0] focus:ring-[#00E5A0]"
            >
              {AI_PROVIDERS[selectedProvider].map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Credits remaining: {credits}/{maxCredits}
            </div>
            <button 
              type="button" 
              onClick={toggleDebugPanel}
              className="inline-flex items-center px-2 py-1 text-xs rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Bug className="h-3 w-3 mr-1" />
              {showDebugPanel ? 'Hide' : 'Show'} Debug
            </button>
          </div>
          <button
            type="submit"
            disabled={isLoading || !selectedFile || !jobDescription.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00E5A0] hover:bg-[#00E5A0]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00E5A0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Generating... {progress}%
              </>
            ) : (
              <>
                <Upload className="-ml-1 mr-2 h-4 w-4" />
                Generate Resume Kit
              </>
            )}
          </button>
        </div>
      </form>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="mt-8 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Debug Information
            </h3>
            <button
              type="button"
              onClick={downloadDebugLogs}
              className="inline-flex items-center px-2 py-1 text-xs rounded-md text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Download className="h-3 w-3 mr-1" />
              Download Logs
            </button>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 max-h-80 overflow-y-auto">
            <div className="font-mono text-xs">
              <div className="mb-2 text-gray-900 dark:text-gray-100 font-semibold">
                System Information:
              </div>
              <pre className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-gray-900 dark:text-gray-100">
                {JSON.stringify({
                  userAgent: navigator.userAgent,
                  platform: navigator.platform,
                  language: navigator.language,
                  screenSize: `${window.innerWidth}x${window.innerHeight}`,
                  timestamp: new Date().toISOString(),
                }, null, 2)}
              </pre>
              
              <div className="mt-4 mb-2 text-gray-900 dark:text-gray-100 font-semibold">
                Event Logs:
              </div>
              {debugLogs.length === 0 ? (
                <div className="text-gray-900 dark:text-gray-100 italic">
                  No events logged yet. Actions will appear here.
                </div>
              ) : (
                <div className="space-y-2">
                  {debugLogs.map((log, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <div className="text-gray-900 dark:text-gray-100 font-semibold">
                        {log.timestamp.toISOString()}
                      </div>
                      <div className="text-gray-900 dark:text-gray-100 font-bold">
                        {log.event}
                      </div>
                      {log.data && (
                        <pre className="text-xs text-gray-900 dark:text-gray-100 overflow-x-auto mt-1">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}