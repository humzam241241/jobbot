// apps/web/lib/pipeline/server-renderer.tsx
import "server-only";

// Import only the type, not the actual implementation
import type { ReactNode } from "react";

/**
 * Server-only component that renders React elements to HTML strings.
 * This is safe to use in server components but should never be imported by client code.
 */
export function renderReactToHtml(element: ReactNode): string {
  // We need to use dynamic import to avoid RSC boundary errors
  // This ensures the actual react-dom/server module is only loaded at runtime
  // and only on the server
  return dynamicRenderToStaticMarkup(element);
}

// Use a separate async function to dynamically import react-dom/server
// This prevents the module from being included in client bundles
async function dynamicRenderToStaticMarkup(element: ReactNode): Promise<string> {
  try {
    // Dynamic import is only evaluated at runtime on the server
    const { renderToStaticMarkup } = await import("react-dom/server");
    return renderToStaticMarkup(element as any);
  } catch (error) {
    console.error("Failed to render React element to HTML:", error);
    return `<pre>Error rendering component</pre>`;
  }
}