@echo off
SETLOCAL ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION
title JobBot Setup and Start

echo.
echo Setting up JobBot...
echo ===================
echo.

REM Detect package manager
where pnpm >nul 2>nul
if !ERRORLEVEL! EQU 0 (
    set PM=pnpm
) else (
    echo Installing pnpm...
    call npm install -g pnpm
    if !ERRORLEVEL! EQU 0 (
        set PM=pnpm
    ) else (
        echo Failed to install pnpm, using npm...
        set PM=npm
    )
)

REM Create environment files
echo Creating environment files...
if not exist "apps\web\.env.local" (
    echo # JobBot Environment Variables > "apps\web\.env.local"
    echo. >> "apps\web\.env.local"
    echo # Database >> "apps\web\.env.local"
    echo DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobbot >> "apps\web\.env.local"
    echo. >> "apps\web\.env.local"
    echo # Authentication >> "apps\web\.env.local"
    echo NEXTAUTH_URL=http://localhost:3000 >> "apps\web\.env.local"
    echo NEXTAUTH_SECRET=jobbot-secret-key >> "apps\web\.env.local"
    echo. >> "apps\web\.env.local"
    echo # AI Providers >> "apps\web\.env.local"
    echo # Add your API keys below: >> "apps\web\.env.local"
    echo # OPENAI_API_KEY=your-key-here >> "apps\web\.env.local"
    echo # ANTHROPIC_API_KEY=your-key-here >> "apps\web\.env.local"
    echo # GOOGLE_API_KEY=your-key-here >> "apps\web\.env.local"
)

REM Create Prisma .env
echo DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobbot > "apps\web\.env"

REM Fix Prisma schema
if exist "apps\web\prisma\schema.prisma" (
    powershell -Command "(Get-Content 'apps\web\prisma\schema.prisma') -replace 'provider = \"postgresql\"', 'provider = \"postgres\"' | Set-Content 'apps\web\prisma\schema.prisma'"
)

REM Kill any process using port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)

REM Clear auth cookies from browser
echo Clearing authentication cookies...
powershell -Command "Start-Process 'chrome' -ArgumentList '--user-data-dir=\"%LOCALAPPDATA%\Google\Chrome\User Data\"', '--profile-directory=Default', '-incognito', 'about:blank' -PassThru | ForEach-Object { Start-Sleep -Seconds 1; $_.Kill() }"

REM Install dependencies
echo Installing dependencies...
call %PM% install
if !ERRORLEVEL! NEQ 0 (
    echo Failed to install dependencies.
    pause
    exit /b 1
)

REM Generate Prisma client
echo Generating Prisma client...
cd apps\web
call %PM% exec prisma generate
if !ERRORLEVEL! NEQ 0 (
    echo Trying with npx...
    call npx prisma generate --schema=.\prisma\schema.prisma
)

REM Run Prisma migrations
echo Running database migrations...
call %PM% exec prisma migrate deploy
if !ERRORLEVEL! NEQ 0 (
    echo Trying with npx...
    call npx prisma migrate deploy --schema=.\prisma\schema.prisma
)

REM Set environment variables
set "NEXT_TELEMETRY_DISABLED=1"
set "NODE_OPTIONS=--max-old-space-size=4096"
set "FORCE_LOGOUT=1"

echo.
echo Starting development server...
echo ===========================
echo.

REM Start browser after a delay to the login page
start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000/login"

REM Start development server
call %PM% run dev

cd ..\..
pause