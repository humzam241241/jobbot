import sanitize from "sanitize-html";

export function toSafeHtml(inner: string) {
  const cleaned = sanitize(inner || "", {
    allowedTags: sanitize.defaults.allowedTags.concat(["h1","h2","h3","section","article","header","footer","figure"]),
    allowedAttributes: {
      "*": ["id","class","aria-*"],
      a: ["href","name","target","rel"],
    },
    transformTags: {
      // strip inline styles entirely to keep print consistent
      "*": sanitize.simpleTransform("*", {}, true),
    },
  });
  return cleaned || "<article><p>No content.</p></article>";
}

export function wrapForPrint(inner: string, {title="Document", size="Letter"}: {title?: string; size?: "Letter"|"A4"} = {}) {
  // Don't sanitize if the content already has a DOCTYPE (it's already a complete HTML document)
  if (inner.trim().toLowerCase().startsWith('<!doctype')) {
    return inner;
  }
  
  // Otherwise, wrap with our standard template
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
  
  @page { 
    size: ${size}; 
    margin: 0.5in 0.5in 0.5in 0.5in;
  }
  
  /* Base styles */
  :root { 
    --fg: #1a202c; 
    --muted: #4a5568; 
    --accent: #2b6cb0;
    --border: #e2e8f0;
  }
  
  html, body { 
    color: var(--fg); 
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    font-size: 11.5pt;
    line-height: 1.4;
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
  }
  
  /* Typography */
  h1, h2, h3 { 
    margin: 0 0 0.4rem; 
    line-height: 1.2;
  }
  
  h1 { 
    font-size: 18pt; 
    font-weight: 700;
  }
  
  h2 { 
    font-size: 14pt; 
    font-weight: 700;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.2rem;
    margin-bottom: 0.6rem;
  }
  
  h3 { 
    font-size: 12pt; 
    font-weight: 700;
  }
  
  p { 
    margin: 0 0 0.6rem;
  }
  
  /* Lists */
  ul { 
    margin: 0 0 0.6rem 1.25rem; 
    padding: 0; 
  } 
  
  li { 
    margin: 0 0 0.3rem;
    position: relative;
  }
  
  /* Layout elements */
  header {
    text-align: center;
    margin-bottom: 1rem;
  }
  
  .section { 
    margin-bottom: 1rem;
    page-break-inside: avoid;
  }
  
  /* Experience items */
  .experience-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.3rem;
  }
  
  .experience-title {
    font-weight: 700;
  }
  
  .experience-subtitle {
    font-style: italic;
    color: var(--muted);
  }
</style>
</head>
<body>
${toSafeHtml(inner)}
</body>
</html>`;
}
