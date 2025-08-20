## Quick start

**Single Port Architecture**: The entire application now runs on `http://localhost:3000`

1. Create `apps/web/.env` with your credentials:
   ```env
   DATABASE_URL=postgresql://your_database_url
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_secret_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   OPENAI_API_KEY=your_openai_key      # Optional
   OPENROUTER_API_KEY=your_openrouter_key  # Optional
   ```
2. Install dependencies: `pnpm install`
3. Run database migrations: `cd apps/web && npx prisma migrate dev`
4. Start the application: `pnpm dev` or `start.bat` (Windows)

Google OAuth callback: `http://localhost:3000/api/auth/callback/google`

All secrets belong in `.env` files and are git-ignored.
# 🤖 Job Bot - AI Resume & Cover Letter Generator

Professional AI-powered tool that generates tailored resumes and cover letters for any job posting.

## ✨ Features

### 🎯 AI-Powered Resume Generation
- **Multi-Provider AI**: Supports OpenAI, Anthropic, Google Gemini, and OpenRouter
- **Smart Fallbacks**: Automatic provider switching if one fails
- **Real Progress Tracking**: 5-step progress bar with detailed status
- **Multiple Input Methods**: Upload PDF/DOCX or paste text directly
- **ATS Optimization**: AI-generated compatibility reports with match scores

### 🔐 Robust Authentication  
- **Google OAuth**: One-click sign-in with Google
- **Email/Password**: Secure credential-based authentication with strong password requirements
- **Role-Based Access**: User and admin roles with appropriate permissions
- **Session Management**: NextAuth.js with JWT tokens

### 📊 Admin Dashboard
- **System Health**: Real-time monitoring of AI providers, database, and services
- **User Management**: View all users, roles, creation dates, and login activity
- **Authentication Logs**: Track sign-ins, sign-outs, and security events
- **Performance Metrics**: Memory usage, uptime, and service availability

### 🛠 Developer Experience
- **Enhanced Health Checks**: `/api/healthz` and `/api/readiness` endpoints
- **Error Handling**: Comprehensive error messages with debug information
- **Job Scraper**: Enhanced web scraping with typo-tolerance and site-specific extraction
- **PDF Generation**: Real PDFs using Playwright with clean HTML rendering
- **Single-Port Architecture**: Everything runs on port 3000 for simplified deployment

## 🚀 Quick Start

### 1. Environment Setup

Create `apps/web/.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# NextAuth Configuration  
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key_here

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI Provider API Keys (Add at least one)
OPENAI_API_KEY=sk-proj-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key  
GOOGLE_API_KEY=your_google_ai_key
GEMINI_API_KEY=your_gemini_key  # Alternative to GOOGLE_API_KEY
OPENROUTER_API_KEY=sk-or-your_openrouter_key

# AI Provider Configuration
LLM_PROVIDER_ORDER=gemini,openai,anthropic  # Order of fallback when using "auto" provider

# Optional model overrides per purpose
MODEL_RESUME=                # e.g., gpt-4o for OpenAI, claude-3-5-sonnet-latest for Anthropic
MODEL_COVER_LETTER=          # e.g., gemini-1.5-pro for Google
MODEL_JD_PARSING=            # e.g., openai/gpt-4o-mini for OpenRouter

# Optional base URLs for self-hosting/proxy
OPENAI_BASE_URL=             # Default: https://api.openai.com/v1
ANTHROPIC_BASE_URL=          # Default: https://api.anthropic.com/v1
OPENROUTER_BASE_URL=         # Default: https://openrouter.ai/api/v1
GOOGLE_GENAI_BASE_URL=       # Default: https://generativelanguage.googleapis.com/v1beta

# Admin Configuration (optional)
ADMIN_EMAILS=admin@example.com
```
## Quick start

**Single Port Architecture**: The entire application now runs on `http://localhost:3000`

