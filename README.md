# Resume Bot

A web application that helps users generate tailored resumes, cover letters, and ATS reports based on their existing resume and job descriptions.

## Features

- Upload Microsoft Word (DOCX) documents directly or select from Google Drive
- Convert Google Docs to DOCX format automatically
- Generate tailored resumes that preserve original formatting
- Create professional cover letters
- Generate ATS compatibility reports
- Support for multiple AI providers (OpenAI, Google, Anthropic, DeepSeek, Mistral)

## Setup Instructions

### Prerequisites

- Node.js 18+ and pnpm
- LibreOffice (for PDF conversion)
- Google Cloud account with API credentials (for Google Drive integration)

### Environment Setup

1. Copy the example environment file:
   ```
   cp .env.example .env.local
   ```

2. Fill in your environment variables in `.env.local`:
   - Generate a `NEXTAUTH_SECRET` (you can use `openssl rand -base64 32`)
   - Set up Google OAuth credentials in Google Cloud Console
   - Add API keys for AI providers you plan to use

### Google Cloud Setup

1. Create a project in Google Cloud Console
2. Enable the following APIs:
   - Google Drive API
   - Google Picker API
   - Google Identity Services

3. Create OAuth 2.0 credentials:
   - Set authorized JavaScript origins to `http://localhost:3000`
   - Set authorized redirect URIs to `http://localhost:3000/api/auth/callback/google`

4. Create an API key with restrictions:
   - Set application restrictions to "Website"
   - Add `http://localhost:3000/*` to the allowed referrers
   - Restrict the API key to only the required APIs

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm -C apps/web prisma generate

# Start development server
pnpm -C apps/web dev
```

### Using the Batch File (Windows)

For Windows users, a batch file is provided for easy startup:

```bash
start-jobbot.bat
```

## Development

### Project Structure

- `apps/web/` - Next.js web application
  - `app/` - App router components and API routes
  - `components/` - React components
  - `lib/` - Utility functions and business logic
  - `prisma/` - Database schema and migrations
  - `contexts/` - React context providers

### Key Technologies

- Next.js 14 with App Router
- NextAuth.js for authentication
- Prisma ORM for database access
- Tailwind CSS for styling
- Various AI providers for content generation
- Google Drive API for document access
- LibreOffice for document conversion

## Deployment

For production deployment, ensure you have:

1. Set up proper environment variables
2. Verified your Google Cloud OAuth application (for production use)
3. Installed LibreOffice on your production server
4. Set up a PostgreSQL database

## License

[MIT License](LICENSE)