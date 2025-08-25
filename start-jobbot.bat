@echo off
SETLOCAL ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

echo Starting JobBot...
echo =================
echo.

REM Set environment variables
set "SKIP_DB=1"
set "NODE_ENV=development"
set "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobbot"

REM Clean and install only web dependencies
echo Installing web app dependencies...
cd apps\web

REM Clean build cache and modules
if exist ".next" rd /s /q ".next"
if exist "node_modules" rd /s /q "node_modules"

REM Create storage directories if they don't exist
if not exist "..\..\storage\kits" mkdir "..\..\storage\kits"

REM Install dependencies
echo Installing dependencies...
call pnpm install
if !ERRORLEVEL! NEQ 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting development server...
echo ===========================
echo.

REM Start the app and open browser
start http://localhost:3000/login
call pnpm run dev

pause