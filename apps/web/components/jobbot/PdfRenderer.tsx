'use client';

import { useState, useEffect } from 'react';
import ClientPdfRenderer from '@/lib/pdf/clientRenderer';

/**
 * PDF Renderer component
 * This component renders PDFs and handles both server-side and client-side rendering
 */
export default function PdfRenderer({
  pdfUrl,
  fileName,
  onClose,
}: {
  pdfUrl: string;
  fileName: string;
  onClose?: () => void;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Check if this is HTML content that needs client-side rendering
    if (pdfUrl.startsWith('data:text/html;base64,')) {
      setIsClient(true);
    } else {
      // This is a PDF, download it automatically
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      link.click();
      
      // Also open it in a new tab
      window.open(pdfUrl, '_blank');
    }
  }, [pdfUrl, fileName]);

  if (isClient) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">PDF Generation</h3>
            {onClose && (
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>
          
          <ClientPdfRenderer pdfUrl={pdfUrl} fileName={fileName} />
        </div>
      </div>
    );
  }

  // For regular PDFs, we don't need to show anything as they're downloaded automatically
  return null;
}
