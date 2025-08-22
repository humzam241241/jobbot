"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

type ProcessStep = 'idle' | 'uploading' | 'parsing' | 'tailoring' | 'generating' | 'done' | 'error';

interface DebugLog {
  timestamp: string;
  traceId: string;
  component: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

interface Downloads {
  resumePdf: string;
  resumeDocx: string;
  coverPdf: string;
  coverDocx: string;
  atsReport: string;
}

export default function ResumeTailor() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [step, setStep] = useState<ProcessStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<Downloads | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [debugVisible, setDebugVisible] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  const fetchDebugLogs = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/debug/last-errors?traceId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setDebugLogs(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch debug logs:', error);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !jobDescription) {
      setError('Please provide both a resume file and job description');
      return;
    }

    try {
      setStep('uploading');
      setError(null);
      
      // Import at runtime to avoid bundling server code
      const { generateResumeKit } = await import("@/lib/client/resumeKit");
      const result = await generateResumeKit({ 
        file, 
        jd: jobDescription 
      });
      setTraceId(result.traceId);
      
      // Set download URLs
      setDownloads({
        resumePdf: result.files.resumePdf.publicUrl,
        resumeDocx: result.files.resumeDocx.apiUrl,
        coverPdf: result.files.coverPdf.publicUrl,
        coverDocx: result.files.coverDocx.apiUrl,
        atsReport: result.files.atsReport.publicUrl
      });
      
      setStep('done');
      
      // Open PDFs in new tabs
      window.open(result.files.resumePdf.publicUrl, '_blank');
      window.open(result.files.coverPdf.publicUrl, '_blank');
      window.open(result.files.atsReport.publicUrl, '_blank');
      
      // Fetch debug logs
      if (result.traceId) {
        fetchDebugLogs(result.traceId);
      }
    } catch (error: any) {
      setStep('error');
      setError(error.message);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'uploading', label: 'Uploading' },
      { key: 'parsing', label: 'Parsing Resume' },
      { key: 'tailoring', label: 'Tailoring Content' },
      { key: 'generating', label: 'Generating Documents' }
    ];
    
    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === s.key ? 'bg-blue-600 text-white' :
                step === 'done' || steps.findIndex(x => x.key === step) > i ? 'bg-green-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {step === 'done' || steps.findIndex(x => x.key === step) > i ? '✓' : i + 1}
              </div>
              <div className="text-xs mt-1">{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-1 ${
                steps.findIndex(x => x.key === step) > i || step === 'done' ? 'bg-green-600' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold mb-4">Resume Tailor</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Your Resume
          </label>
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-6 cursor-pointer ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="text-center">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <p className="text-center text-gray-500">
                Drag & drop your resume (PDF or DOCX), or click to select
              </p>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste the job description here..."
            disabled={step !== 'idle' && step !== 'error'}
          />
        </div>
        
        {step !== 'idle' && step !== 'error' && step !== 'done' && renderStepIndicator()}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        {step === 'done' && downloads && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Your Documents Are Ready!</h3>
            
                          <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Tailored Resume</h4>
                    <div className="flex space-x-2">
                      <a 
                        href={downloads.resumePdf} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-center hover:bg-blue-700"
                      >
                        View PDF
                      </a>
                      <a 
                        href={downloads.resumeDocx} 
                        download 
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-center hover:bg-blue-700"
                      >
                        Download DOCX
                      </a>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Cover Letter</h4>
                    <div className="flex space-x-2">
                      <a 
                        href={downloads.coverPdf} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-center hover:bg-blue-700"
                      >
                        View PDF
                      </a>
                      <a 
                        href={downloads.coverDocx} 
                        download 
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-center hover:bg-blue-700"
                      >
                        Download DOCX
                      </a>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">ATS Analysis Report</h4>
                  <div className="flex justify-center">
                    <a 
                      href={downloads.atsReport} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-green-600 text-white py-2 px-8 rounded-lg text-center hover:bg-green-700"
                    >
                      View ATS Report
                    </a>
                  </div>
                </div>
              </div>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <button
            type="submit"
            disabled={step !== 'idle' && step !== 'error'}
            className={`py-2 px-6 rounded-lg font-medium ${
              step !== 'idle' && step !== 'error'
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {step === 'idle' && 'Tailor Resume'}
            {step === 'error' && 'Try Again'}
            {step === 'done' && 'Generate New'}
            {step !== 'idle' && step !== 'error' && step !== 'done' && 'Processing...'}
          </button>
          
          {traceId && (
            <button
              type="button"
              onClick={() => setDebugVisible(!debugVisible)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {debugVisible ? 'Hide Debug' : 'Show Debug'}
            </button>
          )}
        </div>
      </form>
      
      {debugVisible && traceId && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">Debug Logs</h3>
            <span className="text-xs bg-gray-200 px-2 py-1 rounded">Trace ID: {traceId}</span>
          </div>
          <div className="bg-gray-100 rounded-lg p-4 h-64 overflow-auto font-mono text-xs">
            {debugLogs.length === 0 ? (
              <p className="text-gray-500">No logs available</p>
            ) : (
              debugLogs.map((log, i) => (
                <div 
                  key={i}
                  className={`mb-1 ${
                    log.level === 'error' ? 'text-red-600' :
                    log.level === 'warn' ? 'text-amber-600' : 'text-gray-700'
                  }`}
                >
                  [{new Date(log.timestamp).toLocaleTimeString()}] [{log.component}] {log.message}
                  {log.data && Object.keys(log.data).length > 0 && (
                    <pre className="ml-4 text-gray-500">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}