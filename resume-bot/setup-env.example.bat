@echo off
REM Example only — do NOT commit real secrets. Copy to setup-env.local.bat and fill in locally.
echo Setting up environment variables...

(
echo # Google Web OAuth
echo GOOGLE_CLIENT_ID=__REPLACE_ME__
echo GOOGLE_CLIENT_SECRET=__REPLACE_ME__
echo GOOGLE_REDIRECT_URI=http://localhost:8787/oauth/google/callback
echo.
echo # Database
echo DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
echo.
echo # JWT
echo JWT_SECRET=__REPLACE_ME__
echo.
echo # API Keys
echo OPENROUTER_API_KEY=__REPLACE_ME__
echo OPENAI_API_KEY=__REPLACE_ME__
echo ANTHROPIC_API_KEY=__REPLACE_ME__
echo.
echo # Admin
echo ADMIN_EMAILS=admin@example.com
echo.
echo # Port
echo PORT=8787
) > apps\server\.env

(
echo NEXT_PUBLIC_API_URL=http://localhost:8787
echo NEXT_PUBLIC_OPENROUTER_API_KEY=__REPLACE_ME__
) > apps\web\.env.local

echo Environment files created successfully!

