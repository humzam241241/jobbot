@echo off
echo Starting JobBot in Debug Mode...
echo ============================

:: Create logs directory if it doesn't exist
if not exist logs mkdir logs

:: Set development environment variables
set NODE_ENV=development
set NEXT_PUBLIC_DEBUG=true

:: Kill any process using port 3000 (if exists)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000"') do (
    taskkill /F /PID %%a 2>nul
)

:: Start the development server in the background
start /B pnpm dev

:: Wait for the server to start (adjust sleep time if needed)
timeout /t 5 /nobreak

:: Open the debug page in the default browser
start http://localhost:3000/debug

:: Open the logs directory
start logs

:: Show the logs in real-time using PowerShell
powershell -Command "Get-Content -Path '.\logs\error.log' -Wait"
