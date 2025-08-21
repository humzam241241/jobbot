/**
 * Client-side PDF generation utilities
 */

/**
 * Generate a PDF using the server API
 */
export async function generatePdf(
  component: 'resume' | 'coverLetter' | 'atsReport',
  props: any,
  options: {
    title?: string;
    size?: "Letter" | "A4";
    fileName?: string;
    saveToPath?: boolean;
  } = {}
): Promise<{ url: string; fileName: string }> {
  const response = await fetch('/api/pdf/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      component,
      props,
      options
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'PDF generation failed');
  }

  return response.json();
}
