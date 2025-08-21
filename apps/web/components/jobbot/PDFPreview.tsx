"use client";

import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import PDFActions from './PDFActions';

interface PDFPreviewProps {
  pdfUrl: string;
  fileName: string;
  title: string;
  iconColor?: string;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ 
  pdfUrl, 
  fileName, 
  title,
  iconColor = 'text-blue-500'
}) => {
  return (
    <div className="flex flex-col items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50">
      <DocumentTextIcon className={`h-12 w-12 ${iconColor} mb-2`} />
      <span className="font-medium">{title}</span>
      <PDFActions pdfUrl={pdfUrl} fileName={fileName} />
    </div>
  );
};

export default PDFPreview;
