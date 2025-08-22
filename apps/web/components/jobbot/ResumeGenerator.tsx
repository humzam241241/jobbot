"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createLogger } from '@/lib/logger';

const logger = createLogger('resume-generator');

type ProcessingStatus = 'idle' | 'extracting' | 'rewriting' | 'formatting' | 'done' | 'error';

interface DebugLog {
  timestamp: number;
  level: 'info' | 'error';
  message: string;
  details?: any;
}

export default function ResumeGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [downloads, setDownloads] = useState<{ docxUrl?: string; pdfUrl?: string }>({});

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
    if (!file || !jobDescription) {
      setError('Please provide both a resume file and job description');
      return;
    }

    try {
      setStatus('extracting');
      setError(null);
      addDebugLog('info', 'Starting resume processing');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('jobDescription', jobDescription);

      setStatus('rewriting');
      const response = await fetch('/api/rewriteResume', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Resume processing failed');
      }

      setStatus('formatting');
      const result = await response.json();
      
      setStatus('done');
      setDownloads({
        docxUrl: result.docxUrl,
        pdfUrl: result.pdfUrl
      });
      
      addDebugLog('info', 'Processing completed successfully', result);
    } catch (error: any) {
      setStatus('error');
      setError(error.message);
      addDebugLog('error', 'Processing failed', { error: error.message });
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      <div className="space-y-4">
        <div {...getRootProps()} className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        `}>
          <input {...getInputProps()} />
          {file ? (
            <p>Selected file: {file.name}</p>
          ) : (
            <p>Drag & drop your resume (PDF or DOCX), or click to select</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full h-32 px-3 py-2 border rounded-lg"
            placeholder="Paste the job description here..."
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={status !== 'idle' && status !== 'error'}
          className={`
            w-full py-2 px-4 rounded-lg font-medium
            ${status === 'idle' || status === 'error'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-300 cursor-not-allowed'}
          `}
        >
          {status === 'idle' && 'Generate Resume'}
          {status === 'extracting' && 'Extracting Text...'}
          {status === 'rewriting' && 'Rewriting Content...'}
          {status === 'formatting' && 'Formatting Documents...'}
          {status === 'done' && 'Generation Complete'}
          {status === 'error' && 'Try Again'}
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {status === 'done' && (
          <div className="space-y-2">
            {downloads.docxUrl && (
              <a
                href={downloads.docxUrl}
                download
                className="block w-full py-2 px-4 bg-green-600 text-white rounded-lg text-center hover:bg-green-700"
              >
                Download DOCX
              </a>
            )}
            {downloads.pdfUrl && (
              <a
                href={downloads.pdfUrl}
                download
                className="block w-full py-2 px-4 bg-green-600 text-white rounded-lg text-center hover:bg-green-700"
              >
                Download PDF
              </a>
            )}
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-medium mb-2">Debug Logs</h3>
          <div className="bg-gray-100 rounded-lg p-4 h-48 overflow-auto font-mono text-sm">
            {debugLogs.map((log, i) => (
              <div key={i} className={`
                ${log.level === 'error' ? 'text-red-600' : 'text-gray-800'}
              `}>
                [{new Date(log.timestamp).toISOString()}] {log.message}
                {log.details && (
                  <pre className="text-xs text-gray-600 ml-4">
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
