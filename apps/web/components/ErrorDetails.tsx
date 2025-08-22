'use client';
import { useState } from 'react';

export default function ErrorDetails({ error }: { error: any }) {
  const [open, setOpen] = useState(false);
  if (!error) return null;

  return (
    <div className="rounded-md border border-red-500/40 bg-red-950/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-red-200">
            {error.message || 'Failed'}
          </div>
          <div className="text-xs text-red-300/80 mt-1">
            {error.code ? `Code: ${error.code}` : null}
            {error.id ? ` • Request: ${error.id}` : null}
            {error.provider ? ` • Provider: ${error.provider}` : null}
            {error.model ? ` • Model: ${error.model}` : null}
          </div>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="text-xs rounded px-2 py-1 border border-red-400/40 text-red-200 hover:bg-red-900/30"
        >
          {open ? 'Hide details' : 'Show details'}
        </button>
      </div>

      {open && (
        <div className="mt-3 grid gap-2 text-xs">
          {error.issues && (
            <pre className="whitespace-pre-wrap rounded bg-black/30 p-2">{JSON.stringify(error.issues, null, 2)}</pre>
          )}
          {error.preview && (
            <pre className="whitespace-pre-wrap rounded bg-black/30 p-2">{String(error.preview)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
