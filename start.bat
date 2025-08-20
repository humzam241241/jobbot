@echo off
setlocal
echo Starting JobBot Application...
echo.

REM Ensure we're at the repo root
cd /d C:\Users\humza\resume_bot

REM --- Optional: Quick Git commit & push ---
git rev-parse --is-inside-work-tree >NUL 2>&1
if not errorlevel 1 (
    git remote get-url origin >NUL 2>&1
    if errorlevel 1 (
        echo No git remote configured. Skipping push. To set:
        echo   git remote add origin YOUR_REPO_URL
    ) else (
        echo Committing and pushing any changes...
        git add -A
        git commit -m "chore: quick save" >NUL 2>&1
        git push -u origin HEAD
    )
)

REM Use Node 18 if available
where nvm >NUL 2>&1
if not errorlevel 1 (
    echo Switching to Node 18.20.3 via nvm ^(if installed^)...
    nvm use 18.20.3 >NUL 2>&1
)

REM Ensure pnpm is available (activate via Corepack if missing)
where pnpm >NUL 2>&1
if errorlevel 1 (
    echo pnpm not found. Activating via Corepack...
    corepack enable >NUL 2>&1
    corepack prepare pnpm@9.7.0 --activate
)

REM Install workspace dependencies if missing at root
if not exist node_modules (
    echo Installing workspace dependencies...
    pnpm install
)

echo Starting development server on http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Launch the dev server in a new window so this script can finish
start "JobBot Dev" cmd /c "cd /d C:\Users\humza\resume_bot && pnpm --filter @app/web dev"

REM Optionally open the site in your default browser
start "" http://localhost:3000

endlocal
