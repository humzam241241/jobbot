import React, { useState, useEffect } from 'react';

interface ErrorLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  details?: any;
  stack?: string;
}

interface DebugPanelProps {
  visible?: boolean;
}

export default function ResumeDebugPanel({ visible = false }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(visible);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('errors');

  const fetchErrors = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug/last-errors');
      if (response.ok) {
        const data = await response.json();
        setErrors(data.errors || []);
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug/resume-test');
      if (response.ok) {
        const data = await response.json();
        setTestResults(data);
        setActiveTab('diagnostics');
      }
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchErrors();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-md shadow-lg z-50"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Resume Generation Debug Panel</h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="border-b">
          <div className="flex">
            <button
              className={`px-4 py-2 ${activeTab === 'errors' ? 'bg-blue-100 border-b-2 border-blue-500' : ''}`}
              onClick={() => setActiveTab('errors')}
            >
              Error Logs
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'diagnostics' ? 'bg-blue-100 border-b-2 border-blue-500' : ''}`}
              onClick={() => setActiveTab('diagnostics')}
            >
              Diagnostics
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : activeTab === 'errors' ? (
            <div>
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-medium">Recent Errors</h3>
                <button
                  onClick={fetchErrors}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                  Refresh
                </button>
              </div>
              {errors.length === 0 ? (
                <p className="text-gray-500 italic">No errors recorded</p>
              ) : (
                <div className="space-y-4">
                  {errors.map((error) => (
                    <div key={error.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between">
                        <span className={`px-2 py-1 rounded text-xs ${error.level === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {error.level.toUpperCase()}
                        </span>
                        <span className="text-gray-500 text-sm">{new Date(error.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="font-medium mt-2">{error.message}</p>
                      {error.details && (
                        <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(error.details, null, 2)}
                        </pre>
                      )}
                      {error.stack && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 cursor-pointer">Stack Trace</summary>
                          <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                            {error.stack}
                          </pre>
                        </details>
                      )}
                      <div className="mt-2 text-xs text-gray-500">Trace ID: {error.id}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-medium">Resume Generation Diagnostics</h3>
                <button
                  onClick={runDiagnostics}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                  Run Tests
                </button>
              </div>
              {!testResults ? (
                <p className="text-gray-500 italic">Click "Run Tests" to check the resume generation system</p>
              ) : (
                <div>
                  <div className="mb-4">
                    <p className="text-sm">
                      Trace ID: <span className="font-mono">{testResults.traceId}</span>
                    </p>
                    <p className="text-sm">
                      Timestamp: {new Date(testResults.timestamp).toLocaleString()}
                    </p>
                  </div>

                  {Object.entries(testResults.tests).map(([testName, result]: [string, any]) => (
                    <div key={testName} className="border rounded-lg p-4 mb-4 bg-gray-50">
                      <h4 className="font-medium capitalize">{testName.replace(/([A-Z])/g, ' $1')}</h4>
                      <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-100 px-4 py-3 border-t flex justify-between">
          <div className="text-sm text-gray-500">
            Debug logs are stored in <code>C:\Users\humza\resume_bot\debug\</code>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
