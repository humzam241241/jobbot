# JobBot

AI-powered resume and cover letter generator. Upload your resume, paste a job description, and get a tailored resume kit with ATS optimization.

## Live Deployments

- **Web App:** [https://jobbot-xi.vercel.app](https://jobbot-xi.vercel.app)
- **API Server:** [https://jobbot-server.onrender.com](https://jobbot-server.onrender.com)

## Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS, TypeScript
- **Backend:** Express.js, TypeScript
- **Database:** PostgreSQL (Supabase) with Prisma ORM
- **AI:** OpenAI GPT-5, Anthropic Claude, Google Gemini (multi-provider)
- **Auth:** NextAuth.js with Google OAuth
- **Deployment:** Vercel (web) + Render (server)

## Project Structure

```
jobbot/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── server/       # Express API server
│   └── mobile/       # Mobile app
├── packages/         # Shared packages
└── pnpm-workspace.yaml
```

## Features

- Resume parsing (PDF, DOCX, images via OCR)
- AI-powered resume tailoring for specific job descriptions
- Cover letter generation
- ATS score analysis
- Multiple export formats (PDF, DOCX)
- Google Drive integration
- Application tracking
- Multi-provider AI support (OpenAI, Anthropic, Google, OpenRouter)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
pnpm install
```

### Environment Variables

Create `apps/web/.env.local`:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-base64-secret>

GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

DATABASE_URL=postgresql://USER:PASSWORD@HOST/db

OPENAI_API_KEY=<your-openai-key>
```

### Development

```bash
# Start the web app
cd apps/web && pnpm dev

# Start the server
cd apps/server && pnpm dev
```

## Security

- Secrets are scanned with [gitleaks](https://github.com/gitleaks/gitleaks)
- Never commit `.env*` files
- Run `gitleaks detect --redact` before pushing

## License

[MIT](./LICENSE)
