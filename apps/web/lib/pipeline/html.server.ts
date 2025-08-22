// apps/web/lib/pipeline/html.server.ts
import "server-only";

// Import ReactNode type only for TypeScript, not the actual React
import type { ReactNode } from "react";

export type HtmlLike =
  | string
  | ReactNode
  | { toHTML?: () => string }
  | Record<string, any>
  | null
  | undefined;

/**
 * Server-only conversion to a pure HTML string.
 * - If input is already a string, returns it.
 * - If input has toHTML(), uses it.
 * - For objects, JSON stringifies them.
 * - For null/undefined, returns empty string.
 */
export function toHtmlString(input: HtmlLike): string {
  if (input == null) return "";
  if (typeof input === "string") return input;

  if (typeof (input as any).toHTML === "function") {
    try { return (input as any).toHTML(); } catch { /* fallthrough */ }
  }

  // For React elements, we'd use renderToStaticMarkup, but to avoid RSC errors,
  // we'll handle objects generically instead
  if (typeof input === "object") {
    try {
      return `<pre>${escapeHtml(JSON.stringify(input, null, 2))}</pre>`;
    } catch {
      return "<pre>[Object]</pre>";
    }
  }

  return String(input);
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}