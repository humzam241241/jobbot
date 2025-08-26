@echo off
setlocal ENABLEDELAYEDEXPANSION

set PORT=3000
set SKIP_DB=1
set NEXTAUTH_URL=http://localhost:%PORT%

echo.
echo Starting JobBot on %NEXTAUTH_URL% (port %PORT%)
echo Attempting to free port %PORT% if in use...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT% ^| findstr LISTENING') do (
  echo Killing process PID %%a using port %PORT%...
  taskkill /PID %%a /F >nul 2>&1
)

echo.
echo Launching dev server in a new window...
start "JobBot Dev" cmd /c pnpm -C apps/web dev -p %PORT%

echo Waiting for server to start...
timeout /t 4 /nobreak >nul

echo Opening browser: http://localhost:%PORT%
start "" http://localhost:%PORT%

echo.
echo Server running. Close the other window to stop, or press any key here to exit.
pause >nul

endlocal
@echo off
echo Starting JobBot...
echo =================

rem Clean Next.js cache to avoid stale builds
echo Cleaning Next.js cache...
if exist apps\web\.next (
  rmdir /s /q apps\web\.next
)

rem Install dependencies for the web app
echo Installing web app dependencies...
cd apps\web
call pnpm install
if %errorlevel% neq 0 (
  echo Failed to install web app dependencies!
  exit /b %errorlevel%
)

rem Generate Prisma client
echo Generating Prisma client...
call pnpm prisma generate
if %errorlevel% neq 0 (
  echo Failed to generate Prisma client!
  exit /b %errorlevel%
)

rem Start the development server
echo Starting development server...
echo ===========================
call pnpm dev
if %errorlevel% neq 0 (
  echo Failed to start development server!
  exit /b %errorlevel%
)

cd ..\..