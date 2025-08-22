@echo off
echo JobBot Dependencies Update
echo ========================

REM Check for outdated dependencies
echo Checking for outdated dependencies...
call pnpm outdated

REM Prompt to update dependencies
set /p UPDATE_DEPS="Do you want to update dependencies? (y/n): "
if /i "%UPDATE_DEPS%"=="y" (
  echo Updating dependencies...
  call pnpm update -r
)

REM Install Google Generative AI SDK
echo Installing Google Generative AI SDK...
call pnpm add -w @google/generative-ai

REM Check for TypeScript errors
echo Checking for TypeScript errors...
call pnpm -w run typecheck

echo Dependencies update complete!
echo.
echo Run jobbot-setup.bat to set up the application.

pause
