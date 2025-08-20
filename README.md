# JobBot - AI-Powered Resume Tailoring and Job Application Assistant

JobBot is a full-stack application that helps job seekers optimize their resumes and cover letters for specific job postings using AI. The application analyzes both the user's resume and the target job description to create tailored, ATS-optimized documents.

## Features

- **Resume Tailoring**: Upload your resume and job description to generate a tailored, ATS-optimized resume
- **Cover Letter Generation**: Automatically create personalized cover letters based on your resume and job description
- **ATS Compatibility Reports**: Get insights on how well your resume matches the job requirements
- **File Management**: Organize and track your generated documents
- **Job Application Tracking**: Keep track of your job applications
- **Multiple AI Providers**: Support for OpenAI, Anthropic, and Google AI models

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes, Zod for validation
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: PostgreSQL with Prisma ORM
- **PDF Generation**: Playwright for HTML to PDF conversion
- **AI Integration**: Multiple provider adapters (OpenAI, Anthropic, Google)
- **Testing**: Vitest for unit and integration tests

## Prerequisites

- **Node.js**: v18.20.3 or later (check `.nvmrc`)
- **PNPM**: v9.7.0 or later (package manager)
- **PostgreSQL**: For user data and application tracking

## Quickstart

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/resume-bot.git
   cd resume-bot
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```
   
   Edit `apps/web/.env.local` and add your API keys and configuration.

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
resume-bot/
├── apps/
│   ├── web/               # Next.js web application
│   │   ├── app/           # App Router pages
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions and libraries
│   │   └── public/        # Static assets
│   └── mobile/            # React Native mobile app (Expo)
├── packages/              # Shared packages (future expansion)
└── pnpm-workspace.yaml    # PNPM workspace configuration
```

## Environment Variables

The following environment variables are required:

```
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# AI Providers (at least one is required)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key

# Storage (defaults to local)
STORAGE_PROVIDER=local
STORAGE_BASE_URL=http://localhost:3000
```

## Health Check

The application includes a health check endpoint at `/api/health` that returns the status of the application and environment variables (presence only, not values).

## Development Tools

- **Debug Endpoint**: In development mode, you can view recent errors at `/api/debug/last-errors`
- **API Testing**: Use the provided Vitest tests to verify API functionality

## Deployment

The application can be deployed to any platform that supports Next.js applications:

- Vercel (recommended)
- Netlify
- AWS Amplify
- Self-hosted (Node.js server)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.