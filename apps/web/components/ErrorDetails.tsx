'use client';
import { useState } from 'react';

interface AttemptError {
  provider: string;
  code: string;
  message: string;
  status?: number;
  retryAfter?: number;
  preview?: string;
}

interface ErrorDetailsProps {
  error: {
    message?: string;
    code?: string;
    id?: string;
    provider?: string;
    model?: string;
    attempts?: AttemptError[];
    issues?: any[];
    preview?: string;
  };
  onRetry?: () => void;
}

export default function ErrorDetails({ error, onRetry }: ErrorDetailsProps) {
  const [open, setOpen] = useState(false);
  if (!error) return null;

  const hasDetails = error.issues || error.preview || (error.attempts?.length ?? 0) > 0;

  return (
    <div className="rounded-md border border-red-500/40 bg-red-950/30 p-4 space-y-3">
      {/* Error Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-semibold text-red-200">
            {error.message || 'Failed'}
          </div>
          <div className="text-xs text-red-300/80 mt-1 space-x-2">
            {error.code && <span>Code: {error.code}</span>}
            {error.id && <span>• Request: {error.id}</span>}
            {error.provider && <span>• Provider: {error.provider}</span>}
            {error.model && <span>• Model: {error.model}</span>}
          </div>
        </div>

        <div className="flex gap-2">
          {hasDetails && (
            <button
              onClick={() => setOpen(!open)}
              className="text-xs rounded px-2 py-1 border border-red-400/40 text-red-200 hover:bg-red-900/30 transition-colors"
            >
              {open ? 'Hide details' : 'Show details'}
            </button>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs rounded px-3 py-1 bg-red-600 hover:bg-red-700 text-white transition-colors font-medium"
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Attempt Summary */}
      {error.attempts?.length ? (
        <div className="text-xs text-red-200/80 pt-1">
          <span className="font-medium">Provider attempts:</span>{' '}
          {error.attempts.map((a, i) => (
            <span key={i} className="space-x-1">
              {i > 0 && <span>→</span>}
              <span className={a.code === 'MODEL_EMPTY_OUTPUT' ? 'text-yellow-400' : a.code === 'RATE_LIMIT' ? 'text-orange-400' : 'text-red-400'}>
                {a.provider}:{a.code}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {/* Expanded Details */}
      {open && hasDetails && (
        <div className="mt-4 grid gap-3 text-xs border-t border-red-500/20 pt-3">
          {/* Validation Issues */}
          {error.issues && (
            <div>
              <div className="font-medium text-red-200 mb-1">Validation Issues:</div>
              <pre className="whitespace-pre-wrap rounded bg-black/30 p-2 text-red-300/90">
                {JSON.stringify(error.issues, null, 2)}
              </pre>
            </div>
          )}

          {/* Model Output Preview */}
          {error.preview && (
            <div>
              <div className="font-medium text-red-200 mb-1">Model Output:</div>
              <pre className="whitespace-pre-wrap rounded bg-black/30 p-2 text-red-300/90 max-h-96 overflow-y-auto">
                {error.preview}
              </pre>
            </div>
          )}

          {/* Detailed Attempt Info */}
          {error.attempts?.length > 0 && (
            <div>
              <div className="font-medium text-red-200 mb-2">Provider Attempts:</div>
              <div className="space-y-3">
                {error.attempts.map((a, i) => (
                  <div key={i} className="rounded bg-black/30 p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-red-200">{a.provider}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        a.code === 'MODEL_EMPTY_OUTPUT' ? 'bg-yellow-900/50 text-yellow-200' :
                        a.code === 'RATE_LIMIT' ? 'bg-orange-900/50 text-orange-200' :
                        'bg-red-900/50 text-red-200'
                      }`}>
                        {a.code}
                      </span>
                      {a.status && <span className="text-red-300/70">Status: {a.status}</span>}
                    </div>
                    {a.message && <div className="text-red-300/90">{a.message}</div>}
                    {a.retryAfter && (
                      <div className="text-orange-300/90 mt-1">
                        Retry available in {a.retryAfter}s
                      </div>
                    )}
                    {a.preview && (
                      <pre className="mt-2 whitespace-pre-wrap text-red-300/70 border-t border-red-500/20 pt-2">
                        {a.preview}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}