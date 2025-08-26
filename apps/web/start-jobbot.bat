@echo off
setlocal

set PORT=3000
set NEXTAUTH_URL=http://localhost:%PORT%

echo Starting JobBot (apps/web) on %NEXTAUTH_URL%

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT% ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

pnpm dev -p %PORT%

endlocal

