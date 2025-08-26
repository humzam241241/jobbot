# Environment Configuration (Local Only)

Follow these rules to keep secrets secure:
- Never print or commit secrets to git or logs
- Store real values only in `.env.local` (git-ignored)
- Ensure `.env`, `.env.local`, and `*.env` files are never pushed

## Required variables
Create `apps/web/.env.local` with the following keys and placeholder values:

```
# App URLs
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# NextAuth
NEXTAUTH_SECRET=replace-with-strong-random-string

# Google OAuth (same GCP project as API key)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Google API Keys
# Browser API key used by Google Picker on the client
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-browser-api-key
# Optional GCP project number for Picker setAppId
NEXT_PUBLIC_GOOGLE_APP_ID=your-gcp-project-number
# Optional server-side Google key (e.g., for Gemini)
GOOGLE_API_KEY=your-google-server-api-key

# AI Providers (optional)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENROUTER_API_KEY=your-openrouter-api-key

# Database
DATABASE_URL=your-database-connection-url

# Redis / Upstash (optional)
REDIS_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_URL=your-upstash-redis-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token

# Sentry (optional)
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project

# Admins (optional, comma-separated)
ADMIN_EMAILS=
```

## Notes
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are used by NextAuth.
- `NEXT_PUBLIC_GOOGLE_API_KEY` is the browser key used by the Google Drive Picker.
- If you change any env values, restart the dev server.
- Real values must stay local and out of git.

## Verification
- `.gitignore` already excludes `.env`, `.env.local`, `*.env`, and `.env*.local`.
- After creating `.env.local`, run the app with your usual script.
