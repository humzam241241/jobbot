'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function AuthDebugPage() {
  const { data: session, status } = useSession();
  const [cookies, setCookies] = useState<string>('');

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setCookies(document.cookie || '');
    }
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return <div className="p-6">Not available in production.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Auth Debug</h1>
      <div className="p-4 rounded border">
        <div>Status: {status}</div>
        <pre className="mt-2 text-sm whitespace-pre-wrap break-all">{JSON.stringify(session, null, 2)}</pre>
      </div>
      <div className="p-4 rounded border">
        <div>Cookies (redacted)</div>
        <pre className="mt-2 text-sm whitespace-pre-wrap break-all">
          {cookies.replace(/(session-token=)([^;]+)/gi, '$1REDACTED')}
        </pre>
      </div>
    </div>
  );
}


