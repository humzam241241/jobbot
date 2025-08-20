@echo off
setlocal
REM === One-Port Dev (Next.js + NextAuth) ===
REM App: http://localhost:3000

cd /d "%~dp0"
call pnpm install --filter @app/web
start "JobBot :3000" cmd /k pnpm --filter @app/web dev
timeout /t 1 >nul
start http://localhost:3000
endlocal