import { useState } from 'react';
import type { ApiError } from '@/lib/errors/types';

interface Props {
  error: ApiError;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  // Format provider attempts for display
  const attempts = error.details?.attempts?.map(a => ({
    provider: a.provider,
    error: a.error,
    status: a.status,
  }));

  // Get validation errors if any
  const validationErrors = error.details?.validation?.map(v => 
    `${v.field}: ${v.message}`
  );

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-red-800 font-semibold">
            {error.code === 'UNKNOWN_ERROR' ? 'Error' : error.code.replace(/_/g, ' ')}
          </h3>
          <p className="text-red-700 mt-1">{error.message}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-red-700 hover:text-red-900 text-sm"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 text-sm font-mono bg-red-100 p-4 rounded overflow-auto">
          <div className="grid grid-cols-2 gap-2 text-red-800">
            <div>Request ID:</div>
            <div>{error.requestId}</div>
            
            <div>Timestamp:</div>
            <div>{new Date(error.timestamp).toLocaleString()}</div>

            {error.details?.provider && (
              <>
                <div>Provider:</div>
                <div>{error.details.provider}</div>
              </>
            )}

            {error.details?.model && (
              <>
                <div>Model:</div>
                <div>{error.details.model}</div>
              </>
            )}

            {attempts && attempts.length > 0 && (
              <>
                <div className="col-span-2 font-semibold mt-2">Provider Attempts:</div>
                <div className="col-span-2 space-y-1">
                  {attempts.map((a, i) => (
                    <div key={i} className="pl-2 border-l-2 border-red-300">
                      {a.provider}: {a.error} {a.status ? `(${a.status})` : ''}
                    </div>
                  ))}
                </div>
              </>
            )}

            {validationErrors && validationErrors.length > 0 && (
              <>
                <div className="col-span-2 font-semibold mt-2">Validation Errors:</div>
                <div className="col-span-2 space-y-1">
                  {validationErrors.map((err, i) => (
                    <div key={i} className="pl-2 border-l-2 border-red-300">
                      {err}
                    </div>
                  ))}
                </div>
              </>
            )}

            {error.details?.debug && (
              <>
                <div className="col-span-2 font-semibold mt-2">Debug Info:</div>
                <div className="col-span-2 space-y-1 pl-2 border-l-2 border-red-300">
                  <div>Environment: {error.details.debug.env}</div>
                  <div>DB Enabled: {error.details.debug.dbEnabled ? 'Yes' : 'No'}</div>
                  <div>Node: {error.details.debug.nodeVersion}</div>
                  {error.details.debug.stack && (
                    <pre className="whitespace-pre-wrap text-xs mt-2 p-2 bg-red-50 rounded">
                      {error.details.debug.stack}
                    </pre>
                  )}
                </div>
              </>
            )}

            {error.details?.raw && (
              <>
                <div className="col-span-2 font-semibold mt-2">Raw Error:</div>
                <pre className="col-span-2 whitespace-pre-wrap text-xs p-2 bg-red-50 rounded">
                  {typeof error.details.raw === 'string' 
                    ? error.details.raw 
                    : JSON.stringify(error.details.raw, null, 2)
                  }
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