1. Create `apps/web/.env` with your credentials:
   ```env
   DATABASE_URL=postgresql://your_database_url
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_secret_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   OPENAI_API_KEY=your_openai_key      # Optional
   OPENROUTER_API_KEY=your_openrouter_key  # Optional
   ```
2. Install dependencies: `pnpm install`
3. Run database migrations: `cd apps/web && npx prisma migrate dev`
4. Start the application: `pnpm dev` or `start.bat` (Windows)

Google OAuth callback: `http://localhost:3000/api/auth/callback/google`

All secrets belong in `.env` files and are git-ignored.
# 🤖 Job Bot - AI Resume & Cover Letter Generator

Professional AI-powered tool that generates tailored resumes and cover letters for any job posting.

## ✨ Features

### 🎯 AI-Powered Resume Generation
- **Multi-Provider AI**: Supports OpenAI, Anthropic, Google Gemini, and OpenRouter
- **Smart Fallbacks**: Automatic provider switching if one fails
- **Real Progress Tracking**: 5-step progress bar with detailed status
- **Multiple Input Methods**: Upload PDF/DOCX or paste text directly
- **ATS Optimization**: AI-generated compatibility reports with match scores

### 🔐 Robust Authentication  
- **Google OAuth**: One-click sign-in with Google
- **Email/Password**: Secure credential-based authentication with strong password requirements
- **Role-Based Access**: User and admin roles with appropriate permissions
- **Session Management**: NextAuth.js with JWT tokens

### 📊 Admin Dashboard
- **System Health**: Real-time monitoring of AI providers, database, and services
- **User Management**: View all users, roles, creation dates, and login activity
- **Authentication Logs**: Track sign-ins, sign-outs, and security events
- **Performance Metrics**: Memory usage, uptime, and service availability

### 🛠 Developer Experience
- **Enhanced Health Checks**: `/api/healthz` and `/api/readiness` endpoints
- **Error Handling**: Comprehensive error messages with debug information
- **Job Scraper**: Enhanced web scraping with typo-tolerance and site-specific extraction
- **PDF Generation**: Real PDFs using Playwright with clean HTML rendering
- **Single-Port Architecture**: Everything runs on port 3000 for simplified deployment

## 🚀 Quick Start

### 1. Environment Setup

Create `apps/web/.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# NextAuth Configuration  
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key_here

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI Provider API Keys (Add at least one)
OPENAI_API_KEY=sk-proj-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key  
GOOGLE_API_KEY=your_google_ai_key
GEMINI_API_KEY=your_gemini_key  # Alternative to GOOGLE_API_KEY
OPENROUTER_API_KEY=sk-or-your_openrouter_key

# AI Provider Configuration
LLM_PROVIDER_ORDER=gemini,openai,anthropic  # Order of fallback when using "auto" provider

# Optional model overrides per purpose
MODEL_RESUME=                # e.g., gpt-4o for OpenAI, claude-3-5-sonnet-latest for Anthropic
MODEL_COVER_LETTER=          # e.g., gemini-1.5-pro for Google
MODEL_JD_PARSING=            # e.g., openai/gpt-4o-mini for OpenRouter

# Optional base URLs for self-hosting/proxy
OPENAI_BASE_URL=             # Default: https://api.openai.com/v1
ANTHROPIC_BASE_URL=          # Default: https://api.anthropic.com/v1
OPENROUTER_BASE_URL=         # Default: https://openrouter.ai/api/v1
GOOGLE_GENAI_BASE_URL=       # Default: https://generativelanguage.googleapis.com/v1beta

# Admin Configuration (optional)
ADMIN_EMAILS=admin@example.com
```

### 2. Google OAuth Setup

