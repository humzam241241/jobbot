import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ResumeKit } from '@/types';
import { apiPost, apiUpload, ApiError, apiGet } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import debugLogger from '@/lib/utils/debug-logger';

interface GenerationState {
  isLoading: boolean;
  progress: number;
  error: string | null;
  debugLogs: Array<{
    timestamp: Date;
    event: string;
    data?: any;
  }>;
}

export function useResumeGeneration() {
  const router = useRouter();
  const { updateCredits } = useAuth();
  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    progress: 0,
    error: null,
    debugLogs: []
  });

  const addDebugLog = (event: string, data?: any) => {
    const logEntry = {
      timestamp: new Date(),
      event,
      data
    };
    
    debugLogger.debug(event, { component: 'ResumeGeneration', data });
    
    setState(prev => ({
      ...prev,
      debugLogs: [...prev.debugLogs, logEntry]
    }));
  };

  const generateResume = async (
    resumeFile: File,
    jobDescription: string,
    jobUrl?: string,
    provider: string = 'Google',
    model: string = 'Gemini 2.5 Pro'
  ): Promise<void> => {
    setState({ isLoading: true, progress: 0, error: null, debugLogs: [] });
    
    addDebugLog('Generation started', {
      fileSize: resumeFile.size,
      fileName: resumeFile.name,
      fileType: resumeFile.type,
      jobDescriptionLength: jobDescription.length,
      jobUrl,
      provider,
      model
    });
    
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jobDescription', jobDescription);
    
    if (jobUrl) {
      formData.append('jobUrl', jobUrl);
    }
    
    formData.append('provider', provider);
    formData.append('model', model);

    try {
      // Start generation
      addDebugLog('API request initiated');
      const startTime = performance.now();
      
      // Use fetch directly for better control over headers and response handling
      const response = await fetch('/api/resume/generate', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new ApiError(
            errorData.error?.message || `Error: ${response.status} ${response.statusText}`,
            response.status,
            errorData.error?.code
          );
        } else {
          throw new ApiError(`Error: ${response.status} ${response.statusText}`, response.status);
        }
      }
      
      const contentType = response.headers.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new ApiError('Invalid response format: Expected JSON', response.status);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new ApiError(
          data.error?.message || 'Generation failed',
          response.status,
          data.error?.code
        );
      }
      
      const result = data.data;
      
      const endTime = performance.now();
      addDebugLog('API request completed', { 
        responseTime: Math.round(endTime - startTime),
        kitId: result.id,
        status: result.status
      });
      
      // Poll for progress
      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        try {
          pollCount++;
          addDebugLog(`Polling for status (attempt ${pollCount})`, { kitId: result.id });
          
          const response = await fetch(`/api/resume-kit/${result.id}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            const contentType = response.headers.get('Content-Type');
            
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              throw new ApiError(
                errorData.error?.message || `Error polling status: ${response.status} ${response.statusText}`,
                response.status,
                errorData.error?.code
              );
            } else {
              throw new ApiError(`Error polling status: ${response.status} ${response.statusText}`, response.status);
            }
          }
          
          const contentType = response.headers.get('Content-Type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new ApiError('Invalid response format: Expected JSON', response.status);
          }
          
          const data = await response.json();
          
          if (!data.success) {
            throw new ApiError(
              data.error?.message || 'Error polling status',
              response.status,
              data.error?.code
            );
          }
          
          const status = data.data;
          
          addDebugLog('Poll response received', { 
            status: status.status,
            hasResume: !!status.tailoredResume,
            hasCoverLetter: !!status.coverLetter,
            hasAtsReport: !!status.atsReport
          });
          
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setState(prev => ({ 
              ...prev, 
              isLoading: false,
              progress: 100,
              debugLogs: [
                ...prev.debugLogs,
                {
                  timestamp: new Date(),
                  event: 'Generation completed',
                  data: { 
                    totalTime: new Date().getTime() - prev.debugLogs[0].timestamp.getTime(),
                    pollCount
                  }
                }
              ]
            }));
            
            if (updateCredits) {
              updateCredits();
            }
            router.push(`/jobbot/result/${result.id}`);
            toast.success('Resume generated successfully!');
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            addDebugLog('Generation failed', { reason: status.error || 'Unknown error' });
            throw new ApiError(status.error || 'Generation failed');
          } else {
            const progress = calculateProgress(status);
            addDebugLog('Progress update', { progress, status: status.status });
            setState(prev => ({ ...prev, progress }));
          }
        } catch (error) {
          clearInterval(pollInterval);
          addDebugLog('Poll error', { error });
          handleError(error);
        }
      }, 2000);

    } catch (error) {
      addDebugLog('Generation error', { error });
      handleError(error);
    }
  };

  const handleError = (error: unknown) => {
    const message = error instanceof ApiError 
      ? error.message 
      : 'An unexpected error occurred';
    
    setState(prev => ({ 
      ...prev, 
      isLoading: false, 
      error: message,
      debugLogs: [
        ...prev.debugLogs,
        {
          timestamp: new Date(),
          event: 'Error handled',
          data: { message, error }
        }
      ]
    }));
    
    toast.error(message);
  };

  const calculateProgress = (kit: any): number => {
    switch (kit.status) {
      case 'pending':
        return 10;
      case 'processing':
        return 50;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  };

  const exportDebugLogs = () => {
    return JSON.stringify({
      logs: state.debugLogs,
      exportedAt: new Date(),
      environment: typeof window !== 'undefined' ? 'client' : 'server',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    }, null, 2);
  };

  const downloadDebugLogs = () => {
    const logs = exportDebugLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-generation-debug-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    ...state,
    generateResume,
    exportDebugLogs,
    downloadDebugLogs
  };
}

export default useResumeGeneration;