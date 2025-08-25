# Testing Guide for Resume Kit Generator

This guide will help you test the improved Resume Kit Generator with enhanced JSON parsing, error handling, and the new tabbed UI for model selection.

## Setup

1. Make sure the application is running:
   ```bash
   cd apps/web && pnpm run dev
   ```

2. Navigate to the Resume Generator page at `/jobbot` or the appropriate route in your application.

## Test Scenarios

### 1. Basic Functionality

**Test Steps:**
1. Upload a standard text-based PDF resume
2. Enter a job description
3. Select "Auto (Best Available)" model
4. Click "Generate Resume Kit"

**Expected Result:**
- Resume PDF and DOCX are generated
- Cover Letter PDF and DOCX are generated
- ATS Report is generated
- All files are downloadable
- No errors are shown

### 2. Tabbed UI Navigation

**Test Steps:**
1. Click on "Select by Company" tab
2. Choose different companies (OpenAI, Anthropic, Google)
3. For each company, select different models
4. Click on "Select by Model" tab
5. Browse through the available models

**Expected Result:**
- UI switches between tabs correctly
- Company selection shows available models for that company
- Model selection shows all models grouped by company
- Selected model is highlighted
- Hidden input value updates correctly

### 3. Gemini 2.5 Models

**Test Steps:**
1. Click on "Select by Company" tab
2. Choose "Google" as the company
3. Verify Gemini 2.5 models are available
4. Select "Gemini 2.5 Pro" and generate a resume

**Expected Result:**
- Gemini 2.5 Pro and Gemini 2.5 Flash models are listed
- Selected model is passed correctly to the API
- Resume generation works with Gemini 2.5 models

### 4. JSON Parsing Error Handling

**Test Steps:**
1. Upload a resume PDF
2. Enter a job description
3. Select "Claude 2.1" (which might have JSON formatting issues)
4. Click "Generate Resume Kit"

**Expected Result:**
- If Claude returns non-JSON, the error is caught
- Error card is displayed with details about the error
- "Switch Provider" button is available
- "Retry" button is available
- If a baseline resume was generated, "Use Baseline Resume" button is available

### 5. Error Recovery

**Test Steps:**
1. If you encounter a JSON parsing error, click "Switch Provider"
2. Observe that a different provider is selected
3. The form is automatically submitted with the new provider

**Expected Result:**
- Provider switches from the failing one to an alternative
- New generation attempt starts automatically
- If successful, results are displayed

### 6. Unreadable Resume Handling

**Test Steps:**
1. Upload an image-only PDF or a scanned document
2. Enter a job description
3. Click "Generate Resume Kit"

**Expected Result:**
- OCR is attempted
- If OCR fails, a toast notification appears
- Error message indicates the resume is unreadable
- User remains on the form page (no modal)

## Error Types to Test

1. **UNREADABLE_RESUME**: Use a scanned image PDF with no text layer
2. **TAILOR_JSON_PARSE_FAILED**: Try with models known to have JSON formatting issues
3. **POLISH_JSON_PARSE_FAILED**: Use a complex resume format that might confuse the AI
4. **SCHEMA_VALIDATION_FAILED**: This might occur with less capable models

## Testing Different Models

Test with at least one model from each provider:

- **OpenAI**: GPT-4o, GPT-3.5 Turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 2.1
- **Google**: Gemini 2.5 Pro, Gemini 1.5 Pro

## Debugging Tips

1. Check the browser console for detailed error logs
2. Look for `[DEV:llm:json]` logs showing raw LLM outputs
3. Check the error card for provider/model information and raw preview
4. Use the "View provider output" toggle to see the raw response

## Reporting Issues

If you find any issues during testing, please note:
1. The exact steps to reproduce
2. The model used
3. The error message displayed
4. Any console logs related to the error
5. The trace ID from the error or success response