In Google Cloud Console:
- **Authorized JavaScript origins**: `http://localhost:3000`
- **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`

### 3. Database Setup

```bash
cd apps/web
npx prisma migrate dev
```

### 4. Start the Application

#### Windows (Easiest)
```bash
# Double-click or run:
start.bat
```

#### Any Platform
```bash
# Install dependencies and start
pnpm install
pnpm dev
```

### Access Points
- **Web App**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Admin Dashboard**: http://localhost:3000/admin (requires admin role)
- **Login Page**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard

## 🔧 Troubleshooting

### Google OAuth Issues
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Verify Google Cloud Console redirect URIs match exactly: `http://localhost:3000/api/auth/callback/google`
- Check `NEXTAUTH_URL=http://localhost:3000` and `NEXTAUTH_SECRET` are set

### Generate Button Issues
**"Missing API Key" Error**: Add at least one AI provider API key to your `.env.local`:
- `OPENAI_API_KEY` - OpenAI GPT models
- `ANTHROPIC_API_KEY` - Claude models  
- `GOOGLE_API_KEY` or `GEMINI_API_KEY` - Gemini models
- `OPENROUTER_API_KEY` - Access to multiple models

**AI Provider Fallback**: The system will automatically try providers in the order specified in `LLM_PROVIDER_ORDER`. Default order is: gemini → openai → anthropic → openrouter.

**Quota Errors**: If you see quota errors, the system will automatically try the next provider in the fallback chain. You'll see which provider and model was used in the status panel after successful generation.

**API Offline**: Check health endpoint at `http://localhost:3000/api/health`

**CORS Errors**: The app runs on a single port (3000), so CORS shouldn't be an issue

### Database Issues
- Ensure `DATABASE_URL` is correctly set
- Run `npx prisma migrate dev` to create/update database schema
- Check database connectivity with your provider

### Development Issues
- Port conflicts: Kill processes on port 3000 with `npx kill-port 3000`
- Clear cache: Delete `node_modules` and run `pnpm install`
- Check logs: The application logs errors to the console

## 🔐 Admin Access

**Admin emails**: `mystrye827@gmail.com`, `humzam241@outlook.com`
- Sign in with Google → Auto-redirected to admin dashboard
- Or use password: `admin123` at `/admin.html`

## 🔧 Configuration

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized JavaScript origins: `http://localhost:3000`
4. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Update `apps/web/.env`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Environment Variables
Create `apps/web/.env` with:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Application URL (http://localhost:3000)
- `NEXTAUTH_SECRET`: Random secret for JWT signing
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: OAuth credentials
- `OPENAI_API_KEY` or `OPENROUTER_API_KEY`: For AI generation

## 📱 Mobile Testing

1. Install "Expo Go" on your phone
2. Scan the QR code shown on the web interface
3. App automatically connects to your local backend

## 🏗️ Architecture

- **Framework**: Next.js 14 (App Router)
- **Authentication**: NextAuth with Google OAuth & Credentials
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT or OpenRouter models
- **File Processing**: PDF/DOCX parsing and generation
- **Styling**: Tailwind CSS
- **Deployment**: Single-port architecture (port 3000)

## 📦 Project Structure

```
├── apps/
│   ├── web/             # Next.js application
│   │   ├── app/         # App router pages & API routes
│   │   ├── components/  # React components
│   │   ├── lib/         # Utility functions
│   │   └── prisma/      # Database schema
│   └── mobile/          # React Native app (unchanged)
├── packages/
│   └── shared/          # Shared utilities
└── start.bat           # Windows launcher
```

## 🔒 Security

- Environment variables stored in `.env` files (gitignored)
- NextAuth for secure authentication
- JWT session tokens
- Password hashing with bcrypt
- Authentication logging for audit trails
- Input validation with Zod schemas

## 🎯 Usage

1. **Sign up** with email or Google
2. **Upload** your resume (PDF/DOCX/TXT)
3. **Paste** job posting URL
4. **Generate** AI-tailored documents
5. **Download** optimized resume and cover letter

## 👑 Admin Features

- View all users and their activity
- Manage subscriptions (add/remove days)
- Delete user accounts
- Real-time analytics dashboard
- User generation history

---

Built with ❤️ using modern web technologies
