# PDF Resume Generation Pipeline

This module provides a comprehensive pipeline for generating tailored resumes from PDF templates while preserving the original formatting.

## Architecture

The pipeline is organized into the following components:

### 1. Analyzer

- **extract.ts**: Extracts text items from a PDF using pdf.js
- **blocks.ts**: Groups text items into lines and blocks
- **headings.ts**: Detects headings and their section types
- **sections.ts**: Builds a section map from headings and blocks
- **ocr.ts**: Provides OCR fallback for scanned PDFs
- **types.ts**: Defines types for the analyzer components

### 2. Renderer

- **draw.ts**: Provides utilities for drawing text, bullets, and rectangles
- **paginate.ts**: Handles overflow content with additional pages
- **render.ts**: Main rendering functions for in-place and fallback modes

### 3. Normalize

- **json-schema.ts**: Defines Zod schemas for LLM output validation
- **map-json-to-slots.ts**: Maps structured data to detected sections

### 4. Debug

- **overlay.ts**: Creates debug overlays for visualizing detected sections

### 5. Fonts

- Contains embedded fonts for rendering

## Usage

```typescript
import { generateTailoredResume } from '@/lib/pdf';
import { llm } from '@/lib/providers/llm';

// Example usage
async function tailorResume(pdfBytes: Uint8Array, jobDescription: string) {
  const result = await generateTailoredResume(
    {
      pdfBytes,
      jobDescription,
      debug: process.env.DEBUG_RENDER === '1',
      strict: process.env.RESUME_RENDER_STRICT === 'true'
    },
    async (system, user, model) => {
      return await llm.complete({
        system,
        user,
        model: model || 'auto'
      });
    }
  );
  
  return result.pdfBytes;
}
```

## Configuration

The pipeline can be configured using environment variables:

- `DEBUG_RENDER`: Set to '1' to enable debug overlays
- `RESUME_RENDER_STRICT`: Set to 'true' to force fallback mode for low-confidence layouts

## Fallback Mode

When the pipeline cannot confidently identify sections in the resume, or when processing scanned PDFs, it falls back to a mode where it preserves the original resume and appends a new page with the tailored content.

## OCR Support

The pipeline includes OCR support for scanned PDFs using Tesseract.js.
