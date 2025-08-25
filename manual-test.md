# Manual Testing Guide for Resume Kit Generator

This guide will help you test the enhanced Resume Kit Generator with improved error handling and JSON parsing.

## Prerequisites

1. Make sure the application is running:
   ```bash
   pnpm --filter @app/web dev
   ```

2. Navigate to the Resume Generator page at `/jobbot` or `/dashboard`.

## Test Scenarios

### 1. Happy Path - Normal PDF Resum

**Steps:**
1. Upload a standard text-based PDF resume
2. Enter a job description
3. Select "Auto" or a specific AI model
4. Click "Generate Resume Kit"

**Expected Result:**
- Resume PDF and DOCX are generated
- Cover Letter PDF and DOCX are generated
- ATS Report is generated
- All files are downloadable
- No errors are shown

### 2. Happy Path - DOCX Resume

**Steps:**
1. Upload a DOCX resume
2. Enter a job description
3. Select "Auto" or a specific AI model
4. Click "Generate Resume Kit"

**Expected Result:**
- Same as the PDF test above

### 3. Error Handling - Scanned/Image PDF

**Steps:**
1. Upload a scanned or image-based PDF (no text layer)
2. Enter a job description
3. Click "Generate Resume Kit"

**Expected Result:**
- OCR should attempt to extract text
- If successful, resume kit is generated
- If unsuccessful, a toast notification appears: "We couldn't read this file. Try exporting your resume as a text-based PDF or DOCX."
- User remains on the form page (no modal)

### 4. Error Handling - JSON Parsing Error

**Steps:**
1. Upload a valid PDF resume
2. Enter a job description
3. Select a model known to have issues (if any)
4. Click "Generate Resume Kit"

**Expected Result:**
- If the LLM returns non-JSON, an error card appears with:
  - Error message
  - Provider and model information
  - Option to view raw LLM output
  - "Retry" button
  - "Switch Provider" button (switches between OpenAI and Anthropic)
  - "Use Baseline Resume" button (if available)
- A baseline resume should still be generated and available

### 5. Error Handling - Invalid File Type

**Steps:**
1. Upload a file that is not PDF or DOCX (e.g., JPG, PNG)
2. Enter a job description
3. Click "Generate Resume Kit"

**Expected Result:**
- Error message: "Invalid file type. Please upload a PDF or DOCX file"
- Form validation prevents submission

### 6. Error Handling - File Too Large

**Steps:**
1. Upload a PDF larger than 5MB
2. Enter a job description
3. Click "Generate Resume Kit"

**Expected Result:**
- Error message: "File size exceeds the 5MB limit"
- Form validation prevents submission

## Developer Testing

For developers, additional logging is available in the development environment:

1. Check the browser console for LLM response previews
2. Look for `[DEV:llm:json]` logs showing raw LLM outputs
3. Error responses include detailed information about the provider, model, and error type

## Troubleshooting

If you encounter issues:

1. **Missing PDF/DOCX files**: Check that the `/public/resumes` directory exists and is writable
2. **API errors**: Check server logs for detailed error messages
3. **LLM errors**: Ensure API keys are set in environment variables:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GEMINI_API_KEY`
