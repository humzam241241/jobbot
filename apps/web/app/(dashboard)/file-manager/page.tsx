'use client';

import { SectionCard } from '@/components/ui/SectionCard';
import FileManager from '@/components/file-manager/FileManager';

export default function FileManagerPage() {
  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">File Manager</h1>
      </div>
      <FileManager />
    </SectionCard>
  );
}
