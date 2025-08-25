// apps/web/app/debug/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/errors/types';

export default function DebugPage() {
  const [errors, setErrors] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function fetchErrors() {
    const res = await fetch('/api/debug/errors?limit=50');
    const data = await res.json();
    setErrors(data.errors);
    setStats(data.stats);
  }

  useEffect(() => {
    fetchErrors();
    if (autoRefresh) {
      const interval = setInterval(fetchErrors, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Error Log Viewer</h1>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchErrors}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Total Errors</h2>
            <p className="text-3xl font-bold text-red-600">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Errors by Code</h2>
            <div className="space-y-1">
              {Object.entries(stats.byCode).map(([code, count]: [string, any]) => (
                <div key={code} className="flex justify-between">
                  <span>{code}</span>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Errors by Provider</h2>
            <div className="space-y-1">
              {Object.entries(stats.byProvider).map(([provider, count]: [string, any]) => (
                <div key={provider} className="flex justify-between">
                  <span>{provider}</span>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {errors.map((error, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow font-mono text-sm whitespace-pre-wrap">
            {error}
          </div>
        ))}
      </div>
    </div>
  );
}
