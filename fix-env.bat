@echo off
SETLOCAL ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION
title Fix Environment Setup

echo Checking environment setup...
echo.

REM Create .env.local if it doesn't exist
if not exist "apps\web\.env.local" (
    echo Creating .env.local...
    (
        echo # Database
        echo DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobbot
        echo.
        echo # Authentication
        echo NEXTAUTH_URL=http://localhost:3000
        echo NEXTAUTH_SECRET=jobbot-secret-key
        echo.
        echo # AI Providers
        echo # OPENAI_API_KEY=your-key-here
        echo # ANTHROPIC_API_KEY=your-key-here
        echo # GOOGLE_API_KEY=your-key-here
    ) > "apps\web\.env.local"
    echo Created .env.local
) else (
    echo Fixing DATABASE_URL format in .env.local...
    powershell -Command "(Get-Content 'apps\web\.env.local') -replace 'postgresql://', 'postgres://' | Set-Content 'apps\web\.env.local'"
)

REM Create .env for Prisma
echo Creating .env for Prisma...
echo DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobbot > "apps\web\.env"

REM Fix Prisma schema
if exist "apps\web\prisma\schema.prisma" (
    echo Fixing Prisma schema provider...
    powershell -Command "(Get-Content 'apps\web\prisma\schema.prisma') -replace 'provider = \"postgresql\"', 'provider = \"postgres\"' | Set-Content 'apps\web\prisma\schema.prisma'"
)

REM Generate Prisma client
echo Generating Prisma client...
cd apps\web
call pnpm exec prisma generate
if !ERRORLEVEL! NEQ 0 (
    echo Trying with npx...
    call npx prisma generate
)

REM Run migrations
echo Running migrations...
call pnpm exec prisma migrate deploy
if !ERRORLEVEL! NEQ 0 (
    echo Trying with npx...
    call npx prisma migrate deploy
)

cd ..\..
echo.
echo Environment setup complete.
echo Please check apps/web/.env.local and add your API keys.
echo.
