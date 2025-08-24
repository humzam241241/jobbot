# Resume Pipeline

This module implements a comprehensive resume generation pipeline that can handle any user's resume and job description.

## Features

- **Universal PDF Processing**: Works with any resume format, including single/multi-column layouts and scanned PDFs.
- **OCR Fallback**: Automatically detects scanned PDFs and uses OCR to extract text.
- **Structured Data Extraction**: Converts raw text into structured resume facts.
- **LLM-Based Tailoring**: Uses AI to tailor the resume to match the job description while preserving facts.
- **ATS Scoring**: Analyzes keyword matches and provides detailed feedback.
- **Original Format Preservation**: Maintains the original resume's formatting and layout.
- **Cover Letter Generation**: Creates professional cover letters tailored to the job.
- **ATS Report**: Provides detailed ATS compatibility analysis and recommendations.

## Directory Structure

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
│   └── ats-scorer.ts        # Score resume against JD
├── render/
│   ├── resume-renderer.ts   # Render tailored resume
│   ├── cover-letter.ts      # Generate cover letter
│   └── ats-report.ts        # Generate ATS report
├── api/
│   └── pipeline.ts          # Main pipeline orchestration
└── fonts/                   # Custom fonts for rendering
```

## Usage

The main entry point is the `generateResumeKit` function in `api/pipeline.ts`:

```typescript
import { generateResumeKit } from '@/lib/pdf/api/pipeline';

// Generate a resume kit
const result = await generateResumeKit(
  resumePdfBuffer,  // Buffer containing the PDF
  jobDescription,   // Job description text
  outputDir,        // Directory to save output files
  {
    provider: 'optional-llm-provider',
    model: 'optional-model-name',
    debug: false  // Set to true to enable debug mode
  }
);

// Result contains:
// - tailoredResumePdf: Buffer containing the tailored PDF
// - coverLetterHtml: HTML string for the cover letter
// - atsReportHtml: HTML string for the ATS report
```

## Pipeline Flow

1. **PDF Processing**:
   - Extract text and layout information from the PDF
   - Fall back to OCR if the PDF is scanned
   - Convert to structured resume facts

2. **Tailoring**:
   - Use LLM to tailor the resume to the job description
   - Apply guardrails to ensure factual accuracy
   - Validate against Zod schema

3. **ATS Analysis**:
   - Extract keywords from the job description
   - Score the resume against the job requirements
   - Generate recommendations

4. **Rendering**:
   - Render the tailored resume by modifying the original PDF
   - Generate a cover letter as HTML
   - Generate an ATS report as HTML

## Error Handling

The pipeline includes robust error handling at each stage:
- PDF extraction errors trigger OCR fallback
- LLM errors trigger fallback content generation
- Font loading errors fall back to standard fonts
- All errors are logged for debugging

## Debug Mode

Enable debug mode to:
- Draw red boxes around detected sections in the PDF
- Save additional debug information
- Log more detailed messages

## Testing

Use the test scripts in `apps/web/scripts/` to test the pipeline:
- `test-full-pipeline.js`: Tests the entire pipeline
- `download-fonts.js`: Downloads required fonts