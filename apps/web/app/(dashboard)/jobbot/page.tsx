import React from 'react';
import ResumeTailor from '@/components/jobbot/ResumeTailor';
import dynamic from 'next/dynamic';

// Import the legacy component dynamically to avoid issues
const EnhancedResumeKitForm = dynamic(
  () => import('@/components/jobbot/EnhancedResumeKitForm'),
  { ssr: false }
);

export default function JobbotPage() {
  // Check if we should use the new pipeline
  const useNewPipeline = process.env.RESUME_PIPELINE_V2 !== 'false';

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Resume Generator</h1>
      
      {useNewPipeline ? (
        <ResumeTailor />
      ) : (
        <EnhancedResumeKitForm />
      )}
    </div>
  );
}