import { ResumeGenerator } from '@/components/jobbot/ResumeGenerator';

export default function GeneratePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Generate Resume</h1>
      <ResumeGenerator />
    </div>
  );
}