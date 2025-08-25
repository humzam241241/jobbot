# DOCX-First Resume Pipeline Implementation

## Overview

This implementation replaces the PDF-based resume pipeline with a DOCX-first approach. The new pipeline accepts Google Docs or DOCX files as input, converts Google Docs to DOCX server-side, tailors the resume content, generates a cover letter and ATS report, and outputs PDFs for all three documents.

## Key Features

1. **DOCX-First Approach**: Only accepts DOCX files or Google Docs (which are converted to DOCX)
2. **Structured IR**: Parses DOCX to an intermediate representation (IR) for manipulation
3. **LLM Integration**: Uses LLM to generate a strict JSON TailoringPlan
4. **Zod Validation**: Ensures LLM output conforms to the expected schema
5. **DOCX Generation**: Creates tailored resume, cover letter, and ATS report as DOCX files
6. **PDF Conversion**: Uses LibreOffice headless for high-quality PDF conversion
7. **Fallback Mechanism**: Gracefully handles missing LibreOffice by providing DOCX files

## Architecture

### File Structure

```
apps/web/
  api/
    kits/
      route.ts                    // POST /api/kits -> {kitId}
  app/api/kits/[kitId]/
    source/route.ts               // POST /api/kits/:kitId/source
    tailor/route.ts               // POST /api/kits/:kitId/tailor
    downloads/route.ts            // GET  /api/kits/:kitId/downloads
  lib/ai/
    schemas.ts                    // Zod schemas
    provider.ts                   // model call + JSON extraction + retries
  lib/extract/
    gdoc.ts                       // export Google Doc to DOCX
    docx.ts                       // parse DOCX -> IR (mammoth + mapper)
  lib/ir/
    types.ts                      // ResumeIR, TailoringPlan TS types
    apply.ts                      // apply TailoringPlan to IR
  lib/render/
    resumeDocx.ts                 // IR -> resume_tailored.docx (using docx)
    coverDocx.ts                  // IR + plan -> cover_letter.docx
    atsDocx.ts                    // IR + plan -> ats_report.docx
    convert.ts                    // DOCX -> PDF with LibreOffice
  server/
    pipeline.ts                   // runTailorPipeline()
  lib/fs/
    storage.ts                    // helpers for /storage/kits/<kitId> paths
```

### Data Flow

1. **Upload**: Client uploads DOCX file or provides Google Doc ID
2. **Extraction**: Server parses DOCX to IR using mammoth
3. **Tailoring**: LLM generates TailoringPlan based on IR and job description
4. **Application**: TailoringPlan is applied to IR
5. **Rendering**: DOCX files are generated from the tailored IR
6. **Conversion**: DOCX files are converted to PDF using LibreOffice (if available)
7. **Delivery**: Client downloads PDF files (or DOCX if LibreOffice is unavailable)

## API Endpoints

### Create Kit
```
POST /api/kits
Response: { success: true, data: { kitId: string } }
```

### Upload Source Document
```
POST /api/kits/:kitId/source
Body: FormData with file field (DOCX) or { type: 'gdoc', fileId: string }
Response: { success: true, data: { kind: string, filename?: string } }
```

### Tailor Resume
```
POST /api/kits/:kitId/tailor
Body: { jobDescription: string, company?: string, provider?: string, model?: string }
Response: { success: true, data: { files: { resume: { docx, pdf }, coverLetter: { docx, pdf }, atsReport: { docx, pdf } }, libreOfficeInstalled: boolean } }
```

### Download Files
```
GET /api/kits/:kitId/downloads?file=filename
Response: File content with appropriate Content-Type header

GET /api/kits/:kitId/downloads
Response: { success: true, data: { files: { [filename]: boolean } } }
```

## Dependencies

- `mammoth`: DOCX to HTML conversion
- `docx`: DOCX generation
- `zod`: Schema validation
- `googleapis`: Google Drive API for Google Docs export
- `jsdom`: HTML parsing
- `json5`: Flexible JSON parsing for LLM responses

## LibreOffice Integration

The pipeline uses LibreOffice for high-quality PDF conversion. If LibreOffice is not installed, the pipeline falls back to providing DOCX files only. The client is informed about the availability of LibreOffice through the `libreOfficeInstalled` flag in the tailor response.

## Future Improvements

1. **Enhanced IR Mapping**: Improve the parsing of DOCX to IR for better structure detection
2. **Style Preservation**: Capture and preserve more formatting from the original document
3. **Google Docs Integration**: Complete the OAuth flow for Google Docs integration
4. **ATS Scoring**: Implement more sophisticated ATS scoring algorithms
5. **UI Updates**: Update the UI to support DOCX upload and Google Docs selection
