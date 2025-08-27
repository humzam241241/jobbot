"use client";

import { CheckCircle2, FileText } from "lucide-react";

interface SelectedFileBannerProps {
  name: string;
  mimeType?: string;
}

export default function SelectedFileBanner({ name, mimeType }: SelectedFileBannerProps) {
  return (
    <div className="mt-4 w-full max-w-3xl mx-auto flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
      <div className="flex items-center">
        <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
        <span className="font-medium text-green-700">Selected from Google Drive</span>
      </div>
      <div className="flex items-center text-sm text-gray-700">
        <FileText className="w-4 h-4 mr-1" />
        <span className="truncate max-w-[260px]" title={name}>{name}</span>
        {mimeType && <span className="ml-2 text-gray-500">({mimeType})</span>}
      </div>
    </div>
  );
}


