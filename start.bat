@echo off
echo Starting JobBot Application...
echo.

REM Make sure we're in the correct directory
cd /d C:\Users\humza\resume_bot

REM Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    pnpm install
)

REM Start the development server
echo Starting development server...
echo Open http://localhost:3000 in your browser
echo.
echo Press Ctrl+C to stop the server
echo.

pnpm dev
