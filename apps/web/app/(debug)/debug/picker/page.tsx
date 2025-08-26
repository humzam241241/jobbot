'use client';

import DrivePickerButton from '@/components/DrivePickerButton';

export default function PickerDebugPage() {
  if (process.env.NODE_ENV !== 'development') {
    return <div className="p-6">Not available in production.</div>;
  }
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Picker Debug</h1>
      <div className="p-4 rounded border">
        <p>
          Using env key name: <code>NEXT_PUBLIC_GOOGLE_API_KEY</code> (value not shown)
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Ensure this key is restricted to HTTP referrers and APIs: Google Picker API + Google Drive API.
        </p>
      </div>
      <DrivePickerButton />
    </div>
  );
}


