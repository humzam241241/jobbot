'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { openGoogleDrivePicker } from '@/lib/google/picker';
import { Cloud, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { logInfo, logError, logGoogleDriveError } from '@/lib/logger';

interface BrowseDriveButtonProps {
  onFileSelect: (fileId: string, fileName: string, mimeType: string, resourceKey?: string) => void;
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
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;
  const hasToken = Boolean(session?.accessToken);
  const isDisabled = isProcessing || isLoading;

  // Log component initialization
  useEffect(() => {
    logInfo('GoogleDriveButton initialized', {
      hasApiKey: !!apiKey,
      hasAppId: !!appId,
      hasToken,
      sessionStatus: status
    }, 'GoogleDriveButton');
  }, [apiKey, appId, hasToken, status]);

  const handleConnect = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      
      logInfo('Starting Google Drive connection', { 
        currentPath: window.location.pathname 
      }, 'GoogleDriveButton');
      
      try { 
        localStorage.setItem('openPickerAfterLogin', '1'); 
      } catch (storageError) {
        logError('Failed to set localStorage flag', storageError, 'GoogleDriveButton');
      }
      
      const result = await signIn('google', { 
        callbackUrl: window.location.pathname, 
        redirect: true, 
        prompt: 'consent' 
      });
      
      if (!result) {
        throw new Error('Sign-in was cancelled or failed');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during sign-in';
      setError(`Failed to connect: ${errorMessage}`);
      logGoogleDriveError('connect', error as Error, { 
        currentPath: window.location.pathname 
      });
      toast.error(`Connection failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBrowse = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      
      logInfo('Starting Google Drive browse', {
        hasApiKey: !!apiKey,
        hasAppId: !!appId,
        hasToken: !!session?.accessToken,
        tokenLength: session?.accessToken?.length || 0
      }, 'GoogleDriveButton');

      // Validate required environment variables
      if (!apiKey) {
        const errorMsg = 'Google API key missing (NEXT_PUBLIC_GOOGLE_API_KEY)';
        setError(errorMsg);
        logError(errorMsg, { envVars: { apiKey: !!apiKey, appId: !!appId } }, 'GoogleDriveButton');
        toast.error(errorMsg);
        return;
      }

      // App ID (project number) is optional for Picker; proceed without it if absent
      if (!appId) {
        logInfo('Proceeding without Google App ID; set NEXT_PUBLIC_GOOGLE_APP_ID to remove this notice', { envVars: { apiKey: !!apiKey, appId: !!appId } }, 'GoogleDriveButton');
      }

      if (!session?.accessToken) {
        logInfo('No access token, redirecting to sign-in', {}, 'GoogleDriveButton');
        try { 
          localStorage.setItem('openPickerAfterLogin', '1'); 
        } catch (storageError) {
          logError('Failed to set localStorage flag', storageError, 'GoogleDriveButton');
        }
        await signIn('google', { 
          callbackUrl: window.location.pathname, 
          redirect: true, 
          prompt: 'consent' 
        });
        return; 
      }

      logInfo('Opening Google Drive picker', {
        apiKeyLength: apiKey.length,
        appId,
        tokenLength: session.accessToken.length
      }, 'GoogleDriveButton');

      await openGoogleDrivePicker({
        accessToken: session.accessToken,
        developerKey: apiKey,
        appId: appId || '',
        onPicked: (file) => {
          logInfo('File selected from Google Drive', {
            fileId: file.id,
            fileName: file.name,
            mimeType: file.mimeType,
            resourceKey: (file as any).resourceKey
          }, 'GoogleDriveButton');

          onFileSelect(file.id, file.name, file.mimeType || 'application/octet-stream', (file as any).resourceKey);
          toast.success(`✅ Selected: ${file.name}`);
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown picker error';
      setError(`Picker failed: ${errorMessage}`);
      logGoogleDriveError('browse', error as Error, {
        hasApiKey: !!apiKey,
        hasAppId: !!appId,
        hasToken: !!session?.accessToken
      });
      toast.error(`❌ Failed to open Google Drive: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-resume picker after returning from Google sign-in
  useEffect(() => {
    const shouldOpen = typeof window !== 'undefined' && localStorage.getItem('openPickerAfterLogin') === '1';
    if (shouldOpen && session?.accessToken && !isProcessing) {
      logInfo('Auto-resuming picker after login', {}, 'GoogleDriveButton');
      try { 
        localStorage.removeItem('openPickerAfterLogin'); 
      } catch (storageError) {
        logError('Failed to remove localStorage flag', storageError, 'GoogleDriveButton');
      }
      handleBrowse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  const getButtonText = () => {
    if (isLoading) return 'Loading...';
    if (isProcessing) return hasToken ? 'Opening Drive...' : 'Connecting...';
    return hasToken ? 'Browse Google Drive' : 'Connect Google Drive';
  };

  const getButtonIcon = () => {
    if (isProcessing || isLoading) {
      return <Loader2 className="w-5 h-5 mr-2 animate-spin" />;
    }
    if (error) {
      return <AlertCircle className="w-5 h-5 mr-2" />;
    }
    return <Cloud className="w-5 h-5 mr-2" />;
  };
  
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={hasToken ? handleBrowse : handleConnect}
        disabled={isDisabled}
        className={`flex items-center px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          error 
            ? 'bg-red-600 hover:bg-red-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        } ${className}`}
      >
        {getButtonIcon()}
        {getButtonText()}
      </button>
      
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-700">
              {error.includes('API key') ? (
                <div>
                  <p className="font-medium mb-1">Google Drive API configuration error:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check NEXT_PUBLIC_GOOGLE_API_KEY is set</li>
                    <li>Verify API key has correct referrer restrictions</li>
                    <li>Ensure Google Drive and Picker APIs are enabled</li>
                    <li>Check NEXT_PUBLIC_GOOGLE_APP_ID is configured</li>
                  </ul>
                </div>
              ) : (
                <p>{error}</p>
              )}
              <button
                onClick={() => {
                  setError(null);
                  logInfo('Error dismissed by user', { previousError: error }, 'GoogleDriveButton');
                }}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <p>Debug Info:</p>
          <p>• API Key: {apiKey ? '✓ Set' : '✗ Missing'}</p>
          <p>• App ID: {appId ? '✓ Set' : '(optional) Missing'}</p>
          <p>• Token: {hasToken ? '✓ Available' : '✗ Missing'}</p>
          <p>• Session: {status}</p>
        </div>
      )}
    </div>
  );
}