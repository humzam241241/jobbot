'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { FileText, Upload, Loader2, Cloud, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useSession, signIn } from 'next-auth/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { toast } from 'react-hot-toast';

// Define window.gapi and window.google types
declare global {
  interface Window {
    gapi: any;
    google: any;
    onGoogleApiLoad: () => void;
    onGisLoad: () => void;
  }
}

const AI_PROVIDERS = {
  'Google': ['Gemini 2.5 Pro', 'Gemini 2.5 Ultra', 'Gemini 1.5 Flash'],
  'OpenAI': ['GPT-5', 'GPT-4o', 'GPT-4 Turbo'],
  'Anthropic': ['Claude 4', 'Claude 3.5 Sonnet', 'Claude 3 Opus'],
  'DeepSeek': ['DeepSeek R1', 'DeepSeek Coder', 'DeepSeek Chat'],
  'Mistral': ['Mistral Large', 'Mistral Medium', 'Mistral Small']
} as const;

type Provider = keyof typeof AI_PROVIDERS;
type Model = (typeof AI_PROVIDERS)[Provider][number];
type InputType = 'file' | 'gdrive';

// Get environment variables
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

function JobBotContent() {
  const [inputType, setInputType] = useState<InputType>('file');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider>('Google');
  const [selectedModel, setSelectedModel] = useState<Model>(AI_PROVIDERS['Google'][0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [kitId, setKitId] = useState<string | null>(null);
  const [debugMessage, setDebugMessage] = useState<string>('');
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { decrementCredits } = useAuth();
  const { data: session } = useSession();
  
  // Client-side port detection (to fix hydration error)
  const [port, setPort] = useState<string>('');
  
  useEffect(() => {
    // Set port only on client side
    if (typeof window !== 'undefined') {
      setPort(window.location.port);
    }
  }, []);

  // Load Google APIs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('Loading Google APIs...');
    setDebugMessage('Loading Google APIs...');

    // Load GAPI
    if (!window.gapi) {
      window.onGoogleApiLoad = () => {
        console.log('GAPI script loaded. Loading picker module...');
        window.gapi.load('picker', {
          callback: () => {
            setGapiLoaded(true);
            console.log('GAPI picker module loaded.');
            setDebugMessage('GAPI picker module loaded.');
          },
        });
      };
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js?onload=onGoogleApiLoad';
      gapiScript.async = true;
      gapiScript.defer = true;
      document.head.appendChild(gapiScript);
    } else if (window.gapi.picker) {
      setGapiLoaded(true);
      console.log('GAPI already loaded.');
      setDebugMessage('GAPI already loaded.');
    }

    // Load GIS
    if (!window.google?.accounts?.oauth2) {
      window.onGisLoad = () => {
        setGisLoaded(true);
        console.log('GIS script loaded.');
        setDebugMessage('GIS script loaded.');
      };
      const gisScript = document.createElement('script');
      gisScript.src = `https://accounts.google.com/gsi/client`;
      gisScript.async = true;
      gisScript.defer = true;
      gisScript.onload = window.onGisLoad;
      document.head.appendChild(gisScript);
    } else if (window.google?.accounts?.oauth2) {
      setGisLoaded(true);
      console.log('GIS already loaded.');
      setDebugMessage('GIS already loaded.');
    }

    return () => {
      // Cleanup scripts if they were added by this component
      const gapiScript = document.querySelector('script[src*="apis.google.com/js/api.js"]');
      if (gapiScript) document.head.removeChild(gapiScript);
      const gisScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (gisScript) document.head.removeChild(gisScript);
      delete window.onGoogleApiLoad;
      delete window.onGisLoad;
    };
  }, []);

  const createKit = useCallback(async () => {
    console.log('Creating kit...');
    setDebugMessage('Creating kit...');
    
    try {
      const res = await fetch('/api/kits', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Create kit error response:', errorText);
        throw new Error(`Failed to create kit: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Kit created:', data);
      setDebugMessage('Kit created: ' + data.kitId);
      setKitId(data.kitId);
      return data.kitId;
    } catch (error: any) {
      console.error('Failed to create kit:', error);
      setDebugMessage('Failed to create kit: ' + error.message);
      toast.error('Failed to create kit: ' + error.message);
      throw error;
    }
  }, []);

  const handleGoogleDriveSelect = useCallback(async () => {
    console.log('Browse Google Drive clicked.');
    setDebugMessage('Browse Google Drive clicked.');
    
    if (!gapiLoaded || !gisLoaded) {
      toast.error('Google APIs not fully loaded. Please wait a moment.');
      setDebugMessage('Google APIs not ready for picker.');
      return;
    }

    setIsPickerLoading(true);
    
    try {
      // We need an access token with Drive scope
      if (!session?.accessToken) {
        console.log('No access token found. Initiating Google sign-in.');
        setDebugMessage('No access token found. Please sign in with Google.');
        
        // Force a sign-in with consent to ensure Drive scope is granted
        await signIn('google', { 
          redirect: false, 
          prompt: 'consent',
          callbackUrl: window.location.href
        });
        
        toast.info('Please sign in with Google and grant Drive access.');
        setIsPickerLoading(false);
        return;
      }

      console.log('Creating Google Picker...');
      setDebugMessage('Creating Google Picker...');
      
      // Create the Google Picker
      const google = window.google;
      const gapi = window.gapi;
      
      if (!google || !gapi || !gapi.picker) {
        throw new Error('Google APIs not fully loaded');
      }
      
      const docsView = new gapi.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false)
        .setMimeTypes('application/vnd.google-apps.document,application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      const picker = new gapi.picker.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(session.accessToken as string)
        .setDeveloperKey(GOOGLE_API_KEY as string)
        .setAppId(GOOGLE_APP_ID as string)
        .setCallback(async (data: any) => {
          if (data.action === 'picked') {
            const file = data.docs[0];
            console.log('File picked:', file);
            setDebugMessage(`Selected file: ${file.name} (${file.id})`);
            
            // Handle the selected file
            await handleGoogleDriveFileDownload(file.id, file.name, session.accessToken as string);
          } else if (data.action === 'cancel') {
            console.log('Picker closed without selection');
            setDebugMessage('Picker closed without selection');
          }
        })
        .build();
      
      picker.setVisible(true);
      console.log('Picker opened');
      setDebugMessage('Picker opened');
      
    } catch (error: any) {
      console.error('Google Picker error:', error);
      setDebugMessage(`Picker error: ${error.message}`);
      toast.error(`Failed to open Google Drive picker: ${error.message}`);
    } finally {
      setIsPickerLoading(false);
    }
  }, [gapiLoaded, gisLoaded, session, GOOGLE_API_KEY, GOOGLE_APP_ID]);

  const handleGoogleDriveFileDownload = async (fileId: string, fileName: string, accessToken: string) => {
    setIsLoading(true);
    toast.loading('Downloading file from Google Drive...');
    setDebugMessage(`Downloading file ${fileName} from Google Drive...`);

    try {
      // For Google Docs, we need to export it as DOCX
      const isGoogleDoc = fileName.endsWith('.gdoc') || fileName.includes('document');
      const url = isGoogleDoc
        ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document`
        : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

      const downloadResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!downloadResponse.ok) {
        const errorText = await downloadResponse.text();
        throw new Error(`Failed to download file from Google Drive: ${downloadResponse.status} ${downloadResponse.statusText} - ${errorText}`);
      }

      const blob = await downloadResponse.blob();
      const docxName = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
      const downloadedFile = new File([blob], docxName, { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      toast.dismiss();
      toast.success('File downloaded from Google Drive');
      setDebugMessage('File downloaded from Google Drive');

      // Create a kit if not already created
      let currentKitId = kitId;
      if (!currentKitId) {
        currentKitId = await createKit();
      }

      // Upload the downloaded file to our server
      const formData = new FormData();
      formData.append('file', downloadedFile);

      const uploadResponse = await fetch(`/api/kits/${currentKitId}/source`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Failed to upload file to server: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
      }

      toast.success('File uploaded successfully!');
      setSelectedFile(downloadedFile);
      setDebugMessage('File uploaded to server');

    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'An unexpected error occurred');
      console.error('Google Drive file processing error:', error);
      setDebugMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.name.endsWith('.docx')) {
        setSelectedFile(file);
        toast.success('File selected successfully!');
      } else {
        toast.error('Please upload a Microsoft Word (.docx) document');
        setSelectedFile(null);
      }
    }
  };

  const handleProviderChange = (provider: Provider) => {
    setSelectedProvider(provider);
    setSelectedModel(AI_PROVIDERS[provider][0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !jobDescription.trim()) {
      toast.error('Please provide a document and job description');
      return;
    }

    setIsLoading(true);
    toast.loading('Generating your resume kit...');

    try {
      const currentKitId = kitId || await createKit();

      // If file was uploaded directly (not from Drive)
      if (inputType === 'file') {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const sourceResponse = await fetch(`/api/kits/${currentKitId}/source`, {
          method: 'POST',
          body: formData
        });
        
        if (!sourceResponse.ok) {
          throw new Error('Failed to upload document');
        }
      }

      // Generate the documents
      const generateResponse = await fetch(`/api/kits/${currentKitId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          provider: selectedProvider,
          model: selectedModel
        })
      });

      if (!generateResponse.ok) {
        throw new Error('Failed to generate documents');
      }

      decrementCredits();
      toast.dismiss();
      toast.success('Resume kit generated successfully!');

    } catch (err) {
      toast.dismiss();
      toast.error('An error occurred during generation');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-2">Resume Generator Kit</h1>
      <p className="text-gray-600 text-center mb-8">
        Upload your resume (DOCX) or select from Google Drive to create a tailored application
      </p>
      
      {/* API Status Debug */}
      <div className="mb-4 text-sm text-gray-700 flex justify-center gap-4">
        <div className="flex items-center">
          <span>GAPI:</span> 
          {gapiLoaded ? 
            <CheckCircle className="inline-block w-4 h-4 text-green-500 ml-1" /> : 
            <XCircle className="inline-block w-4 h-4 text-red-500 ml-1" />}
        </div>
        <div className="flex items-center">
          <span>GIS:</span> 
          {gisLoaded ? 
            <CheckCircle className="inline-block w-4 h-4 text-green-500 ml-1" /> : 
            <XCircle className="inline-block w-4 h-4 text-red-500 ml-1" />}
        </div>
        <div className="flex items-center">
          <span>Port:</span> <span className="ml-1">{port}</span>
        </div>
      </div>
      
      {/* Debug Message */}
      {debugMessage && (
        <div className="text-xs bg-gray-100 p-2 rounded text-gray-700 max-h-20 overflow-auto mb-4 mx-auto max-w-3xl">
          {debugMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
        {/* Input Type Selection */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button
            type="button"
            onClick={() => {
              setInputType('file');
              fileInputRef.current?.click();
            }}
            className="flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <FileText className="w-5 h-5 mr-2" />
            Upload DOCX
          </button>
          
          <button
            type="button"
            onClick={handleGoogleDriveSelect}
            disabled={isPickerLoading || !gapiLoaded || !gisLoaded}
            className="flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Cloud className="w-5 h-5 mr-2" />
            {isPickerLoading ? 'Loading...' : 'Browse Google Drive'}
          </button>
          
          {/* Hidden file input for regular uploads */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />
      </div>

        {/* File Display */}
        {selectedFile && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Selected Document
            </label>
            <div className="border-2 border-gray-300 rounded-lg p-4">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">{selectedFile.name}</span>
            </div>
            </div>
          </div>
        )}

        {/* Job Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* AI Provider Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            AI Provider
          </label>
          <select
            value={selectedProvider}
            onChange={(e) => handleProviderChange(e.target.value as Provider)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.keys(AI_PROVIDERS).map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </div>

        {/* AI Model Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            AI Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as Model)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {AI_PROVIDERS[selectedProvider].map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !selectedFile || !jobDescription}
          className={`w-full flex items-center justify-center px-4 py-3 rounded-md text-white font-medium transition-colors ${
            isLoading || !selectedFile || !jobDescription
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="h-5 w-5 mr-2" />
              Generate Resume Kit
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function JobBotPage() {
  return (
    <ErrorBoundary>
      <JobBotContent />
    </ErrorBoundary>
  );
}