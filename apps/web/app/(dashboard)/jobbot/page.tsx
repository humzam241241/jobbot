import React from 'react';
import dynamic from 'next/dynamic';

// Import the legacy component dynamically to avoid issues
const EnhancedResumeKitForm = dynamic(
  () => import('@/components/jobbot/EnhancedResumeKitForm'),
  { ssr: false }
);

export default function JobbotPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Resume Generator</h1>
      
      <EnhancedResumeKitForm />
    </div>
  );
}