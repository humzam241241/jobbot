# Resume SaaS Starter (Mobile + API)

This is a **production-minded prototype** for your cross-platform app:
- **Mobile**: Expo (iOS & Android) for file upload and job URL input
- **API Server**: Node + Express (TypeScript). Parses resumes (.pdf, .docx, .txt), fetches job description from a URL, calls a **low-cost/free AI** (DeepSeek/OpenRouter/HuggingFace), and returns **1-page optimized Resume + Cover Letter** as downloadable PDFs.

> Designed to slot into a broader master SaaS. Uses a clean provider pattern for AI and statically serves generated PDFs.

---

## Prereqs (install these)
- **Node.js 20+**
- **pnpm** (`npm i -g pnpm`)
- **Expo** (for mobile): `npm i -g expo` (or use `npx expo`)
- For iOS: Xcode (on macOS) or the **Expo Go** app on your iPhone
- For Android: Android Studio emulator or the **Expo Go** app on Android

> No native deps like Poppler/Tesseract required. PDF text extraction uses `pdf-parse` (pure JS).

---

## Quickstart

```bash
pnpm install

# 1) Start API
cp apps/server/.env.example apps/server/.env
pnpm dev:server

# 2) Start Mobile
# In a new terminal
pnpm dev:mobile
```

- Open the Expo devtools QR code with **Expo Go** to run the app on your device.
- The mobile app expects `EXPO_PUBLIC_API_URL` to point at the server (defaults to `http://localhost:8787`).

---

## Folder Structure

```
apps/
  server/        <-- Express API (TypeScript)
    public/outputs/   <-- Generated PDFs are served from here
  mobile/        <-- Expo React Native client (TypeScript)

packages/
  shared/        <-- Shared types/utilities (future expansion)
```

---

## Environment Variables

### `apps/server/.env`
```
PORT=8787
# CORS (comma-separated list). e.g., http://localhost:8081 for Expo
ALLOWED_ORIGINS=http://localhost:19006,http://localhost:8081

# AI Provider: deepseek | openrouter | hf
AI_PROVIDER=deepseek

# For DeepSeek:
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
AI_API_KEY=YOUR_DEEPSEEK_API_KEY

# Or OpenRouter (optionally supports free R1 in some regions/providers):
# AI_PROVIDER=openrouter
# AI_BASE_URL=https://openrouter.ai/api/v1
# AI_MODEL=deepseek/deepseek-r1
# AI_API_KEY=YOUR_OPENROUTER_KEY

# Or Hugging Face Inference (text-generation):
# AI_PROVIDER=hf
# AI_BASE_URL=https://api-inference.huggingface.co/models
# AI_MODEL=Qwen/Qwen2.5-14B-Instruct
# AI_API_KEY=YOUR_HF_TOKEN
```

> You can switch providers without changing app code.

---

## What it does (today)
1. **Uploads** your resume file (`.pdf`, `.docx`, `.txt`) + a **job posting URL**
2. **Extracts** clean text from both sources
3. **Prompts** the AI to produce:
   - A **1-page, ATS-optimized resume**
   - A **1-page cover letter**
4. **Generates PDFs** and exposes **download links**

**Roadmap ideas:**
- Account system (JWT), Stripe, Postgres (Prisma), storage (S3/Supabase)
- Versioning & analytics (keyword coverage, verb usage, metrics enrichment)
- Batch mode for auto-applications

---

## Deploy notes
- You can deploy the **API** on Railway/Render/Fly/EC2/etc. (needs persistent disk for outputs or swap to S3).
- Put the **Mobile** app on TestFlight / Play Console via EAS later. For now, Expo Go is perfect for testing.
