'use client';

import { ResumeGenerator } from '@/components/jobbot';

export default function JobBotPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Resume Generator</h1>
      <ResumeGenerator />
    </div>
  );
}