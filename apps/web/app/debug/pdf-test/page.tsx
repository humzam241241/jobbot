"use client";

import { useState } from 'react';

export default function PdfTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const testPdfGeneration = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/pdf-test');
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error?.message || 'Unknown error');
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate PDF');
      console.error('PDF test error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">PDF Generation Test</h1>
      
      <div className="mb-6">
        <button
          onClick={testPdfGeneration}
          disabled={isLoading}
          className={`px-4 py-2 rounded-md text-white ${
            isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Generating...' : 'Test PDF Generation'}
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="font-medium text-green-700">PDF generated successfully!</p>
            <p className="text-sm">Size: {result.pdfSize} bytes</p>
            <p className="text-sm">Trace ID: {result.traceId}</p>
          </div>
          
          <div className="border rounded-md p-4">
            <p className="font-medium mb-2">PDF Preview:</p>
            
            <div className="flex flex-col items-center space-y-4">
              <a
                href={result.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Open PDF in New Tab
              </a>
              
              <iframe 
                src={result.pdfUrl} 
                className="w-full h-[500px] border rounded-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
