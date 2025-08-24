'use client';

import { useState } from 'react';
import { ResumeForm } from '@/components/resume/ResumeForm';
import { Wrench } from 'lucide-react';
import debugLogger from '@/lib/utils/debug-logger';

export default function JobBotPage() {
  const [showSystemInfo, setShowSystemInfo] = useState(false);

  const toggleSystemInfo = () => {
    setShowSystemInfo(!showSystemInfo);
    debugLogger.debug('System info toggled', { 
      component: 'JobBotPage', 
      data: { visible: !showSystemInfo } 
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Resume Generator Kit
          </h1>
          <button
            onClick={toggleSystemInfo}
            className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <Wrench className="h-3 w-3 mr-1" />
            {showSystemInfo ? 'Hide' : 'Show'} System Info
          </button>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Upload your resume and job description to create a tailored application
        </p>
      </div>

      {showSystemInfo && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            System Architecture Information
          </h3>
          <div className="text-xs font-mono text-gray-600 dark:text-gray-400 space-y-2">
            <div>
              <span className="font-semibold">Build:</span> {process.env.NEXT_PUBLIC_BUILD_ID || 'Development'}
            </div>
            <div>
              <span className="font-semibold">Environment:</span> {process.env.NODE_ENV}
            </div>
            <div>
              <span className="font-semibold">Debug Mode:</span> {localStorage.getItem('DEBUG_MODE') === 'true' ? 'Enabled' : 'Disabled'}
            </div>
            <div>
              <span className="font-semibold">Components:</span> Client UI → API Routes → LLM Service → PDF Processing
            </div>
            <div>
              <span className="font-semibold">Data Flow:</span> Form Submission → Resume Extraction → AI Generation → PDF Composition → Result Rendering
            </div>
          </div>
        </div>
      )}

      <ResumeForm />
    </div>
  );
}