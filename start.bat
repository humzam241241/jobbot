@echo off
setlocal enabledelayedexpansion
echo ========================================
echo   JobBot Resume Generator - Startup
echo ========================================
echo.

REM Ensure we're at the repo root
cd /d C:\Users\humza\resume_bot

REM Kill any existing Node processes to avoid port conflicts
echo Cleaning up any existing processes...
taskkill /F /IM node.exe >NUL 2>&1

REM --- Optional: Quick Git commit & push ---
echo Checking for Git changes...
git rev-parse --is-inside-work-tree >NUL 2>&1
if not errorlevel 1 (
    git remote get-url origin >NUL 2>&1
    if errorlevel 1 (
        echo [!] No git remote configured. Skipping push.
        echo     To set: git remote add origin YOUR_REPO_URL
    ) else (
        git add -A >NUL 2>&1
        git diff --staged --quiet
        if errorlevel 1 (
            echo [+] Committing and pushing changes...
            git commit -m "chore: auto-save %DATE% %TIME%" >NUL 2>&1
            git push -u origin HEAD 2>NUL
            if errorlevel 1 (
                echo [!] Push failed - continuing anyway
            ) else (
                echo [✓] Changes pushed to GitHub
            )
        ) else (
            echo [✓] No changes to commit
        )
    )
)

REM Ensure pnpm is available
echo Checking package manager...
where pnpm >NUL 2>&1
if errorlevel 1 (
    echo [+] Installing pnpm...
    call npm install -g pnpm@9.7.0
    if errorlevel 1 (
        echo [!] Failed to install pnpm - trying to continue anyway
    )
)

REM Install dependencies
echo Installing dependencies...
if not exist node_modules (
    call pnpm install
    if errorlevel 1 (
        echo [!] Failed to install dependencies - trying to continue anyway
    )
) else (
    echo [✓] Dependencies already installed
)

REM Create test data directory if missing
if not exist apps\web\test\data (
    echo [+] Creating test data directory...
    mkdir apps\web\test\data
    echo [✓] Test data directory created
)

REM Copy sample PDF if missing
if not exist apps\web\test\data\05-versions-space.pdf (
    echo [+] Creating sample test PDF...
    if exist apps\web\public\downloads\sample-resume.pdf (
        copy apps\web\public\downloads\sample-resume.pdf apps\web\test\data\05-versions-space.pdf >NUL
        echo [✓] Sample PDF copied
    ) else (
        echo [!] Sample PDF not found - creating empty file
        echo "Sample PDF" > apps\web\test\data\05-versions-space.pdf
    )
)

REM Generate Prisma client
echo Generating Prisma client...
cd apps\web
call pnpm prisma generate
if errorlevel 1 (
    echo [!] Prisma generation failed - trying with npx...
    call npx prisma generate
    if errorlevel 1 (
        echo [!] Prisma generation failed - continuing anyway
    )
) else (
    echo [✓] Prisma client generated
)

REM Initialize database if needed
if not exist prisma\dev.db (
    echo [+] Initializing database...
    call pnpm prisma migrate deploy
    if errorlevel 1 (
        echo [!] Database initialization failed - continuing anyway
    ) else (
        echo [✓] Database initialized
    )
)

REM Return to root
cd /d C:\Users\humza\resume_bot

REM Create debug directory
if not exist debug (
    mkdir debug
)

REM Start the development server
echo.
echo ========================================
echo   Starting server at http://localhost:3000
echo   Press Ctrl+C to stop
echo ========================================
echo.

REM Start in current window for better error visibility
call pnpm --filter @app/web dev

endlocal