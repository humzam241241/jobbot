# JobBot - AI-Powered Resume Tailoring

JobBot is a full-stack application that helps job seekers optimize their resumes and cover letters for specific job postings using AI. The application analyzes both the user's resume and the target job description to create tailored, ATS-optimized documents.

## Features

- **Resume Tailoring**: Upload your resume and job description to generate a tailored, ATS-optimized resume
- **Cover Letter Generation**: Automatically create personalized cover letters based on your resume and job description
- **Multiple AI Providers**: Support for OpenAI, Anthropic, and Google AI models
- **Format Preservation**: Maintains your original resume structure and formatting
- **Usage Tracking**: Monitor your token usage and generation counts

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes, Zod for validation
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: Multiple provider adapters (OpenAI, Anthropic, Google)

## Getting Started

### Prerequisites

- Node.js v18 or later
- PNPM package manager
- PostgreSQL database

### All-in-One Setup Menu

For the easiest experience, run the all-in-one menu:
```bash
jobbot-all-in-one.bat
```

This interactive menu provides access to all setup and maintenance options:
1. Quick Setup and Start
2. Fix Database Connection
3. Clean Repository
4. Update Dependencies
5. Start JobBot

### Individual Scripts

You can also run individual scripts directly:

- **jobbot-setup.bat** - Complete setup (environment, dependencies, database)
- **fix-database.bat** - Fixes database connection issues
- **cleanup-repo.bat** - Cleans up redundant files and caches
- **update-deps.bat** - Updates dependencies to their latest versions
- **start-jobbot.bat** - Starts the application without setup

### Manual Setup

1. Create a `.env.local` file in `apps/web/` with:
   ```
   DATABASE_URL="postgres://postgres:postgres@localhost:5432/jobbot"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   OPENAI_API_KEY="your-openai-key"
   ANTHROPIC_API_KEY="your-anthropic-key"
   GOOGLE_API_KEY="your-google-key"
   ```

2. Install dependencies:
   ```bash
   pnpm install
   pnpm add -w @google/generative-ai
   ```

3. Run database migrations:
   ```bash
   cd apps/web
   npx prisma generate
   npx prisma migrate dev --name add_usage_tracking
   cd ../..
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:
1. Run the `fix-database.bat` script to repair the connection
2. Check that PostgreSQL is running on port 5432
3. Verify your DATABASE_URL is correct in both `.env` and `.env.local` files:
   ```
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobbot
   ```
   Note: Use `postgres://` protocol, not `postgresql://`
4. Create the database manually if needed:
   ```bash
   psql -U postgres -c "CREATE DATABASE jobbot;"
   ```
5. Try running the migrations manually:
   ```bash
   cd apps/web
   npx prisma generate
   npx prisma migrate dev --name add_usage_tracking
   ```

### API Provider Issues

If AI providers aren't working:
1. Check that your API keys are correctly set in .env.local
2. Verify the API keys are valid and have sufficient credits
3. Check the server logs for specific error messages
4. Try using a different provider (OpenAI, Anthropic, or Google)

### TypeScript/Dependency Issues

If you encounter TypeScript errors or dependency issues:
1. Run the `update-deps.bat` script to update dependencies
2. Check for TypeScript errors with `pnpm -w run typecheck`
3. Clean node_modules cache with `pnpm -w run clean`
4. Reinstall dependencies with `pnpm install`

### Application Not Loading

If the application doesn't load:
1. Check the terminal output for errors
2. Verify that all required environment variables are set
3. Run the `cleanup-repo.bat` script to clean up any redundant files
4. Restart the development server with `pnpm dev`

## Usage

1. Navigate to the JobBot page
2. Upload your resume (PDF or DOCX)
3. Paste the job description
4. Select your preferred AI provider (or use Auto)
5. Click "Generate Resume Kit"
6. Download the tailored resume and cover letter

## Key Features

### Google Provider Integration
- Support for latest Gemini models (2.5 Pro, 2.5 Flash)
- Fallback mechanisms for different model capabilities
- Robust error handling and provider switching
- Token usage estimation when exact counts unavailable

### JSON Parsing and Validation
- Extracts valid JSON from model responses
- Handles malformed responses gracefully
- Validates against Zod schemas
- Provides detailed error messages for debugging

### Usage Tracking
- Counts tokens per provider and generation
- Records successful and failed generations
- Displays usage information in the UI
- Supports transaction-based database operations