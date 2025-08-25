'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

export default function DocxTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ docxUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Please upload a DOCX file');
      return;
    }

    if (!jobDescription) {
      setError('Please enter a job description');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('jobDescription', jobDescription);

      const response = await fetch('/api/docx', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process DOCX file');
      }

      setResult(data.data);
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">DOCX Pipeline Test</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Upload Resume (DOCX only)</label>
          <div 
            {...getRootProps()} 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
          >
            <input {...getInputProps()} />
            {file ? (
              <p>Selected file: {file.name}</p>
            ) : (
              <p>Drag & drop a DOCX file here, or click to select one</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="jobDescription" className="block text-sm font-medium mb-2">Job Description</label>
          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-gray-300 p-2"
            placeholder="Paste the job description here..."
          />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Processing...' : 'Process DOCX'}
        </button>
      </form>

      {result && (
        <div className="mt-8 p-4 border rounded-md">
          <h2 className="text-xl font-semibold mb-4">Result</h2>
          <p>Your DOCX has been processed successfully!</p>
          <div className="mt-4">
            <a 
              href={result.docxUrl}
              download
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 inline-block"
            >
              Download Tailored DOCX
            </a>
          </div>
        </div>
      )}
    </div>
  );
}