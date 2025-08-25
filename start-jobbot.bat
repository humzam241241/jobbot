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