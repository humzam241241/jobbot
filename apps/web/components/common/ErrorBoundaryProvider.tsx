'use client';

import { ErrorBoundary } from './ErrorBoundary';

function GlobalError({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">Application Error</h2>
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Reload Application
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundaryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary fallback={<GlobalError error={new Error('Application failed to load')} />}>
      {children}
    </ErrorBoundary>
  );
}
