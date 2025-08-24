# JobBot Pipeline Implementation Plan

## Overview

This document outlines the plan for refactoring the JobBot pipeline to handle any user's resume and job description. The implementation will be done in phases to ensure the existing pipeline is not broken.

## Phase 1: Setup and Dependencies

### Additional Dependencies to Install
```bash
pnpm add playwright @playwright/test stopwords-iso wink-nlp wink-eng-lite-model
pnpm add -D @types/lodash
```

Note: Many required packages are already installed:
- pdf-lib, @pdf-lib/fontkit
- zod, json5
- pdfjs-dist
- tesseract.js
- lodash

### Directory Structure
```
apps/web/lib/pdf/
├── extract/
│   ├── extract-pdf.ts       # PDF text extraction
│   ├── ocr-fallback.ts      # OCR for scanned PDFs
│   └── to-facts.ts          # Convert extracted text to structured facts
├── tailor/
│   ├── llm-tailor.ts        # LLM-based tailoring
│   ├── schema.ts            # Zod schemas for validation
│   └── guardrails.ts        # Ensure factual accuracy
├── score/
│   ├── keyword-extractor.ts # Extract keywords from JD
│   ├── synonym-expander.ts  # Handle synonyms
│   └── ats-scorer.ts        # Score resume against JD
├── render/
│   ├── resume-renderer.ts   # Render tailored resume
│   ├── cover-letter.ts      # Generate cover letter
│   └── ats-report.ts        # Generate ATS report
└── api/
    └── pipeline.ts          # Main pipeline orchestration
```

## Phase 2: PDF Extraction Module

### extract-pdf.ts
```typescript
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/types/src/display/api';

export interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName?: string;
  fontWeight?: string;
  page: number;
}

export async function extractPdfText(pdfBuffer: Buffer): Promise<TextBlock[]> {
  // Initialize PDF.js
  // Extract text with position and font information
  // Return structured text blocks
}
```

### ocr-fallback.ts
```typescript
import { createWorker } from 'tesseract.js';

export async function performOcr(pdfBuffer: Buffer): Promise<TextBlock[]> {
  // Convert PDF pages to images
  // Process with Tesseract.js
  // Return structured text blocks
}
```

### to-facts.ts
```typescript
export interface ResumeFacts {
  contact: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: string[];
  };
  skills: string[];
  experience: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string[];
  }>;
  education: Array<{
    degree?: string;
    school?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
    details?: string[];
  }>;
}

export function extractResumeFacts(textBlocks: TextBlock[]): ResumeFacts {
  // Analyze text blocks
  // Identify sections by font size, position, keywords
  // Extract structured information
  // Return normalized resume facts
}
```

## Phase 3: LLM Tailoring Module

### schema.ts
```typescript
import { z } from 'zod';

export const TailoredResumeSchema = z.object({
  contact: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    links: z.array(z.string()).optional(),
  }),
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string().optional(),
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    bullets: z.array(z.string()),
  })),
  education: z.array(z.object({
    degree: z.string().optional(),
    school: z.string(),
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    gpa: z.string().optional(),
    details: z.array(z.string()).optional(),
  })),
  gaps: z.array(z.string()).optional(),
});

export type TailoredResume = z.infer<typeof TailoredResumeSchema>;
```

### llm-tailor.ts
```typescript
import { TailoredResume, TailoredResumeSchema } from './schema';
import { ResumeFacts } from '../extract/to-facts';
import { validateTailoredContent } from './guardrails';

export async function tailorResume(
  resumeFacts: ResumeFacts,
  jobDescription: string
): Promise<TailoredResume> {
  // Prepare prompt with resume facts and job description
  // Call LLM with guardrails
  // Parse and validate response
  // Return tailored resume content
}
```

## Phase 4: ATS Scoring Module

### keyword-extractor.ts
```typescript
import stopwords from 'stopwords-iso';
import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-model';

export function extractKeywords(text: string): string[] {
  // Tokenize text
  // Remove stopwords
  // Lemmatize words
  // Filter out dates, fillers, etc.
  // Return important keywords
}
```

### ats-scorer.ts
```typescript
export interface ATSScore {
  overall: number;
  skillsScore: number;
  experienceScore: number;
  keywordScore: number;
  matched: string[];
  missing: string[];
  recommendations: string[];
}

export function scoreResume(
  tailoredResume: TailoredResume,
  jobDescription: string
): ATSScore {
  // Extract keywords from job description
  // Compare with tailored resume
  // Calculate scores
  // Generate recommendations
  // Return ATS score
}
```

## Phase 5: Rendering Module

### resume-renderer.ts
```typescript
import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export async function renderTailoredResume(
  originalPdfBuffer: Buffer,
  tailoredResume: TailoredResume,
  textBlocks: TextBlock[]
): Promise<Buffer> {
  // Load original PDF
  // Identify sections
  // Whiteout original text
  // Insert tailored content
  // Handle overflow
  // Return modified PDF buffer
}
```

### cover-letter.ts
```typescript
import { chromium } from 'playwright';

export async function generateCoverLetter(
  tailoredResume: TailoredResume,
  jobDescription: string
): Promise<Buffer> {
  // Generate HTML template
  // Render with Playwright
  // Convert to PDF
  // Return PDF buffer
}
```

### ats-report.ts
```typescript
import { chromium } from 'playwright';

export async function generateATSReport(
  atsScore: ATSScore,
  tailoredResume: TailoredResume,
  jobDescription: string
): Promise<Buffer> {
  // Generate HTML template
  // Render with Playwright
  // Convert to PDF
  // Return PDF buffer
}
```

## Phase 6: API Integration

### pipeline.ts
```typescript
export async function generateResumeKit(
  resumePdfBuffer: Buffer,
  jobDescription: string
): Promise<{
  tailoredResumePdf: Buffer;
  coverLetterPdf: Buffer;
  atsReportPdf: Buffer;
}> {
  // Extract text from PDF
  // Fall back to OCR if needed
  // Extract resume facts
  // Tailor resume
  // Score against job description
  // Render all PDFs
  // Return all artifacts
}
```

### api/resume/generate/route.ts (update)
```typescript
import { generateResumeKit } from '@/lib/pdf/api/pipeline';

export async function POST(request: NextRequest) {
  // Parse form data
  // Call pipeline
  // Save artifacts
  // Return response
}
```

## Implementation Strategy

1. **Incremental Development**: Implement each module separately and test thoroughly.
2. **Parallel Pipeline**: Keep the existing pipeline functional while developing the new one.
3. **Feature Flags**: Use environment variables to toggle between old and new pipelines.
4. **Graceful Degradation**: Ensure each step can fall back to simpler methods if needed.
5. **Comprehensive Testing**: Test with various resume formats and job descriptions.

## Testing Plan

1. **Unit Tests**: Test each module in isolation.
2. **Integration Tests**: Test the entire pipeline with various inputs.
3. **Manual Testing**: Verify output quality and accuracy.
4. **Error Handling**: Test with edge cases and malformed inputs.

## Rollout Plan

1. **Development**: Implement all modules and test locally.
2. **Staging**: Deploy to staging environment and test with real data.
3. **Gradual Rollout**: Enable for a subset of users and gather feedback.
4. **Full Deployment**: Roll out to all users once stable.

## Monitoring and Maintenance

1. **Error Logging**: Log all errors and exceptions.
2. **Performance Monitoring**: Track processing time and resource usage.
3. **User Feedback**: Collect and analyze user feedback.
4. **Continuous Improvement**: Refine algorithms and models based on feedback.
