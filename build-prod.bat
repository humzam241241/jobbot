@echo off
echo Setting up JobBot production build...
echo.

REM Kill any running Node processes
echo Cleaning up Node processes...
taskkill /F /IM node.exe >nul 2>&1

REM Clean install
echo Cleaning installation...
if exist "node_modules" (
  rmdir /s /q "node_modules"
)
if exist "apps\web\node_modules" (
  rmdir /s /q "apps\web\node_modules"
)
if exist "apps\web\.next" (
  rmdir /s /q "apps\web\.next"
)
if exist "pnpm-lock.yaml" (
  del /f /q "pnpm-lock.yaml"
)

REM Install dependencies
echo Installing dependencies...
call pnpm install

REM Generate Prisma client
echo Generating Prisma client...
cd apps\web
call pnpm exec prisma generate
cd ..\..

REM Build the app
echo Building production bundle...
call pnpm -C apps\web build

echo.
if %ERRORLEVEL% EQU 0 (
  echo ✅ Production build completed successfully!
  echo Run 'pnpm -C apps\web start' to start production server on port 3000
) else (
  echo ❌ Build failed with error code %ERRORLEVEL%
)
