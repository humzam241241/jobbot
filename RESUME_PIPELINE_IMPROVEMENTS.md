# Resume Pipeline Improvements

## Overview

This document outlines the improvements made to the resume generation pipeline to enhance reliability, error handling, and user experience.

## Key Improvements

### 1. Environment Validation (`apps/web/lib/env.ts`)
- Added structured validation of API keys for OpenAI, Anthropic, and Gemini
- Implemented boolean flags for provider availability: `hasOpenAI`, `hasAnthropic`, `hasGemini`
- Added development-mode logging of available providers at server boot

### 2. Provider Router (`apps/web/lib/llm/providers.ts`)
- Created a central provider router to handle AI model selection
- Implemented automatic fallback logic when requested providers are unavailable
- Added typed interfaces for provider requests and responses
- Ensured graceful degradation when API keys are missing

### 3. JSON-Strict Wrappers (`apps/web/lib/llm/json.ts`)
- Enhanced JSON parsing with multiple fallback strategies
- Added provider-specific handling for OpenAI, Anthropic, and Gemini
- Implemented retry logic with exponential backoff for transient errors
- Created robust JSON extraction from LLM responses with markdown and prose
- Added specific handling for each provider's JSON capabilities:
  - OpenAI: `response_format: { type: 'json_object' }`
  - Anthropic: Tool-based JSON schema for Claude 3.5+, response_format for Claude 3
  - Gemini: responseMimeType and responseSchema for Gemini 2.5

### 4. Resume Tailoring (`apps/web/lib/generators/tailorResume.ts`)
- Updated to use the central provider router
- Added automatic retry with alternative providers on failure
- Enhanced error handling with typed errors
- Improved validation of LLM responses
- Preserved original resume structure and formatting

### 5. Cover Letter Generation (`apps/web/lib/generators/tailorCoverLetter.ts`)
- Created industry-agnostic cover letter generation
- References both the original profile and tailored resume
- Adapts to any industry without hardcoded placeholders
- Includes fallback mechanisms for provider failures

### 6. API Route Robustness (`apps/web/app/api/resume/generate/route.ts`)
- Added comprehensive error handling with typed responses
- Implemented atomic file operations for PDF/DOCX generation
- Ensured directory creation before file writes
- Added structured error responses with helpful user messages
- Enhanced logging with trace IDs

### 7. UI Components
- Created a reusable `ModelSelector` component with provider availability checks
- Added `Toast` component for non-blocking notifications
- Implemented `ErrorCard` for detailed error display with actionable buttons
- Added tooltips for unavailable providers

### 8. Enhanced Logging (`apps/web/lib/utils/devLogger.ts`)
- Created structured logging with scopes
- Added specialized logging for LLM responses
- Implemented development-only verbose logging

### 9. Tests
- Added unit tests for JSON extraction (`apps/web/tests/json-extractor.test.ts`)
- Added tests for provider router fallback logic (`apps/web/tests/provider-router.test.ts`)

## Usage

### Provider Selection

The system now automatically selects the best available provider based on:
1. User preference (if specified and available)
2. API key availability
3. Default preference order: OpenAI → Anthropic → Gemini

If a user explicitly selects a provider that isn't configured, the system will:
1. Log a warning
2. Fall back to the first available provider
3. Continue processing without errors

### Error Handling

Errors are now categorized and handled appropriately:
- **Resume tailoring errors**: Return 422 status with provider details
- **Cover letter errors**: Return 422 status with provider information
- **PDF generation errors**: Return 500 status with details
- **API errors**: Return appropriate status codes with helpful messages

### UI Feedback

The UI now provides:
- Clear feedback when providers are unavailable
- Detailed error messages with actionable buttons
- Option to switch providers when errors occur
- Toast notifications for important events

## Acceptance Criteria Status

✅ Resume PDF preserves original formatting/section order; only text is updated per JD.

✅ Cover letter references BOTH the parsed resume and the tailored resume; adapts to any industry.

✅ If selected provider lacks API key, fallback occurs automatically (with dev log), no crash.

✅ Strict JSON enforced across providers; on parse failure, return 422 with preview—no garbage placeholders.

✅ Output directory auto-created; atomic writes prevent ENOENT and half-written files.

✅ UI surfaces errors; does not display generic or wrong content.

## Manual Testing

To test the implementation, you can use the following payload with the `/api/resume/generate` endpoint:

```json
{
  "requested": { "provider": "gemini", "model": "gemini-2.5-pro" },
  "masterResume": {
    "summary": "Experienced software developer with expertise in web technologies.",
    "skills": ["JavaScript", "TypeScript", "React", "Node.js"],
    "experience": [
      { 
        "company": "Tech Company", 
        "role": "Senior Developer", 
        "start": "2020", 
        "end": "Present", 
        "bullets": ["Led team of 5 developers", "Implemented CI/CD pipeline"] 
      }
    ],
    "education": [
      { 
        "school": "University", 
        "degree": "BS Computer Science", 
        "dates": "2015-2019", 
        "details": ["GPA: 3.8"] 
      }
    ],
    "projects": [
      { 
        "name": "Personal Website", 
        "bullets": ["Built with React and Next.js", "Deployed on Vercel"] 
      }
    ]
  },
  "applicantProfile": { 
    "name": "Jane Doe", 
    "email": "jane@example.com", 
    "location": "San Francisco, CA" 
  },
  "jobDescription": "We are looking for a Senior Frontend Developer with experience in React, TypeScript, and modern web technologies. The ideal candidate will have experience leading teams and implementing CI/CD pipelines."
}
```

This should generate both a resume PDF and cover letter PDF, with proper error handling if any step fails.