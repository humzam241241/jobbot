'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ResumeKit } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Download, FileText, Mail, BarChart, AlertCircle } from 'lucide-react';

export default function ResultPage() {
  const { kitId } = useParams();
  const [kit, setKit] = useState<ResumeKit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (kitId) {
      fetch(`/api/resume-kit/${kitId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
        .then(response => {
          if (!response.ok) {
            const contentType = response.headers.get('Content-Type');
            
            if (contentType && contentType.includes('application/json')) {
              return response.json().then(data => {
                throw new Error(data.error?.message || `Error: ${response.status} ${response.statusText}`);
              });
            } else {
              throw new Error(`Error fetching resume kit: ${response.status} ${response.statusText}`);
            }
          }
          
          const contentType = response.headers.get('Content-Type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response format: Expected JSON');
          }
          
          return response.json();
        })
        .then(data => {
          if (!data.success) {
            throw new Error(data.error?.message || 'Failed to fetch resume kit');
          }
          setKit(data.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching kit:', err);
          setError(err.message);
          setLoading(false);
        });
    }
  }, [kitId]);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/50 p-4 rounded-lg mb-4 flex items-start">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300">Error</h3>
            <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
        <Link 
          href="/jobbot" 
          className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Resume Generator
        </Link>
      </div>
    );
  }

  if (loading || !kit) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8" />
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Generated Resume Kit
        </h1>
        <Link 
          href="/jobbot" 
          className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Resume Generator
        </Link>
      </div>
      
      {kit.status === 'failed' && (
        <div className="bg-red-50 dark:bg-red-900/50 p-4 rounded-lg mb-6 flex items-start">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300">Generation Failed</h3>
            <p className="text-red-600 dark:text-red-400 mt-1">
              {kit.error || 'An unknown error occurred during generation.'}
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resume */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-4">
            <FileText className="w-6 h-6 text-blue-500 mr-2" />
            <h2 className="text-xl font-semibold">Tailored Resume</h2>
          </div>
          
          {kit.tailoredResume ? (
            <div className="flex flex-col space-y-2">
              <a
                href={kit.tailoredResume}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Resume PDF
              </a>
              <a
                href={`/api/kits/${kitId}/download?file=resume`}
                download
                className="flex items-center justify-center w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Resume
              </a>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Resume not available
            </p>
          )}
        </div>

        {/* Cover Letter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-4">
            <Mail className="w-6 h-6 text-green-500 mr-2" />
            <h2 className="text-xl font-semibold">Cover Letter</h2>
          </div>
          
          {kit.coverLetter ? (
            <div className="flex flex-col space-y-2">
              <a
                href={kit.coverLetter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Cover Letter PDF
              </a>
              <a
                href={`/api/kits/${kitId}/download?file=cover`}
                download
                className="flex items-center justify-center w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Cover Letter
              </a>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Cover letter not available
            </p>
          )}
        </div>

        {/* ATS Report */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:col-span-2">
          <div className="flex items-center mb-4">
            <BarChart className="w-6 h-6 text-purple-500 mr-2" />
            <h2 className="text-xl font-semibold">ATS Report</h2>
          </div>
          
          {kit.atsReport ? (
            <div className="flex flex-col space-y-2">
              <a
                href={kit.atsReport}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                View ATS Report
              </a>
              <a
                href={`/api/kits/${kitId}/download?file=ats`}
                download
                className="flex items-center justify-center w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download ATS Report
              </a>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              ATS report not available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}