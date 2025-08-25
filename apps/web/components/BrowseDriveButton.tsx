'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { openGoogleDrivePicker } from '@/lib/google/picker';
import { Cloud, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BrowseDriveButtonProps {
  onFileSelect: (fileId: string, fileName: string, mimeType: string) => void;
  className?: string;
}

/**
 * Button component that opens Google Drive Picker when clicked
 */
export function GoogleDriveButton({
  onFileSelect,
  className = ''
}: BrowseDriveButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: session } = useSession();
  const isLoading = false;
  const error: string | null = null;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const hasToken = Boolean(session?.accessToken);
  const isDisabled = isProcessing || isLoading;

  const handleConnect = async () => {
    try {
      setIsProcessing(true);
      await signIn('google', { callbackUrl: '/dashboard', redirect: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBrowse = async () => {
    try {
      setIsProcessing(true);
      const keyTail = (apiKey || '').slice(-4);
      const hasTokenFlag = Boolean(session?.accessToken);
      console.log('Picker init key=', (process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '').slice(-4), 'token=', !!session?.accessToken);
      if (!apiKey) {
        toast.error('Google API key missing (NEXT_PUBLIC_GOOGLE_API_KEY)');
        return;
      }
      if (!session?.accessToken) {
        toast.error('Sign in with Google to connect Drive');
        return;
      }
      await openGoogleDrivePicker({
        accessToken: session.accessToken,
        developerKey: apiKey,
        appId: (process.env.NEXT_PUBLIC_GOOGLE_APP_ID || '0'),
        onPicked: (file) => {
          onFileSelect(file.id, file.name, file.mimeType || 'application/octet-stream');
          toast.success(`Selected: ${file.name}`);
        }
      });
    } catch (err) {
      console.error('Error preparing Google Drive picker:', err);
      toast.error('Failed to initialize Google Drive');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={hasToken ? handleBrowse : handleConnect}
        disabled={isDisabled}
        className={`flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isProcessing || isLoading ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <Cloud className="w-5 h-5 mr-2" />
        )}
        {hasToken ? 'Browse Google Drive' : 'Connect Google Drive'}
      </button>
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error.includes('API key') ? (
            <div>
              <p>Google Drive API key error. Please check:</p>
              <ul className="list-disc list-inside mt-1">
                <li>API key is set in environment variables</li>
                <li>API key has correct referrer restrictions</li>
                <li>Google Drive and Picker APIs are enabled</li>
              </ul>
            </div>
          ) : (
            error
          )}
        </div>
      )}
    </div>
  );
}