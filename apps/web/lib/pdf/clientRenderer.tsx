'use client';

import { useState, useEffect } from 'react';

/**
 * Client-side PDF renderer component
 * This component is used to render PDFs on the client side using jsPDF
 */
export default function ClientPdfRenderer({
  pdfUrl,
  fileName,
}: {
  pdfUrl: string;
  fileName: string;
}) {
  const [isRendering, setIsRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function renderPdf() {
      try {
        // Check if this is HTML content that needs client-side rendering
        if (pdfUrl.startsWith('data:application/pdf;base64,')) {
          // This is already a PDF, just download it
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = fileName;
          link.click();
          setIsRendering(false);
          return;
        }
        
        // If we got here, it's HTML that needs to be rendered to PDF
        // First decode the HTML from base64
        const base64Data = pdfUrl.replace('data:text/html;base64,', '');
        const htmlContent = atob(base64Data);
        
        // Check if this is meant for client-side rendering
        if (!htmlContent.includes('meta name="pdf-engine" content="client"')) {
          // Not meant for client-side rendering, just open in new window
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setIsRendering(false);
          return;
        }
        
        // Dynamically import jspdf only on client side
        const { jsPDF } = await import('jspdf');
        const { default: html2canvas } = await import('html2canvas');
        
        // Create a temporary container to render the HTML
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '8.5in'; // Letter size width
        container.innerHTML = htmlContent;
        document.body.appendChild(container);
        
        // Create PDF with proper dimensions
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'in',
          format: 'letter'
        });
        
        // Extract title from HTML
        const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? titleMatch[1] : fileName;
        
        // Set title
        pdf.setProperties({
          title: title
        });
        
        // Render HTML to canvas
        const canvas = await html2canvas(container, {
          scale: 2, // Higher scale for better quality
          useCORS: true,
          logging: false
        });
        
        // Calculate dimensions
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const ratio = canvas.width / pdfWidth;
        const canvasHeight = canvas.height / ratio;
        
        // Add image to PDF
        let currentHeight = 0;
        let pageCount = 1;
        
        while (currentHeight < canvasHeight) {
          // If not the first page, add a new page
          if (pageCount > 1) {
            pdf.addPage();
          }
          
          // Add a portion of the canvas to the current page
          pdf.addImage(
            imgData,
            'PNG',
            0,
            -currentHeight,
            pdfWidth,
            canvasHeight
          );
          
          currentHeight += pdfHeight;
          pageCount++;
        }
        
        // Clean up
        document.body.removeChild(container);
        
        // Save the PDF
        pdf.save(fileName);
        setIsRendering(false);
        
      } catch (err: any) {
        console.error('Error rendering PDF on client side:', err);
        setError(err.message || 'Failed to render PDF');
        setIsRendering(false);
      }
    }
    
    renderPdf();
  }, [pdfUrl, fileName]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        <h3 className="font-bold">Error rendering PDF</h3>
        <p>{error}</p>
        <p className="mt-2">
          <a 
            href={pdfUrl} 
            download={fileName}
            className="text-blue-600 underline"
          >
            Download raw content instead
          </a>
        </p>
      </div>
    );
  }

  if (isRendering) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-3"></div>
        <span>Rendering PDF...</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 text-green-700 rounded-md">
      <p>PDF generated and downloaded successfully!</p>
      <p className="mt-2">
        <a 
          href="#" 
          onClick={(e) => {
            e.preventDefault();
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = fileName;
            link.click();
          }}
          className="text-blue-600 underline"
        >
          Download again
        </a>
      </p>
    </div>
  );
}
