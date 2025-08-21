"use client";

import React from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface PDFActionsProps {
  pdfUrl: string;
  fileName: string;
}

export const PDFActions: React.FC<PDFActionsProps> = ({ pdfUrl, fileName }) => {
  const handleView = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex mt-2 space-x-2">
      <button
        onClick={handleView}
        className="inline-flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
      >
        <span>View</span>
      </button>
      <button
        onClick={handleDownload}
        className="inline-flex items-center px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200"
      >
        <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
        <span>Download</span>
      </button>
    </div>
  );
};

export default PDFActions;
