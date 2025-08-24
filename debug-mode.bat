@echo off
echo Setting up JobBot in debug mode...
echo.

REM Set environment variables
set ALWAYS_SHOW_SIGNIN=1
set DEBUG_MODE=true
set SKIP_DB=1

REM Clear browser session data
echo Clearing browser session data...
taskkill /F /IM chrome.exe /T >nul 2>&1
taskkill /F /IM msedge.exe /T >nul 2>&1
taskkill /F /IM firefox.exe /T >nul 2>&1

REM Kill any running Node processes
echo Cleaning up Node processes...
taskkill /F /IM node.exe >nul 2>&1

REM Clean Next.js cache
echo Cleaning Next.js cache...
if exist "apps\web\.next" (
  rmdir /s /q "apps\web\.next"
)

REM Install dependencies if needed
echo Checking dependencies...
if not exist "node_modules" (
  echo Installing dependencies...
  call pnpm install
)

REM Start the application
echo Starting JobBot...
echo.
echo ====================================
echo JobBot Debug Mode
echo ====================================
echo.
echo Navigate to http://localhost:3000
echo You will be redirected to the login page
echo Default credits: 30
echo Debug logging: Enabled
echo.

cd apps/web && pnpm dev -p 3000