/**
 * Client-side PDF generation using jsPDF
 * This is used as a fallback when server-side PDF generation fails
 */

// We'll use dynamic imports to ensure this only loads on the client side
export async function generateClientPdf(
  html: string,
  options: { 
    title?: string;
    size?: "Letter" | "A4";
  } = {}
): Promise<Blob> {
  try {
    console.log('Generating PDF on client side with jsPDF');
    
    // Dynamically import jspdf only on client side
    const { jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    
    // Create a temporary container to render the HTML
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '8.5in'; // Letter size width
    container.style.fontFamily = 'Arial, sans-serif';
    container.innerHTML = html;
    
    document.body.appendChild(container);
    
    // Create PDF with proper dimensions
    const pageSize = options.size === 'A4' ? 'a4' : 'letter';
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: pageSize
    });
    
    // Set title
    if (options.title) {
      pdf.setProperties({
        title: options.title
      });
    }
    
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
    
    // Return as blob
    const pdfBlob = pdf.output('blob');
    console.log(`Client PDF generated successfully, size: ${pdfBlob.size} bytes`);
    return pdfBlob;
  } catch (error) {
    console.error('Client PDF generation failed', error);
    
    // Return a simple text blob as fallback
    const fallbackText = `
      ${options.title || 'Document'} (Error)
      
      There was an error generating the PDF on the client side.
      
      ${html.substring(0, 500)}...
    `;
    
    return new Blob([fallbackText], { type: 'text/plain' });
  }
}
